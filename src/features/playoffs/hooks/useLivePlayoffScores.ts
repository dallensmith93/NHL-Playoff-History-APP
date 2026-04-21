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
import { fetchPartnerGameOdds, type PartnerGameOddsSummary } from '../services/partnerOddsService';
import type { LivePlayoffGame, LiveDataSource } from '../types/liveScores';
import { mergeBracketWithLive, indexLiveGamesByMatchup } from '../utils/mergeBracketWithLive';

/** Base cadence when the feed is quiet — still frequent enough to pick up finals quickly. */
const POLL_MS_IDLE = 14_000;
/** While any game is live, poll aggressively. */
const POLL_MS_LIVE = 5_000;
/** Slightly slower right after live ends (feed can lag Live → Final). */
const POST_LIVE_POLL_MS = 5 * 60_000;
/** Extra fetch shortly after a live game is seen — API often lags when flipping Live → Final. */
const CATCH_FINAL_FETCH_MS = 6_000;

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
  /** NHL partner API (US) — moneyline, puck line, total by `gamePk`. */
  partnerOddsByGameId: Map<number, PartnerGameOddsSummary> | null;
  partnerOddsBook: string | null;
  partnerOddsSiteUrl: string | undefined;
  partnerOddsUpdated: string | null;
  partnerOddsError: string | null;
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
  const [partnerOddsByGameId, setPartnerOddsByGameId] = useState<Map<number, PartnerGameOddsSummary> | null>(null);
  const [partnerOddsBook, setPartnerOddsBook] = useState<string | null>(null);
  const [partnerOddsSiteUrl, setPartnerOddsSiteUrl] = useState<string | undefined>(undefined);
  const [partnerOddsUpdated, setPartnerOddsUpdated] = useState<string | null>(null);
  const [partnerOddsError, setPartnerOddsError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const liveGamesRef = useRef<LivePlayoffGame[]>([]);
  const pollAfterLiveUntilRef = useRef(0);
  const catchFinalTimerRef = useRef<number | null>(null);
  const loadRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {});

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (!opts?.silent) setLoading(true);
    const win = getDefaultScheduleWindow();
    const [res, oddsRes] = await Promise.all([
      fetchPlayoffScoreboard({
        startDate: win.start,
        endDate: win.end,
        signal: ac.signal,
      }),
      fetchPartnerGameOdds('US', ac.signal).then(
        (o) => ({ type: 'ok' as const, o }),
        (e: unknown) => ({
          type: 'err' as const,
          msg: e instanceof Error ? e.message : 'odds fetch failed',
        }),
      ),
    ]);

    if (oddsRes.type === 'ok') {
      setPartnerOddsByGameId(oddsRes.o.byGameId);
      setPartnerOddsBook(oddsRes.o.partnerName);
      setPartnerOddsSiteUrl(oddsRes.o.partnerSiteUrl);
      setPartnerOddsUpdated(oddsRes.o.lastUpdatedUTC);
      setPartnerOddsError(null);
    } else {
      setPartnerOddsError(oddsRes.msg);
    }

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
        void load({ silent: true });
      }, CATCH_FINAL_FETCH_MS);
    }
    if (livePlayoff.some((g) => g.state === 'unknown')) {
      pollAfterLiveUntilRef.current = Math.max(
        pollAfterLiveUntilRef.current,
        Date.now() + 90_000,
      );
    }
    setSource(res.source);
    setFetchedAt(res.fetchedAt);
    setError(res.error ?? null);
    setUsedFallback(!!res.usedFallback);
    setLoading(false);
  }, []);

  loadRef.current = load;

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
    let cancelled = false;
    let timer: number | undefined;

    const tick = () => {
      const playoff = liveGamesRef.current.filter(isPlayoffRow);
      const hasLive = playoff.some((g) => g.state === 'live');
      const inPostLive = Date.now() < pollAfterLiveUntilRef.current;
      const ms = hasLive ? POLL_MS_LIVE : inPostLive ? 10_000 : POLL_MS_IDLE;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        await loadRef.current({ silent: true });
        if (!cancelled) tick();
      }, ms);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [options?.pollDisabled]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadRef.current({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

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

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return {
    bracket,
    liveGames,
    liveIndex,
    source,
    fetchedAt,
    error,
    usedFallback,
    refresh,
    loading,
    partnerOddsByGameId,
    partnerOddsBook,
    partnerOddsSiteUrl,
    partnerOddsUpdated,
    partnerOddsError,
  };
}
