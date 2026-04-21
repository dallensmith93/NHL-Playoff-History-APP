import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MANUAL_NHL_NEWS_BRIEFS } from '../data/manualNhlNewsBriefs';
import {
  enrichBlurbsSequential,
  excerptFromRssDescription,
  plainText,
} from '../services/espnStoryExcerpt';
import { MarqueeScrollRow } from './MarqueeScrollRow';

const ESPN_NHL_RSS = 'https://www.espn.com/espn/rss/nhl/news';

/** Pick up fresh playoff + regional stories a bit faster than the default ESPN order. */
const RSS_POLL_MS = 3 * 60_000;

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
  if (t.includes('mammoth')) n += 2.5;
  if (t.includes('utah')) n += 1.2;
  if (t.includes('durzi')) n += 1.5;
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

type ManualRow = {
  title: string;
  link: string;
  blurb: string;
  supersededWhen?: (row: { title: string; link: string; blurb: string }) => boolean;
};

export function NhlHeadlinesTicker() {
  const [stories, setStories] = useState<NhlStoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const manualRows: ManualRow[] = useMemo(
    () =>
      MANUAL_NHL_NEWS_BRIEFS.map((m) => ({
        title: m.id,
        link: `manual:${m.id}`,
        blurb: m.blurb,
        supersededWhen: m.supersededWhen,
      })),
    [],
  );

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch(ESPN_NHL_RSS, { credentials: 'omit' });
      if (!res.ok) throw new Error(`RSS ${res.status}`);
      const xml = await res.text();
      const parsed = parseRss(xml);
      const sorted = [...parsed].sort(
        (a, b) => playoffBoost(b.title, b.blurb) - playoffBoost(a.title, a.blurb),
      );
      if (sorted.length > 0) setStories(sorted);
      else setStories([]);
      setError(null);

      if (sorted.length > 0) {
        await enrichBlurbsSequential(sorted, (link, blurb) => {
          setStories((prev) => prev.map((s) => (s.link === link ? { ...s, blurb } : s)));
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load headlines');
      setStories([]);
    }
  }, []);

  const loadStoriesRef = useRef(loadStories);
  loadStoriesRef.current = loadStories;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadStoriesRef.current();
    };
    void run();
    const t = window.setInterval(run, RSS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadStoriesRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const feedPending = stories.length === 0 && !error;

  const briefs = useMemo(() => {
    const fromFeed = stories.filter((s) => plainText(s.blurb).length >= 14).slice(0, 18);
    const activeManual = manualRows.filter((m) => {
      if (!m.supersededWhen) return true;
      return !fromFeed.some((row) => m.supersededWhen(row));
    });
    return [...activeManual, ...fromFeed].slice(0, 22);
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
            ESPN stories auto-refresh about every {RSS_POLL_MS / 60_000} minutes and when you return to this tab. Curated
            tiles drop away when the same story appears in the feed. Scroll sideways (trackpad, touch, or arrows) to read
            what you want.
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
        <MarqueeScrollRow ariaLabel="NHL news briefs" variant="news">
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
        </MarqueeScrollRow>
      </div>
    </div>
  );
}
