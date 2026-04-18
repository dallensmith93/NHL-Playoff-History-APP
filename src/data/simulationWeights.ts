import type { SimulationWeights } from '../types/playoffs';

/** Default predictor weights — tune in one place per season refresh. */
export const DEFAULT_SIMULATION_WEIGHTS: SimulationWeights = {
  xGoalsPct: 0.22,
  goalDiffPerGame: 0.18,
  goalieStrength: 0.18,
  specialTeams: 0.12,
  recentForm: 0.1,
  playoffExperience: 0.08,
  corsiPct: 0.07,
  defenseXga: 0.05,
  logisticK: 1.35,
  homeIceBoost: 0.04,
};
