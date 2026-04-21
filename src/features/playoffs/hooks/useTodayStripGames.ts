import { useEffect, useMemo, useState } from 'react';
import type { LivePlayoffGame } from '../types/liveScores';

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

function sortStripGames(games: LivePlayoffGame[]): LivePlayoffGame[] {
  return [...games]
    .filter(
      (g) =>
        g.state === 'live' ||
        g.state === 'final' ||
        g.state === 'scheduled' ||
        g.state === 'unknown',
    )
    .sort((a, b) => new Date(a.gameDateUtc).getTime() - new Date(b.gameDateUtc).getTime())
    .slice(0, 32);
}

/** Re-render when the local calendar day changes (midnight). */
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

/** Same game list the live score strip uses: local “today”, chronological, capped. */
export function useTodayStripGames(games: LivePlayoffGame[]): LivePlayoffGame[] {
  const todayKey = useLocalCalendarDayKey();
  return useMemo(() => {
    const forDay = games.filter((g) => isSameLocalCalendarDay(g.gameDateUtc, todayKey));
    return sortStripGames(forDay);
  }, [games, todayKey]);
}
