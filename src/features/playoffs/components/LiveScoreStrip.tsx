import { useEffect, useMemo, useState } from 'react';
import type { LivePlayoffGame } from '../types/liveScores';

function formatStart(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** Local calendar day key for the device — finals stay until this rolls at midnight. */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isSameLocalCalendarDay(isoUtc: string, dayKey: string): boolean {
  try {
    return localDayKey(new Date(isoUtc)) === dayKey;
  } catch {
    return false;
  }
}

/** Re-render when the local calendar day changes (midnight) so yesterday's finals drop off. */
function useLocalCalendarDayKey(): string {
  const [key, setKey] = useState(() => localDayKey(new Date()));

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const scheduleNext = () => {
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      const ms = Math.max(500, nextMidnight.getTime() - Date.now());
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setKey(localDayKey(new Date()));
        scheduleNext();
      }, ms);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  return key;
}

function sortStripGames(games: LivePlayoffGame[]): LivePlayoffGame[] {
  return [...games]
    .filter(
      (g) =>
        g.state === 'live' ||
        g.state === 'final' ||
        g.state === 'scheduled' ||
        g.state === 'unknown',
    )
    // Keep games in their chronological slot so cards do not jump around as status changes.
    .sort((a, b) => new Date(a.gameDateUtc).getTime() - new Date(b.gameDateUtc).getTime())
    .slice(0, 32);
}

function overtimeLabel(g: LivePlayoffGame): string | null {
  if (g.isShootout) return 'SO';
  if (!g.isOvertime) return null;
  const n = g.periodNumber;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 4) return `OT${n - 3}`;
  return 'OT';
}

function badgeLabel(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') return 'Soon';
  if (g.state === 'final') return 'Final';
  // Unknown in the feed is usually still in-progress context; keep this as Live.
  return 'Live';
}

function badgeClass(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') return ' live-score-badge--soon';
  if (g.state === 'final') return ' live-score-badge--final';
  return ' live-score-badge--live';
}

export function LiveScoreStrip({ games }: { games: LivePlayoffGame[] }) {
  const todayKey = useLocalCalendarDayKey();

  const stripGames = useMemo(() => {
    const forDay = games.filter((g) => isSameLocalCalendarDay(g.gameDateUtc, todayKey));
    return sortStripGames(forDay);
  }, [games, todayKey]);

  if (stripGames.length === 0) return null;

  return (
    <div className="live-score-strip card card-pad" style={{ marginBottom: '1rem' }}>
      <p className="live-score-strip-heading muted" style={{ margin: '0 0 0.45rem', fontSize: '0.78rem' }}>
        Today&apos;s games (your local date) · Final stays on the strip until midnight
      </p>
      <div className="live-score-strip-inner">
        {stripGames.map((g) => (
          <div key={g.gamePk} className="live-score-pill">
            <span
              className={`live-score-badge${badgeClass(g)}`}
            >
              {badgeLabel(g)}
            </span>
            {(g.state !== 'scheduled' && g.state !== 'final' && overtimeLabel(g)) ? (
              <span className="live-score-badge live-score-badge--ot" title="Overtime">
                {overtimeLabel(g)}
              </span>
            ) : null}
            {g.state === 'scheduled' ? (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-detail muted">Starts {formatStart(g.gameDateUtc)}</span>
                {g.tvStations && g.tvStations.length > 0 ? (
                  <span className="live-score-detail muted">TV: {g.tvStations.join(', ')}</span>
                ) : null}
              </>
            ) : (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-num">{g.awayScore}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-num">{g.homeScore}</span>
                {g.liveDetailLine ? (
                  <span className="live-score-detail muted">{g.liveDetailLine}</span>
                ) : null}
                {g.tvStations && g.tvStations.length > 0 ? (
                  <span className="live-score-detail muted">TV: {g.tvStations.join(', ')}</span>
                ) : null}
                {(g.state === 'live' || g.state === 'unknown') &&
                (g.inIntermission ||
                  (g.clockTimeRemaining !== undefined && g.clockTimeRemaining !== '')) ? (
                  <span className="live-score-clock" title={g.inIntermission ? 'Intermission' : 'Time remaining'}>
                    {g.inIntermission ? 'INT' : g.clockTimeRemaining}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
