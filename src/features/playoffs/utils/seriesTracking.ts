import type {
  GameResult,
  PlayoffBracket,
  PlayoffSeries,
  PlayoffTeamEntry,
  PlayoffTeamRef,
  SeriesProbabilityHistoryEntry,
  SeriesWinProbabilityPair,
} from '../../../types/playoffs';
import type { PlayoffTeamAdvancedStats, SimulationWeights } from '../../../types/playoffs';
import { calculateSeriesWinProbability } from './seriesProbabilityModel';

function clampPct(p: number): number {
  return Math.max(5, Math.min(95, p));
}

/** Pre-series model: team A = home side of the bracket. Returns percentages (0–100). */
export function calculatePreSeriesProbability(
  teamASlug: string,
  teamBSlug: string,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
): SeriesWinProbabilityPair {
  const ha = statsBySlug[teamASlug];
  const hb = statsBySlug[teamBSlug];
  if (!ha || !hb) {
    return { teamA_pct: 50, teamB_pct: 50 };
  }
  const { homeWinProb } = calculateSeriesWinProbability(teamASlug, teamBSlug, statsBySlug, weights);
  const a = clampPct(homeWinProb * 100);
  const b = clampPct(100 - a);
  const sum = a + b;
  return { teamA_pct: (a / sum) * 100, teamB_pct: (b / sum) * 100 };
}

export function updateSeriesProbability(
  pre: SeriesWinProbabilityPair,
  current: SeriesWinProbabilityPair,
  game: GameResult,
  homeSlug: string,
  _awaySlug: string,
): SeriesWinProbabilityPair {
  let a = current.teamA_pct / 100;
  let b = current.teamB_pct / 100;
  const winnerIsA = game.winnerTeamSlug === homeSlug;
  const margin = Math.abs(game.homeScore - game.awayScore);
  const blowout = margin >= 4 ? 1.45 : margin >= 3 ? 1.22 : margin >= 2 ? 1.08 : 1;
  const favoriteWasA = pre.teamA_pct >= pre.teamB_pct;
  const upset = (favoriteWasA && !winnerIsA) || (!favoriteWasA && winnerIsA);
  const upsetMult = upset ? 1.18 : 1;
  const winBump = 0.065 * blowout * upsetMult;
  if (winnerIsA) {
    a = Math.min(0.95, a + winBump);
    b = 1 - a;
  } else {
    b = Math.min(0.95, b + winBump);
    a = 1 - b;
  }
  a = clampPct(a * 100) / 100;
  b = clampPct((1 - a) * 100) / 100;
  const s = a + b;
  return { teamA_pct: (a / s) * 100, teamB_pct: (b / s) * 100 };
}

export function getProbabilityDelta(
  current: SeriesWinProbabilityPair,
  previous: SeriesWinProbabilityPair | undefined,
): { teamA: number; teamB: number } {
  if (!previous) return { teamA: 0, teamB: 0 };
  return {
    teamA: current.teamA_pct - previous.teamA_pct,
    teamB: current.teamB_pct - previous.teamB_pct,
  };
}

export function formatSeriesScore(
  series: PlayoffSeries,
  homeEntry: PlayoffTeamEntry | undefined,
  awayEntry: PlayoffTeamEntry | undefined,
): string {
  const hw = series.seriesScore.teamA_wins;
  const aw = series.seriesScore.teamB_wins;
  if (hw === 0 && aw === 0) return 'Series not started';
  if (hw === aw) return `Tied ${hw}-${aw}`;
  const homeLeads = hw > aw;
  const lead = homeLeads ? hw : aw;
  const trail = homeLeads ? aw : hw;
  const leader = homeLeads ? homeEntry : awayEntry;
  const leaderName = leader?.abbr ?? '—';
  return `${leaderName} leads ${lead}-${trail}`;
}

export function getLastGameSummary(
  game: GameResult | undefined,
  homeEntry: PlayoffTeamEntry | undefined,
  awayEntry: PlayoffTeamEntry | undefined,
): string | null {
  if (!game) return null;
  const ha = homeEntry?.abbr ?? game.homeTeamSlug.slice(0, 3).toUpperCase();
  const aa = awayEntry?.abbr ?? game.awayTeamSlug.slice(0, 3).toUpperCase();
  return `Last game: ${ha} ${game.homeScore} – ${aa} ${game.awayScore}`;
}

export function resolvePlayoffEntry(
  ref: PlayoffTeamRef,
  winners: Map<string, string>,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): PlayoffTeamEntry | null {
  if (ref.type === 'seed') return ref.team;
  const slug = winners.get(ref.seriesId);
  if (!slug) return null;
  return teamEntryBySlug.get(slug) ?? null;
}

