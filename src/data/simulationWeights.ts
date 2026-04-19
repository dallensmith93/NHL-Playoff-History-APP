import type { SimulationWeights } from '../types/playoffs';

/**
 * Weights for series win strength — sum to 1.0.
 * Tune here when refreshing the season file; `seriesProbabilityScale` adjusts how
 * sharply win % moves with the strength gap.
 */
export const DEFAULT_SIMULATION_WEIGHTS: SimulationWeights = {
  pointsPct: 0.13,
  xGoalsPct: 0.16,
  goalDiffPerGame: 0.14,
  goalieStrength: 0.15,
  specialTeams: 0.1,
  recentForm: 0.08,
  playoffExperience: 0.07,
  franchisePlayoffHistory: 0.07,
  corsiPct: 0.07,
  defenseXga: 0.03,
  logisticK: 1.42,
  seriesProbabilityScale: 21,
  homeIceBoost: 0.038,
};
