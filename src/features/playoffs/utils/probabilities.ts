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
  return `${base} After Game ${last.gameNumber}, ${winnerAbbr} won by ${margin}; series score now drives the update${upset ? ', including an upset bump' : ''}. Now: ${home.abbr} ${cur.teamA_pct.toFixed(0)}% / ${away.abbr} ${cur.teamB_pct.toFixed(0)}%.`;
}
