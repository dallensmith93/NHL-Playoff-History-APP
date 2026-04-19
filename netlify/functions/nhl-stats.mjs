function rawQueryString(event) {
  if (event.rawQuery) return event.rawQuery;
  const q = event.queryStringParameters;
  if (!q) return '';
  return Object.entries(q)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/**
 * Server-side proxy to statsapi.web.nhl.com — avoids Netlify edge proxy 500s
 * when forwarding to external APIs with long query strings.
 */
export const handler = async (event) => {
  const qs = rawQueryString(event);
  let path = event.path || '';
  const prefix = '/.netlify/functions/nhl-stats';
  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/' || path === '') {
    return { statusCode: 400, body: JSON.stringify({ message: 'Expected path e.g. /schedule' }) };
  }

  const upstream = `https://statsapi.web.nhl.com/api/v1${path}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: 'application/json' },
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      body,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ message: err instanceof Error ? err.message : 'upstream fetch failed' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
