import type { LiveDataSource, LiveGameState, LivePlayoffGame, LiveScoreboardFetchResult } from '../types/liveScores';
import { nhleWebPath } from './nhlStatsUrl';

const CACHE_KEY = 'nhl-playoff-scoreboard-v1';

/** NHL game types: 1 preseason, 2 regular, 3 playoffs. */
function isPlayoffGameType(gt: unknown): boolean {
  if (gt === 3 || gt === '3' || gt === 'P') return true;
  return String(gt) === '3';
}

export function readCachedScoreboard(): { games: LivePlayoffGame[]; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { games: LivePlayoffGame[]; fetchedAt: string };
    if (!o?.games || !o.fetchedAt) return null;
    return o;
  } catch {
    return null;
  }
}

export function writeCachedScoreboard(games: LivePlayoffGame[], fetchedAt: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ games, fetchedAt }));
  } catch {
    /* quota / privacy */
  }
}

export interface FetchScoreboardOptions {
  startDate: string;
  endDate: string;
  signal?: AbortSignal;
}

/** NHL Web API (`api-web.nhle.com`) — one week per request; shape differs from Stats API. */
interface NhleScheduleGame {
  id: number;
  gameType?: number;
  startTimeUTC?: string;
  gameState?: string;
  awayTeam?: { abbrev?: string; score?: number };
  homeTeam?: { abbrev?: string; score?: number };
  periodDescriptor?: { number?: number; periodType?: string };
}

function mapNhleGameState(gs: string | undefined): LiveGameState {
  const u = gs?.toUpperCase() ?? '';
  /** `OFF` is the usual post-game flag; playoff rows often use `FINAL` before/instead of `OFF`. */
  if (u === 'OFF' || u === 'FINAL') return 'final';
  if (u === 'LIVE') return 'live';
  if (u === 'FUT' || u === 'PRE') return 'scheduled';
  return 'unknown';
}

function nhlePeriodOrdinal(n: number): string {
  if (n <= 0) return `P${n}`;
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function parseNhleScheduleJson(data: unknown, winStart: string, winEnd: string): LivePlayoffGame[] {
  const root = data as { gameWeek?: { date?: string; games?: NhleScheduleGame[] }[] };
  const out: LivePlayoffGame[] = [];
  for (const day of root?.gameWeek ?? []) {
    const dayDate = day.date ?? '';
    if (dayDate < winStart || dayDate > winEnd) continue;
    for (const g of day.games ?? []) {
      const homeAbbr = String(g.homeTeam?.abbrev ?? '').toUpperCase();
      const awayAbbr = String(g.awayTeam?.abbrev ?? '').toUpperCase();
      if (!homeAbbr || !awayAbbr) continue;

      const state = mapNhleGameState(g.gameState);
      const homeScore = g.homeTeam?.score ?? 0;
      const awayScore = g.awayTeam?.score ?? 0;
      const isFinal = state === 'final';

      let liveDetailLine: string | undefined;
      if ((state === 'live' || state === 'unknown') && g.periodDescriptor?.number) {
        const ord = nhlePeriodOrdinal(g.periodDescriptor.number);
        const pt = g.periodDescriptor.periodType ?? '';
        liveDetailLine = [ord, pt].filter(Boolean).join(' · ');
      }

      const gt = g.gameType;
      out.push({
        gamePk: g.id,
        gameDateUtc: g.startTimeUTC ?? `${dayDate}T00:00:00Z`,
        state,
        homeAbbr,
        awayAbbr,
        homeScore,
        awayScore,
        isFinal,
        liveDetailLine,
        gameType: gt !== undefined ? String(gt) : undefined,
        isPlayoffGame: isPlayoffGameType(gt),
      });
    }
  }
  return out;
}

/** Pull schedule for the date window from NHL Web (week anchors). Browser uses this only — no statsapi DNS/proxy. */
async function fetchScheduleJsonFromNhle(
  opts: FetchScoreboardOptions,
): Promise<LivePlayoffGame[] | null> {
  const merged = new Map<number, LivePlayoffGame>();
  let anyOk = false;
  for (const { start } of chunkDateRanges(opts.startDate, opts.endDate, 7)) {
    try {
      const url = `${nhleWebPath(`/v1/schedule/${start}`)}`;
      const res = await fetch(url, {
        signal: opts.signal,
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      anyOk = true;
      const data = (await res.json()) as unknown;
      for (const g of parseNhleScheduleJson(data, opts.startDate, opts.endDate)) {
        merged.set(g.gamePk, g);
      }
    } catch {
      /* network / abort */
    }
  }
  if (!anyOk) return null;
  return [...merged.values()];
}

function* chunkDateRanges(
  startYmd: string,
  endYmd: string,
  spanDays: number,
): Generator<{ start: string; end: string }> {
  let cur = new Date(`${startYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  while (cur <= end) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + spanDays - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    yield {
      start: toYmdLocal(cur),
      end: toYmdLocal(chunkEnd),
    };
    cur.setDate(cur.getDate() + spanDays);
  }
}

/**
 * Pulls schedule for a date window via NHL Web API only (`api-web.nhle.com`, proxied as `/nhle-web`).
 * Avoids `statsapi.web.nhl.com`, which often fails DNS (`ENOTFOUND`) or returns 5xx in dev.
 */
export async function fetchPlayoffScoreboard(
  opts: FetchScoreboardOptions,
): Promise<LiveScoreboardFetchResult> {
  let source: LiveDataSource = 'live';

  try {
    const nhleGames = await fetchScheduleJsonFromNhle(opts);
    if (nhleGames !== null) {
      const fetchedAt = new Date().toISOString();
      writeCachedScoreboard(nhleGames, fetchedAt);
      return { games: nhleGames, source, fetchedAt, usedFallback: false };
    }

    throw new Error('NHL schedule unavailable');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    const cached = readCachedScoreboard();
    if (cached) {
      source = 'cached';
      return {
        games: cached.games,
        source,
        fetchedAt: cached.fetchedAt,
        error: msg,
        usedFallback: true,
      };
    }
    source = 'seed';
    return {
      games: [],
      source,
      fetchedAt: new Date().toISOString(),
      error: msg,
      usedFallback: true,
    };
  }
}

/** @deprecated Use `getDefaultScheduleWindow()` so dev machines in any year still pull “this week”. */
export const PLAYOFF_2026_SCHEDULE_WINDOW = {
  start: '2026-04-15',
  end: '2026-06-25',
} as const;

/**
 * Rolling window around “today” so local dev always requests dates that include tonight’s games.
 * (A fixed 2026-only range shows nothing when your system clock is 2025, etc.)
 */
export function getDefaultScheduleWindow(now = new Date()): { start: string; end: string } {
  const s = new Date(now);
  s.setDate(s.getDate() - 7);
  const e = new Date(now);
  e.setDate(e.getDate() + 21);
  return { start: toYmdLocal(s), end: toYmdLocal(e) };
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
