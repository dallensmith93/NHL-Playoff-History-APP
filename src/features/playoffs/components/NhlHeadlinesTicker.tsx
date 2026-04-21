import { useEffect, useMemo, useState } from 'react';
import { MANUAL_NHL_NEWS_BRIEFS } from '../data/manualNhlNewsBriefs';
import {
  enrichBlurbsSequential,
  excerptFromRssDescription,
  plainText,
} from '../services/espnStoryExcerpt';

const ESPN_NHL_RSS = 'https://www.espn.com/espn/rss/nhl/news';

export interface NhlStoryRow {
  /** Used only for playoff relevance sort — not shown in the ticker. */
  title: string;
  link: string;
  /** One–two sentence excerpt; never the RSS headline. */
  blurb: string;
}

function playoffBoost(title: string, blurb: string): number {
  const t = `${title} ${blurb}`.toLowerCase();
  let n = 0;
  if (t.includes('playoff')) n += 3;
  if (t.includes('stanley')) n += 3;
  if (t.includes('cup')) n += 1;
  if (t.includes('game')) n += 0.5;
  return n;
}

function parseRss(xml: string): NhlStoryRow[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) return [];
  const items = [...doc.querySelectorAll('item')];
  const out: NhlStoryRow[] = [];
  for (const el of items) {
    const title = el.querySelector('title')?.textContent?.trim() ?? '';
    const link = el.querySelector('link')?.textContent?.trim() ?? '';
    const rawDesc = el.querySelector('description')?.textContent?.trim() ?? '';
    const blurb = excerptFromRssDescription(rawDesc);
    if (!title || !link) continue;
    out.push({ title, link, blurb });
  }
  return out;
}

export function NhlHeadlinesTicker() {
  const [stories, setStories] = useState<NhlStoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const manualRows = useMemo(
    () =>
      MANUAL_NHL_NEWS_BRIEFS.map((m) => ({
        title: m.id,
        link: `manual:${m.id}`,
        blurb: m.blurb,
      })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(ESPN_NHL_RSS, { credentials: 'omit' });
        if (!res.ok) throw new Error(`RSS ${res.status}`);
        const xml = await res.text();
        if (cancelled) return;
        const parsed = parseRss(xml);
        const sorted = [...parsed].sort(
          (a, b) => playoffBoost(b.title, b.blurb) - playoffBoost(a.title, a.blurb),
        );
        if (sorted.length > 0) setStories(sorted);
        else setStories([]);
        setError(null);

        if (sorted.length > 0 && !cancelled) {
          await enrichBlurbsSequential(sorted, (link, blurb) => {
            if (cancelled) return;
            setStories((prev) => prev.map((s) => (s.link === link ? { ...s, blurb } : s)));
          });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load headlines');
        setStories([]);
      }
    };
    void load();
    const t = window.setInterval(load, 15 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const feedPending = stories.length === 0 && !error;

  const briefs = useMemo(() => {
    const fromFeed = stories.filter((s) => plainText(s.blurb).length >= 14).slice(0, 16);
    return [...manualRows, ...fromFeed].slice(0, 20);
  }, [stories, manualRows]);

  return (
    <div className="marquee-broadcast marquee-broadcast--news playoffs-stack-item" role="region" aria-label="NHL news briefs">
      <header className="marquee-broadcast-top">
        <span className="marquee-broadcast-badge marquee-broadcast-badge--news" aria-hidden="true">
          NHL news
        </span>
        <div className="marquee-broadcast-headline">
          <span className="marquee-broadcast-title">Briefs</span>
          <span className="marquee-broadcast-sub">
            Latest curated items first, then story excerpts from ESPN (not headlines). When the feed only has teaser
            questions, we pull the first lines of the article text as a short summary.
            {feedPending ? ' · Fetching the RSS feed…' : ''}
          </span>
        </div>
      </header>
      {error ? (
        <p className="marquee-broadcast-warn">
          ESPN RSS unavailable ({error}). Showing curated items only until the feed loads again.
        </p>
      ) : null}
      <div className="marquee-broadcast-tape">
        <div className="marquee-broadcast-clip">
          <div className="marquee-broadcast-track marquee-broadcast-track--news">
            <div className="marquee-broadcast-group">
              {briefs.map((h, i) => (
                <span
                  key={`brief-${i}-${h.link}`}
                  className={
                    h.link.startsWith('manual:')
                      ? 'marquee-broadcast-chunk marquee-broadcast-chunk--news marquee-broadcast-chunk--manual'
                      : 'marquee-broadcast-chunk marquee-broadcast-chunk--news'
                  }
                >
                  {h.blurb}
                </span>
              ))}
            </div>
            <div className="marquee-broadcast-group" aria-hidden="true">
              {briefs.map((h, i) => (
                <span
                  key={`brief-dup-${i}-${h.link}`}
                  className={
                    h.link.startsWith('manual:')
                      ? 'marquee-broadcast-chunk marquee-broadcast-chunk--news marquee-broadcast-chunk--manual'
                      : 'marquee-broadcast-chunk marquee-broadcast-chunk--news'
                  }
                >
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
