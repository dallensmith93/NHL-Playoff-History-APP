import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayoffBracket } from '../../../types/playoffs';
import type { PlayoffTeamAdvancedStats } from '../../../types/playoffs';
import type { SimulationWeights } from '../../../types/playoffs';
import type { PlayoffTeamEntry } from '../../../types/playoffs';
import {
  PLAYOFF_BRACKET_2026,
  PLAYOFF_BRACKET_2026_SEED,
  PLAYOFF_TEAM_ENTRY_BY_SLUG,
} from '../../../data/playoffBracket2026';
import { PLAYOFF_TEAM_STATS_2026 } from '../../../data/playoffTeamStats2026';
import { DEFAULT_SIMULATION_WEIGHTS } from '../../../data/simulationWeights';
import { fetchPlayoffScoreboard, getDefaultScheduleWindow } from '../services/liveScoresService';
import type { LivePlayoffGame, LiveDataSource } from '../types/liveScores';
import { mergeBracketWithLive, indexLiveGamesByMatchup } from '../utils/mergeBracketWithLive';

const POLL_MS = 30_000;
/** Keep polling after the last "live" snapshot so we catch the switch to Final and merge series wins. */
const POST_LIVE_POLL_MS = 8 * 60_000;
/** Extra fetch shortly after a live game is seen—API often lags when flipping Live → Final. */
const CATCH_FINAL_FETCH_MS = 15_000;

/** Include feed rows unless they are explicitly non-playoff or preseason — ambiguous rows still merge. */
function isPlayoffRow(g: LivePlayoffGame): boolean {
  if (g.isPlayoffGame === false) return false;
  if (g.gameType === '1') return false;
  return true;
}

export interface UseLivePlayoffScoresResult {
  bracket: PlayoffBracket;
  liveGames: LivePlayoffGame[];
  liveIndex: Map<string, LivePlayoffGame[]>;
  source: LiveDataSource;
  fetchedAt: string | null;
  error: string | null;
  usedFallback: boolean;
  refresh: () => void;
  /** True while first fetch in flight */
  loading: boolean;
}

export function useLivePlayoffScores(options?: {
  stats?: Record<string, PlayoffTeamAdvancedStats>;
  weights?: SimulationWeights;
  teamMap?: Map<string, PlayoffTeamEntry>;
  /** Turn off polling (e.g. user pref) */
  pollDisabled?: boolean;
}): UseLivePlayoffScoresResult {
  const stats = options?.stats ?? PLAYOFF_TEAM_STATS_2026;
  const weights = options?.weights ?? DEFAULT_SIMULATION_WEIGHTS;
  const teamMap = options?.teamMap ?? PLAYOFF_TEAM_ENTRY_BY_SLUG;

  const [liveGames, setLiveGames] = useState<LivePlayoffGame[]>([]);
  const [source, setSource] = useState<LiveDataSource>('seed');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const liveGamesRef = useRef<LivePlayoffGame[]>([]);
  const pollAfterLiveUntilRef = useRef(0);
  const catchFinalTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    const win = getDefaultScheduleWindow();
    const res = await fetchPlayoffScoreboard({
      startDate: win.start,
      endDate: win.end,
      signal: ac.signal,
    });
    const games = res.games;
    setLiveGames(games);

    if (catchFinalTimerRef.current) {
      clearTimeout(catchFinalTimerRef.current);
      catchFinalTimerRef.current = null;
    }
    const livePlayoff = games.filter(isPlayoffRow);
    if (livePlayoff.some((g) => g.state === 'live')) {
      pollAfterLiveUntilRef.current = Date.now() + POST_LIVE_POLL_MS;
      catchFinalTimerRef.current = window.setTimeout(() => {
        catchFinalTimerRef.current = null;
        void load();
      }, CATCH_FINAL_FETCH_MS);
    }
    if (livePlayoff.some((g) => g.state === 'unknown')) {
      pollAfterLiveUntilRef.current = Math.max(
        pollAfterLiveUntilRef.current,
        Date.now() + 3 * 60_000,
      );
    }
    setSource(res.source);
    setFetchedAt(res.fetchedAt);
    setError(res.error ?? null);
    setUsedFallback(!!res.usedFallback);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (catchFinalTimerRef.current) clearTimeout(catchFinalTimerRef.current);
    };
  }, []);

  const playoffGames = useMemo(() => liveGames.filter(isPlayoffRow), [liveGames]);

  useEffect(() => {
    liveGamesRef.current = liveGames;
  }, [liveGames]);

  useEffect(() => {
    if (options?.pollDisabled) return;
    const id = window.setInterval(() => {
      const games = liveGamesRef.current;
      const playoff = games.filter(isPlayoffRow);
      const hasLiveNow = playoff.some((g) => g.state === 'live');
      const keepPolling = hasLiveNow || Date.now() < pollAfterLiveUntilRef.current;
      if (!keepPolling) return;
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load, options?.pollDisabled]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const bracket = useMemo(() => {
    if (playoffGames.length === 0) {
      return PLAYOFF_BRACKET_2026;
    }
    return mergeBracketWithLive(
      PLAYOFF_BRACKET_2026_SEED,
      playoffGames,
      stats,
      weights,
      teamMap,
    );
  }, [playoffGames, stats, weights, teamMap]);

  /** Matchup index for playoff games only (bracket merge + series overlays). */
  const liveIndex = useMemo(() => indexLiveGamesByMatchup(playoffGames), [playoffGames]);

  return {
    bracket,
    liveGames,
    liveIndex,
    source,
    fetchedAt,
    error,
    usedFallback,
    refresh: load,
    loading,
  };
}
