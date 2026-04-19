import type { LiveDataSource, LiveGameState, LivePlayoffGame, LiveScoreboardFetchResult } from '../types/liveScores';
import { nhleWebPath, nhlApiPath } from './nhlStatsUrl';

const CACHE_KEY = 'nhl-playoff-scoreboard-v1';

interface NhlTeamRef {
  triCode?: string;
  abbreviation?: string;
}

interface NhlScheduleGame {
  gamePk: number;
  gameDate: string;
  gameType?: string | number;
  status?: {
    abstractGameState?: string;
    detailedState?: string;
  };
  teams?: {
    home?: { score?: number; team?: NhlTeamRef };
    away?: { score?: number; team?: NhlTeamRef };
  };
  linescore?: {
    currentPeriod?: number;
    currentPeriodOrdinal?: string;
    currentPeriodTimeRemaining?: string;
    teams?: {
      home?: { team?: NhlTeamRef; goals?: number };
      away?: { team?: NhlTeamRef; goals?: number };
    };
  };
}

function abbrFromTeam(t: NhlTeamRef | undefined): string {
  const raw = t?.triCode ?? t?.abbreviation ?? '';
  return String(raw).toUpperCase();
}

/** Prefer schedule.teams; fall back to linescore.teams when triCodes are omitted from the main block. */
function getAbbr(g: NhlScheduleGame, side: 'home' | 'away'): string {
  const a = abbrFromTeam(g.teams?.[side]?.team);
  if (a) return a;
  return abbrFromTeam(g.linescore?.teams?.[side]?.team);
}

function mapState(g: NhlScheduleGame): LiveGameState {
  const abs = (g.status?.abstractGameState ?? '').trim();
  const det = (g.status?.detailedState ?? '').trim();
  const absU = abs.toLowerCase();
  const detL = det.toLowerCase();

  if (absU === 'live' || detL.includes('progress') || det === 'Critical') return 'live';
  if (absU === 'final' || det === 'Final' || det.endsWith('Final')) return 'final';
  if (detL.includes('warm-up') || detL.includes('warmup')) return 'scheduled';
  if (absU === 'preview' || det === 'Scheduled' || det === 'Pre-Game' || det === 'Postponed') return 'scheduled';
  return 'unknown';
}

/** NHL Stats API: 1 preseason, 2 regular, 3 playoffs — only 3 should update the playoff bracket. */
function isPlayoffGameType(gt: unknown): boolean {
  if (gt === 3 || gt === '3' || gt === 'P') return true;
  return String(gt) === '3';
}

