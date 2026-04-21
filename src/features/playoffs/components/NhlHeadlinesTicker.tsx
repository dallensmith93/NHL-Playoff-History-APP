import { useEffect, useMemo, useState } from 'react';

const ESPN_NHL_RSS = 'https://www.espn.com/espn/rss/nhl/news';

const TEASER_MAX = 200;

export interface NhlHeadlineItem {
  /** Used only for playoff relevance sort — not shown in the ticker. */
  title: string;
  /** Short story text from RSS description. */
  blurb: string;
}

function plainText(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t.includes('<')) return t;
  try {
    const doc = new DOMParser().parseFromString(`<div>${t}</div>`, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? t;
  } catch {
    return t;
  }
}

function clipTeaser(s: string, maxLen: number): string {
  const t = plainText(s);
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

function playoffBoost(text: string): number {
  const t = text.toLowerCase();
  let n = 0;
  if (t.includes('playoff')) n += 3;
  if (t.includes('stanley')) n += 3;
  if (t.includes('cup')) n += 1;
  if (t.includes('game')) n += 0.5;
  return n;
}

function parseRss(xml: string): NhlHeadlineItem[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) return [];
  const items = [...doc.querySelectorAll('item')];
  const out: NhlHeadlineItem[] = [];
  for (const el of items) {
    const title = el.querySelector('title')?.textContent?.trim() ?? '';
    const rawDesc = el.querySelector('description')?.textContent?.trim() ?? '';
    const fromDesc = clipTeaser(rawDesc, TEASER_MAX);
    const blurb = fromDesc || clipTeaser(title, TEASER_MAX);
    if (blurb) out.push({ title: title || blurb, blurb });
  }
  return out;
}

export function NhlHeadlinesTicker() {
  const [items, setItems] = useState<NhlHeadlineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(ESPN_NHL_RSS, { credentials: 'omit' });
        if (!res.ok) throw new Error(`RSS ${res.status}`);
        const xml = await res.text();
        if (cancelled) return;
        const parsed = parseRss(xml);
        if (parsed.length > 0) setItems(parsed);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load headlines');
      }
    };
    void load();
    const t = window.setInterval(load, 15 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const sorted = useMemo(() => {
    if (items.length === 0) return [];
    return [...items].sort(
      (a, b) =>
        playoffBoost(`${b.title} ${b.blurb}`) - playoffBoost(`${a.title} ${a.blurb}`),
    );
  }, [items]);

  if (sorted.length === 0 && !error) {
    return (
      <div className="marquee-broadcast marquee-broadcast--news playoffs-stack-item">
        <header className="marquee-broadcast-top">
          <span className="marquee-broadcast-badge marquee-broadcast-badge--news" aria-hidden="true">
            NHL news
          </span>
          <div className="marquee-broadcast-headline">
            <span className="marquee-broadcast-title">Briefs</span>
            <span className="marquee-broadcast-sub">Loading updates…</span>
          </div>
        </header>
        <div className="marquee-broadcast-tape marquee-broadcast-tape--idle">
          <p className="marquee-broadcast-idle-msg">Pulling short hockey stories from the feed.</p>
        </div>
      </div>
    );
  }

  if (error && sorted.length === 0) {
    return (
      <div className="marquee-broadcast marquee-broadcast--news playoffs-stack-item">
        <header className="marquee-broadcast-top">
          <span className="marquee-broadcast-badge marquee-broadcast-badge--news" aria-hidden="true">
            NHL news
          </span>
          <div className="marquee-broadcast-headline">
            <span className="marquee-broadcast-title">Briefs</span>
            <span className="marquee-broadcast-sub">Feed unavailable</span>
          </div>
        </header>
        <div className="marquee-broadcast-tape marquee-broadcast-tape--idle">
          <p className="marquee-broadcast-idle-msg">Updates unavailable ({error}).</p>
        </div>
      </div>
    );
  }

  const briefs = sorted.slice(0, 18);

  return (
    <div className="marquee-broadcast marquee-broadcast--news playoffs-stack-item" role="region" aria-label="NHL news briefs">
      <header className="marquee-broadcast-top">
        <span className="marquee-broadcast-badge marquee-broadcast-badge--news" aria-hidden="true">
          NHL news
        </span>
        <div className="marquee-broadcast-headline">
          <span className="marquee-broadcast-title">Briefs</span>
          <span className="marquee-broadcast-sub">
            Short stories via ESPN RSS · playoff-related items ranked first
          </span>
        </div>
      </header>
      {error ? (
        <p className="marquee-broadcast-warn">Some refreshes failed ({error}); showing last good crawl.</p>
      ) : null}
      <div className="marquee-broadcast-tape">
        <div className="marquee-broadcast-clip">
          <div className="marquee-broadcast-track marquee-broadcast-track--news">
            <div className="marquee-broadcast-group">
              {briefs.map((h, i) => (
                <span key={`brief-${i}`} className="marquee-broadcast-chunk marquee-broadcast-chunk--news">
                  {h.blurb}
                </span>
              ))}
            </div>
            <div className="marquee-broadcast-group" aria-hidden="true">
              {briefs.map((h, i) => (
                <span key={`brief-dup-${i}`} className="marquee-broadcast-chunk marquee-broadcast-chunk--news">
                  {h.blurb}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
