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
 * Proxy to https://api-web.nhle.com — schedule feed used when statsapi.web.nhl.com returns 5xx.
 */
export const handler = async (event) => {
  const qs = rawQueryString(event);
  let path = event.path || '';
  const prefix = '/.netlify/functions/nhle-web';
  if (path.startsWith(prefix)) {
    path = path.slice(prefix.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/' || path === '') {
    return { statusCode: 400, body: JSON.stringify({ message: 'Expected path e.g. /v1/schedule/2026-04-19' }) };
  }

  const upstream = `https://api-web.nhle.com${path}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; NHL-Playoff-History-App/1.0)',
      },
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
