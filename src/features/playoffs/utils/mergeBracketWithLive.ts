import type { PlayoffBracket, PlayoffSeries, GameResult, PlayoffTeamEntry } from '../../../types/playoffs';
import {
  enrichPlayoffBracketWithTracking,
  buildWinnersMap,
  resolvePlayoffEntry,
} from './seriesTracking';
import type { PlayoffTeamAdvancedStats, SimulationWeights } from '../../../types/playoffs';
import type { LivePlayoffGame, SeriesLiveOverlay } from '../types/liveScores';
import { matchupKey } from '../services/nhlTeamMap';

/** Feed row is a completed game (counts toward series wins). */
export function isLiveGameFinal(g: LivePlayoffGame): boolean {
  return g.state === 'final' || g.isFinal === true;
}

/** Group live games by normalized matchup key. */
export function indexLiveGamesByMatchup(games: LivePlayoffGame[]): Map<string, LivePlayoffGame[]> {
  const m = new Map<string, LivePlayoffGame[]>();
  for (const g of games) {
    const k = matchupKey(g.homeAbbr, g.awayAbbr);
    const list = m.get(k) ?? [];
    list.push(g);
    m.set(k, list);
  }
  for (const [, list] of m) {
    list.sort((a, b) => new Date(a.gameDateUtc).getTime() - new Date(b.gameDateUtc).getTime());
  }
  return m;
}

function gamesForSeries(
  home: PlayoffTeamEntry | null,
  away: PlayoffTeamEntry | null,
  liveIndex: Map<string, LivePlayoffGame[]>,
): LivePlayoffGame[] {
  if (!home || !away) return [];
  return liveIndex.get(matchupKey(home.abbr, away.abbr)) ?? [];
}

function toGameResult(
  g: LivePlayoffGame,
  homeSlug: string,
  awaySlug: string,
  gameNumber: number,
): GameResult {
  const winnerSlug =
    g.homeScore > g.awayScore ? homeSlug : g.awayScore > g.homeScore ? awaySlug : homeSlug;
  return {
    gameNumber,
    homeTeamSlug: homeSlug,
    awayTeamSlug: awaySlug,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    winnerTeamSlug: winnerSlug,
    date: g.gameDateUtc.slice(0, 10),
    isFinal: isLiveGameFinal(g),
  };
}

/**
 * Overlay final games from NHL feed onto seeded bracket, then enrich probabilities.
 * Games still in progress do not advance the probability model until they go final.
 */
export function mergeBracketWithLive(
  bracketSeed: PlayoffBracket,
  liveGames: LivePlayoffGame[],
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): PlayoffBracket {
  const liveIndex = indexLiveGamesByMatchup(liveGames);
  const clone = structuredClone(bracketSeed) as PlayoffBracket;

  // Recompute winners after each series so R2+ `from_series` slots resolve (e.g. COL–LAK) once R1 is merged from the feed.
  for (const sid of clone.seriesOrder) {
    const winners = buildWinnersMap(clone, teamEntryBySlug);
    const s = clone.rounds.flatMap((r) => r.series).find((x) => x.id === sid);
    if (!s) continue;
    const homeE = resolvePlayoffEntry(s.home, winners, teamEntryBySlug);
    const awayE = resolvePlayoffEntry(s.away, winners, teamEntryBySlug);
    const lg = gamesForSeries(homeE, awayE, liveIndex);
    if (!homeE || !awayE || lg.length === 0) continue;

    const homeSlug = homeE.franchiseSlug;
    const awaySlug = awayE.franchiseSlug;

    const finals = lg.filter(isLiveGameFinal);
    if (finals.length === 0) continue;

    // Always mark merged feed games as final so downstream odds/UX never skips on a stray state flag.
    s.games = finals.map((g, i) => ({ ...toGameResult(g, homeSlug, awaySlug, i + 1), isFinal: true }));
    let hw = 0;
    let aw = 0;
    for (const gr of s.games) {
      if (gr.winnerTeamSlug === homeSlug) hw += 1;
      else aw += 1;
    }
    s.homeWins = hw;
    s.awayWins = aw;
    s.seriesScore = { teamA_wins: hw, teamB_wins: aw };
    s.mostRecentGame = s.games[s.games.length - 1];
    s.winnerFranchiseSlug =
      hw >= s.winsToWin ? homeSlug : aw >= s.winsToWin ? awaySlug : undefined;
  }

  return enrichPlayoffBracketWithTracking(clone, statsBySlug, weights, teamEntryBySlug);
}

/** One overlay per series that has at least one scheduled/live/final game in the feed. */
export function buildSeriesOverlaysForBracket(
  bracket: PlayoffBracket,
  liveIndex: Map<string, LivePlayoffGame[]>,
  source: SeriesLiveOverlay['source'],
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): Map<string, SeriesLiveOverlay> {
  const winners = buildWinnersMap(bracket, teamEntryBySlug);
  const out = new Map<string, SeriesLiveOverlay>();
  for (const r of bracket.rounds) {
    for (const s of r.series) {
      const home = resolvePlayoffEntry(s.home, winners, teamEntryBySlug) ?? undefined;
      const away = resolvePlayoffEntry(s.away, winners, teamEntryBySlug) ?? undefined;
      const o = buildSeriesLiveOverlay(s, home, away, liveIndex, source);
      if (o) out.set(s.id, o);
    }
  }
  return out;
}

export function buildSeriesLiveOverlay(
  _series: PlayoffSeries,
  home: PlayoffTeamEntry | undefined,
  away: PlayoffTeamEntry | undefined,
  liveIndex: Map<string, LivePlayoffGame[]>,
  source: SeriesLiveOverlay['source'],
): SeriesLiveOverlay | undefined {
  if (!home || !away) return undefined;
  const lg = gamesForSeries(home, away, liveIndex);
  if (lg.length === 0) return undefined;
  const last = lg[lg.length - 1]!;
  const ha = home.abbr;
  const aa = away.abbr;

  let primaryLine: string | undefined;
  let state = last.state;

  if (last.state === 'live') {
    primaryLine = `Live: ${ha} ${last.homeScore} – ${aa} ${last.awayScore}${last.liveDetailLine ? ` · ${last.liveDetailLine}` : ''}`;
  } else if (isLiveGameFinal(last)) {
    primaryLine = `Last (final): ${ha} ${last.homeScore} – ${aa} ${last.awayScore}`;
  }

  const upcoming = lg.find((g) => g.state === 'scheduled');
  let nextGameLine: string | undefined;
  if (upcoming) {
    const dt = new Date(upcoming.gameDateUtc);
    nextGameLine = `Next: ${dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  }

  const bracketStatusLabel =
    last.state === 'live' ? 'Live' : last.state === 'final' ? 'Final' : 'Scheduled';

  return {
    bracketStatusLabel,
    primaryLine,
    nextGameLine,
    state,
    source,
  };
}
