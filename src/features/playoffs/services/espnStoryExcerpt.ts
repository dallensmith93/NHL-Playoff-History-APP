const EXCERPT_MAX = 320;

const excerptCache = new Map<string, string>();
const excerptFail = new Set<string>();

export function excerptFetchPath(url: string): string {
  const q = encodeURIComponent(url);
  return `/.netlify/functions/espn-excerpt?url=${q}`;
}

export function plainText(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t.includes('<')) return t;
  try {
    const doc = new DOMParser().parseFromString(`<div>${t}</div>`, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? t;
  } catch {
    return t;
  }
}

export function clipTeaser(s: string, maxLen: number): string {
  const t = plainText(s);
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 48 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

/** First one or two sentences from syndicated description — never the headline. */
export function excerptFromRssDescription(description: string): string {
  const plain = plainText(description);
  if (!plain) return '';

  const sentences = plain.split(/(?<=[.!?])\s+(?=[A-Z(0-9"“'(])/).filter(Boolean);
  let out = sentences.slice(0, 2).join(' ').trim();
  if (!out) out = plain;
  return clipTeaser(out, EXCERPT_MAX);
}

function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/** RSS / meta lines that are only hook questions (no real story excerpt). */
export function isTeaserQuestionBlurb(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.length < 52) return true;
  const qs = (t.match(/\?/g) || []).length;
  if (qs >= 2 && t.length < 240) return true;
  if (qs >= 1 && t.length < 115 && /^who |^what |^which |^when |^where |^how /i.test(t)) return true;
  return false;
}

/** When RSS blurb is thin, teaser-only, or basically repeats the headline — fetch server excerpt + body summary. */
export function needsOgEnrichment(title: string, rssExcerpt: string): boolean {
  if (isTeaserQuestionBlurb(rssExcerpt)) return true;
  if (!rssExcerpt || rssExcerpt.length < 52) return true;
  const t = wordSet(title);
  const b = wordSet(rssExcerpt);
  if (t.size === 0) return false;
  let inter = 0;
  for (const w of t) {
    if (b.has(w)) inter += 1;
  }
  const overlap = inter / t.size;
  return overlap > 0.58 && rssExcerpt.length < 130;
}

export async function fetchOgExcerpt(articleUrl: string): Promise<string | null> {
  const cached = excerptCache.get(articleUrl);
  if (cached) return cached;
  if (excerptFail.has(articleUrl)) return null;

  try {
    const res = await fetch(excerptFetchPath(articleUrl), { credentials: 'omit' });
    if (!res.ok) {
      excerptFail.add(articleUrl);
      return null;
    }
    const data = (await res.json()) as { excerpt?: string };
    const raw = data.excerpt?.trim();
    if (!raw || raw.length < 24) {
      excerptFail.add(articleUrl);
      return null;
    }
    const two = excerptFromRssDescription(raw) || clipTeaser(raw, EXCERPT_MAX);
    excerptCache.set(articleUrl, two);
    return two;
  } catch {
    excerptFail.add(articleUrl);
    return null;
  }
}

export async function enrichBlurbsSequential(
  items: { link: string; title: string; blurb: string }[],
  onUpdate: (link: string, blurb: string) => void,
  concurrency = 4,
): Promise<void> {
  const todo = items.filter(
    (it) => it.link && !it.link.startsWith('manual:') && needsOgEnrichment(it.title, it.blurb),
  );
  for (let i = 0; i < todo.length; i += concurrency) {
    const batch = todo.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (it) => {
        const ex = await fetchOgExcerpt(it.link);
        if (ex) onUpdate(it.link, ex);
      }),
    );
  }
}
