import type { GameResult, PlayoffSeries, SeriesWinProbabilityPair } from '../../../types/playoffs';
import type { PlayoffTeamEntry } from '../../../types/playoffs';
import type { UpsetAlertKind } from '../types/liveScores';

export function getUpsetAlert(
  series: PlayoffSeries,
  pre: SeriesWinProbabilityPair,
  last: GameResult | undefined,
  home: PlayoffTeamEntry | undefined,
  away: PlayoffTeamEntry | undefined,
): UpsetAlertKind {
  if (!last?.isFinal || !home || !away) return 'none';
  const favWasA = pre.teamA_pct >= pre.teamB_pct;
  const winnerIsA = last.winnerTeamSlug === home.franchiseSlug;
  const upset = (favWasA && !winnerIsA) || (!favWasA && winnerIsA);
  if (!upset) {
    if (series.currentSeriesProbability.teamA_pct < 50 && pre.teamA_pct >= 55) return 'favorite_trouble';
    if (series.currentSeriesProbability.teamB_pct < 50 && pre.teamB_pct >= 55) return 'favorite_trouble';
    return 'none';
  }

  const margin = Math.abs(last.homeScore - last.awayScore);
  if (margin >= 4) return 'underdog_surge';
  if (last.gameNumber >= 5) return 'momentum_swing';
  return 'upset_alert';
}

export function labelUpset(kind: UpsetAlertKind): string | null {
  switch (kind) {
    case 'upset_alert':
      return 'Upset alert';
    case 'underdog_surge':
      return 'Underdog surge';
    case 'favorite_trouble':
      return 'Favorite in trouble';
    case 'momentum_swing':
      return 'Momentum swing';
    default:
      return null;
  }
}
