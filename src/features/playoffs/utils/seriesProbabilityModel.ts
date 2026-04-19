import type { PlayoffTeamAdvancedStats, SimulationWeights } from '../../../types/playoffs';

/** Map league points % into ~0–1 for playoff field (tunable anchors). */
function normalizePointsPct(p: number): number {
  return Math.max(0, Math.min(1, (p - 0.48) / (0.78 - 0.48)));
}

/**
 * Single-team strength for head-to-head series probability.
 * Blends: regular season (points %, goal diff), advanced (xG, Corsi, xGA), special teams,
 * form, goaltending, roster playoff experience, and franchise playoff history.
 */
export function calculateTeamStrength(
  s: PlayoffTeamAdvancedStats,
  w: SimulationWeights,
): number {
  const gdN = Math.max(0, Math.min(1, (s.goalDiffPerGame + 0.85) / 1.7));
  const xgaN = Math.max(0, Math.min(1, (3.15 - s.xGaPer60) / 1.05));
  const spec = (s.ppPct + s.pkPct) / 2;
  const ptsN = normalizePointsPct(s.pointsPct);
  const orgHistory = s.franchisePlayoffHistory;

  let score =
    w.pointsPct * ptsN +
    w.xGoalsPct * s.xGoalsPct +
    w.goalDiffPerGame * gdN +
    w.goalieStrength * s.goalieStrength +
    w.specialTeams * spec +
    w.recentForm * s.recentForm +
    w.playoffExperience * s.playoffExperience +
    w.franchisePlayoffHistory * orgHistory +
    w.corsiPct * s.corsiPct +
    w.defenseXga * xgaN;
  score *= s.injuryRiskModifier ?? 1;
  return score;
}

/** Home win probability for a series before games (team A = home in bracket). */
export function calculateSeriesWinProbability(
  homeSlug: string,
  awaySlug: string,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
): { homeWinProb: number; strengthHome: number; strengthAway: number } {
  const sh = statsBySlug[homeSlug];
  const sa = statsBySlug[awaySlug];
  if (!sh || !sa) throw new Error(`Missing stats for ${homeSlug} or ${awaySlug}`);
  const strengthHome = calculateTeamStrength(sh, weights) + weights.homeIceBoost;
  const strengthAway = calculateTeamStrength(sa, weights);
  const d = strengthHome - strengthAway;
  const scale = weights.seriesProbabilityScale;
  const homeWinProb = 1 / (1 + Math.exp(-weights.logisticK * d * scale));
  return {
    homeWinProb: Math.max(0.06, Math.min(0.94, homeWinProb)),
    strengthHome,
    strengthAway,
  };
}
