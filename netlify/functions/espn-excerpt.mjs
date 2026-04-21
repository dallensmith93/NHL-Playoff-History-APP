const ALLOW = /^https:\/\/(?:www\.)?espn\.com\//i;

const EXCERPT_HARD_MAX = 480;

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number.parseInt(n, 10);
      return Number.isFinite(c) ? String.fromCodePoint(c) : _;
    })
    .trim();
}

/** Pull og:description or meta description from ESPN article HTML. */
function extractMetaDescription(html) {
  const og =
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i);
  if (og?.[1]) return decodeBasicEntities(og[1]);

  const meta =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  if (meta?.[1]) return decodeBasicEntities(meta[1]);

  return '';
}

function textFromParagraphInner(inner) {
  return decodeBasicEntities(
    inner
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(?:p|div|h\d)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function isBadParagraphText(t) {
  const l = t.toLowerCase();
  if (t.length < 58) return true;
  if (/advertisement|sponsored content|^image:|^video:/i.test(l)) return true;
  if (/^(watch|listen|read more|see all|click here|sign up|subscribe now)/i.test(t)) return true;
  if (/privacy policy|terms of use|children's online|interest-based ads/i.test(l)) return true;
  if (/^what to watch|^how to watch|^where to watch/i.test(l)) return true;
  if (/^follow espn|^download the app/i.test(l)) return true;
  return false;
}

/** Syndicated / SEO lines that are only hook questions — not a real excerpt. */
function isTeaserQuestionOnly(text) {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 52) return true;
  const qs = (t.match(/\?/g) || []).length;
  if (qs >= 2 && t.length < 240) return true;
  if (qs >= 1 && t.length < 110 && /^who |^what |^which |^when |^where |^how /i.test(t)) return true;
  return false;
}

/**
 * Pull the first substantive <p> blocks from the HTML (article body).
 * Acts as a plain-text “summary” when meta description is useless.
 */
function extractArticleSummaryFromBody(html) {
  const slice = html.length > 950_000 ? html.slice(0, 950_000) : html;
  const paras = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(slice)) !== null) {
    const text = textFromParagraphInner(m[1]);
    if (!isBadParagraphText(text)) paras.push(text);
    if (paras.length >= 5) break;
  }
  if (paras.length === 0) return '';

  let combined = paras[0];
  if (combined.length < 130 && paras[1]) combined = `${combined} ${paras[1]}`;

  const sentences = combined.split(/(?<=[.!?])\s+(?=[A-Z"'“(0-9])/).filter(Boolean);
  let out = sentences.slice(0, 2).join(' ').trim() || combined;

  if (out.length > EXCERPT_HARD_MAX) {
    out = out.slice(0, EXCERPT_HARD_MAX - 1).trim();
    const ls = out.lastIndexOf(' ');
    if (ls > EXCERPT_HARD_MAX * 0.5) out = out.slice(0, ls);
    out = `${out}…`;
  }
  return out.trim();
}

function pickExcerpt(meta, html) {
  const body = extractArticleSummaryFromBody(html);
  if (isTeaserQuestionOnly(meta) && body.length >= 70) return body;
  if (!meta && body.length >= 70) return body;
  if (meta && !isTeaserQuestionOnly(meta) && meta.length >= 70) return meta;
  if (body.length >= meta.length + 35 && body.length >= 85) return body;
  return meta || body || '';
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } };
  }

  const url = event.queryStringParameters?.url;
  if (!url || typeof url !== 'string' || !ALLOW.test(url)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Expected espn.com url query param' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; NHL-Playoff-History-App/1.0; +https://github.com/dallensmith93/NHL-Playoff-History-APP)',
      },
    });
    if (!res.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `upstream ${res.status}` }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    const html = await res.text();
    const meta = extractMetaDescription(html);
    const excerpt = pickExcerpt(meta, html);
    return {
      statusCode: 200,
      body: JSON.stringify({ excerpt }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'fetch failed' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
