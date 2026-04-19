/**
 * Re-exports and text helpers for series probability (model stays in seriesProbabilityModel / seriesTracking).
 */
export { calculatePreSeriesProbability, updateSeriesProbability } from './seriesTracking';
export { calculateSeriesWinProbability, calculateTeamStrength } from './seriesProbabilityModel';

import type { PlayoffSeries } from '../../../types/playoffs';
import type { PlayoffTeamAdvancedStats } from '../../../types/playoffs';
import type { PlayoffTeamEntry } from '../../../types/playoffs';

export function explainOddsShift(
  series: PlayoffSeries,
  home: PlayoffTeamEntry | undefined,
  away: PlayoffTeamEntry | undefined,
  _statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
): string {
  if (!home || !away) return 'Matchup not locked yet.';
  const pre = series.preSeriesProbability;
  const cur = series.currentSeriesProbability;
  const hist = series.probabilityHistory ?? [];
  const last = series.mostRecentGame;
  const base = `Pre-series lean was ${home.abbr} ${pre.teamA_pct.toFixed(0)}% / ${away.abbr} ${pre.teamB_pct.toFixed(0)}% from regular season and advanced priors.`;
  if (!last?.isFinal) {
    return `${base} Current projection: ${home.abbr} ${cur.teamA_pct.toFixed(0)}% — ${away.abbr} ${cur.teamB_pct.toFixed(0)}%.`;
  }
  const winnerAbbr =
    last.winnerTeamSlug === home.franchiseSlug ? home.abbr : away.abbr;
  const margin = Math.abs(last.homeScore - last.awayScore);
  const favWasHome = pre.teamA_pct >= pre.teamB_pct;
  const upset =
    (favWasHome && last.winnerTeamSlug !== home.franchiseSlug) ||
    (!favWasHome && last.winnerTeamSlug === away.franchiseSlug);

  let priorStep = '';
  if (last.gameNumber >= 2 && hist[last.gameNumber - 1]) {
    const prior = hist[last.gameNumber - 1]!;
    priorStep = ` Before Game ${last.gameNumber}, the in-series line was ${home.abbr} ${prior.teamA_pct.toFixed(0)}% / ${away.abbr} ${prior.teamB_pct.toFixed(0)}%.`;
  }

  const aMove = cur.teamA_pct - pre.teamA_pct;
  const bMove = cur.teamB_pct - pre.teamB_pct;
  const net = `${aMove >= 0 ? '+' : ''}${aMove.toFixed(0)} pts (${home.abbr}) / ${bMove >= 0 ? '+' : ''}${bMove.toFixed(0)} pts (${away.abbr}) vs. pre-series.`;

  return `${base}${priorStep} Final Game ${last.gameNumber}: ${winnerAbbr} by ${margin}${upset ? ' (upset vs. pre-series lean)' : ''}. ${net} Updated line: ${home.abbr} ${cur.teamA_pct.toFixed(0)}% / ${away.abbr} ${cur.teamB_pct.toFixed(0)}%.`;
}