function seriesWinnerSlug(
  s: PlayoffSeries,
  winners: Map<string, string>,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): string | undefined {
  if (s.winnerFranchiseSlug) return s.winnerFranchiseSlug;
  if (s.homeWins < s.winsToWin && s.awayWins < s.winsToWin) return undefined;
  const homeT = resolvePlayoffEntry(s.home, winners, teamEntryBySlug);
  const awayT = resolvePlayoffEntry(s.away, winners, teamEntryBySlug);
  if (!homeT || !awayT) return undefined;
  if (s.homeWins >= s.winsToWin) return homeT.franchiseSlug;
  if (s.awayWins >= s.winsToWin) return awayT.franchiseSlug;
  return undefined;
}

export function buildWinnersMap(
  bracket: PlayoffBracket,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const sid of bracket.seriesOrder) {
    const s = bracket.rounds.flatMap((r) => r.series).find((x) => x.id === sid);
    if (!s) continue;
    const w = seriesWinnerSlug(s, m, teamEntryBySlug);
    if (w) m.set(s.id, w);
  }
  return m;
}

function deriveStatus(s: PlayoffSeries): PlayoffSeries['status'] {
  if (s.homeWins >= s.winsToWin || s.awayWins >= s.winsToWin) return 'complete';
  if ((s.games?.length ?? 0) > 0 || s.homeWins > 0 || s.awayWins > 0) return 'in_progress';
  return 'not_started';
}

function applyTrackingToSeries(
  s: PlayoffSeries,
  winners: Map<string, string>,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): void {
  const homeE = resolvePlayoffEntry(s.home, winners, teamEntryBySlug);
  const awayE = resolvePlayoffEntry(s.away, winners, teamEntryBySlug);

  s.seriesScore = { teamA_wins: s.homeWins, teamB_wins: s.awayWins };
  const games = [...(s.games ?? [])].sort((a, b) => a.gameNumber - b.gameNumber);
  s.games = games;
  s.mostRecentGame = games.length ? games[games.length - 1] : undefined;
  s.status = deriveStatus(s);

  if (!homeE || !awayE) {
    s.preSeriesProbability = { teamA_pct: 50, teamB_pct: 50 };
    s.currentSeriesProbability = { teamA_pct: 50, teamB_pct: 50 };
    s.probabilityHistory = [{ gameNumber: 0, teamA_pct: 50, teamB_pct: 50 }];
    return;
  }

  const homeSlug = homeE.franchiseSlug;
  const awaySlug = awayE.franchiseSlug;
  const pre = calculatePreSeriesProbability(homeSlug, awaySlug, statsBySlug, weights);
  s.preSeriesProbability = pre;

  const history: SeriesProbabilityHistoryEntry[] = [
    { gameNumber: 0, teamA_pct: pre.teamA_pct, teamB_pct: pre.teamB_pct },
  ];
  let current: SeriesWinProbabilityPair = { ...pre };

  for (const g of games) {
    current = updateSeriesProbability(pre, current, g, homeSlug, awaySlug);
    history.push({
      gameNumber: g.gameNumber,
      teamA_pct: current.teamA_pct,
      teamB_pct: current.teamB_pct,
    });
  }

  s.currentSeriesProbability = current;
  s.probabilityHistory = history;
}

export function enrichPlayoffBracketWithTracking(
  bracket: PlayoffBracket,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): PlayoffBracket {
  const clone = structuredClone(bracket) as PlayoffBracket;
  const winners = buildWinnersMap(clone, teamEntryBySlug);

  for (const sid of clone.seriesOrder) {
    const s = clone.rounds.flatMap((r) => r.series).find((x) => x.id === sid);
    if (s) applyTrackingToSeries(s, winners, statsBySlug, weights, teamEntryBySlug);
  }

  return clone;
}

export function findSeriesForFranchiseSlug(
  bracket: PlayoffBracket,
  franchiseSlug: string,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): PlayoffSeries | undefined {
  const winners = buildWinnersMap(bracket, teamEntryBySlug);
  for (const r of bracket.rounds) {
    for (const s of r.series) {
      const h = resolvePlayoffEntry(s.home, winners, teamEntryBySlug);
      const a = resolvePlayoffEntry(s.away, winners, teamEntryBySlug);
      if (h?.franchiseSlug === franchiseSlug || a?.franchiseSlug === franchiseSlug) return s;
    }
  }
  return undefined;
}