function parseGamesFromScheduleJson(data: unknown): LivePlayoffGame[] {
  const out: LivePlayoffGame[] = [];
  const root = data as {
    dates?: { games?: NhlScheduleGame[] }[];
  };
  const dates = root?.dates ?? [];
  for (const d of dates) {
    const games = d.games ?? [];
    for (const g of games) {
      const gt = g.gameType;
      const homeAbbr = getAbbr(g, 'home');
      const awayAbbr = getAbbr(g, 'away');
      if (!homeAbbr || !awayAbbr) continue;

      const state = mapState(g);
      const homeScore = g.teams?.home?.score ?? g.linescore?.teams?.home?.goals ?? 0;
      const awayScore = g.teams?.away?.score ?? g.linescore?.teams?.away?.goals ?? 0;
      const isFinal = state === 'final';

      let liveDetailLine: string | undefined;
      if ((state === 'live' || state === 'unknown') && g.linescore) {
        const per = g.linescore.currentPeriodOrdinal ?? `P${g.linescore.currentPeriod ?? ''}`;
        const clock = g.linescore.currentPeriodTimeRemaining;
        liveDetailLine = [per, clock].filter(Boolean).join(' · ');
      }
      if (state === 'unknown' && g.status?.detailedState) {
        liveDetailLine = liveDetailLine ?? g.status.detailedState;
      }

      out.push({
        gamePk: g.gamePk,
        gameDateUtc: g.gameDate,
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

/** NHL Stats `season` query: 8 digits, e.g. 20252026 = 2025–26 league year (Oct → following Jun). */
export function nhlSeasonIdFromYmd(ymd: string): string {
  const [ys, ms] = ymd.split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (Number.isNaN(y) || Number.isNaN(m)) return `${new Date().getFullYear() - 1}${new Date().getFullYear()}`;
  if (m >= 10) return `${y}${y + 1}`;
  return `${y - 1}${y}`;
}

function mergeScheduleBodies(bodies: unknown[]): unknown {
  const dates: unknown[] = [];
  for (const body of bodies) {
    const d = (body as { dates?: unknown[] }).dates ?? [];
    dates.push(...d);
  }
  return { dates };
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
  if (u === 'OFF') return 'final';
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

/**
 * When Stats API returns 5xx, pull the same window from NHL Web schedule (week-by-week anchors).
 */
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

async function fetchScheduleJson(
  params: URLSearchParams,
  signal: AbortSignal | undefined,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${nhlApiPath(`schedule?${params.toString()}`)}`;
  const res = await fetch(url, {
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, data: undefined };
  }
  const data = (await res.json()) as unknown;
  return { ok: true, status: res.status, data };
}

/**
 * Pulls schedule for a date window. On failure, returns cached
 * payload if present; otherwise empty games with error.
 */
export async function fetchPlayoffScoreboard(
  opts: FetchScoreboardOptions,
): Promise<LiveScoreboardFetchResult> {
  let source: LiveDataSource = 'live';

  try {
    const season = nhlSeasonIdFromYmd(opts.startDate);

    const singleWindowAttempts: URLSearchParams[] = [];
    const p0 = new URLSearchParams({
      startDate: opts.startDate,
      endDate: opts.endDate,
      season,
    });
    singleWindowAttempts.push(p0);
    const p1 = new URLSearchParams({
      startDate: opts.startDate,
      endDate: opts.endDate,
    });
    singleWindowAttempts.push(p1);
    const p2 = new URLSearchParams({
      startDate: opts.startDate,
      endDate: opts.endDate,
      season,
      expand: 'schedule.linescore',
    });
    singleWindowAttempts.push(p2);

    let lastStatus = 500;
    for (const params of singleWindowAttempts) {
      const { ok, status, data } = await fetchScheduleJson(params, opts.signal);
      lastStatus = status;
      if (ok) {
        const games = parseGamesFromScheduleJson(data);
        const fetchedAt = new Date().toISOString();
        writeCachedScoreboard(games, fetchedAt);
        return { games, source, fetchedAt, usedFallback: false };
      }
    }

    const chunkBodies: unknown[] = [];
    for (const { start, end } of chunkDateRanges(opts.startDate, opts.endDate, 7)) {
      const cp = new URLSearchParams({
        startDate: start,
        endDate: end,
        season: nhlSeasonIdFromYmd(start),
      });
      const r = await fetchScheduleJson(cp, opts.signal);
      lastStatus = r.status;
      if (r.ok) chunkBodies.push(r.data);
    }
    if (chunkBodies.length === 0) {
      for (const { start, end } of chunkDateRanges(opts.startDate, opts.endDate, 7)) {
        const cp = new URLSearchParams({ startDate: start, endDate: end });
        const r = await fetchScheduleJson(cp, opts.signal);
        lastStatus = r.status;
        if (r.ok) chunkBodies.push(r.data);
      }
    }
    if (chunkBodies.length > 0) {
      const merged = mergeScheduleBodies(chunkBodies);
      const games = parseGamesFromScheduleJson(merged);
      const fetchedAt = new Date().toISOString();
      writeCachedScoreboard(games, fetchedAt);
      return { games, source, fetchedAt, usedFallback: false };
    }

    const nhleGames = await fetchScheduleJsonFromNhle(opts);
    if (nhleGames !== null) {
      const games = nhleGames;
      const fetchedAt = new Date().toISOString();
      writeCachedScoreboard(games, fetchedAt);
      return { games, source, fetchedAt, usedFallback: false };
    }

    throw new Error(`NHL schedule ${lastStatus}`);
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
