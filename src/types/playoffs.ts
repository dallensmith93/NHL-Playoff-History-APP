/** Local-first playoff bracket + predictor (no live APIs). */

export type BracketStatus = 'upcoming' | 'in_progress' | 'complete';

export interface PlayoffTeamEntry {
  id: string;
  /** Matches `Franchise.slug` in the main app. */
  franchiseSlug: string;
  displayName: string;
  abbr: string;
  seedLabel?: string;
}

export type PlayoffTeamRef =
  | { type: 'seed'; team: PlayoffTeamEntry }
  | { type: 'winnerOf'; seriesId: string };

export interface PlayoffSeries {
  id: string;
  conference: 'Eastern' | 'Western' | 'Final';
  round: 'first' | 'second' | 'conference_final' | 'cup_final';
  roundLabel: string;
  home: PlayoffTeamRef;
  away: PlayoffTeamRef;
  winsToWin: number;
  homeWins: number;
  awayWins: number;
  /** Set when known from real results or simulation. */
  winnerFranchiseSlug?: string;
  status: BracketStatus;
  /** Where the winner advances (optional for Cup). */
  nextSeriesIdForWinner?: string;
  notes?: string;
}

export interface PlayoffRound {
  id: string;
  label: string;
  conference?: 'Eastern' | 'Western';
  series: PlayoffSeries[];
}

export interface PlayoffBracket {
  seasonLabel: string;
  title: string;
  /** Playoff year label (e.g. calendar year of Cup presentation). */
  playoffYear: number;
  rounds: PlayoffRound[];
  /** Flat index for simulation ordering (topological). */
  seriesOrder: string[];
}

/** Seeded advanced metrics — all roughly 0–1 scaled except where noted. */
export interface PlayoffTeamAdvancedStats {
  franchiseSlug: string;
  /** Points % (0–1). */
  pointsPct: number;
  /** Per-game goal differential (typ. -1..+1.5). */
  goalDiffPerGame: number;
  /** xGF% at 5v5 style share (0–1). */
  xGoalsPct: number;
  corsiPct: number;
  /** Lower is better; will invert in model. */
  xGaPer60: number;
  ppPct: number;
  pkPct: number;
  /** 0–1 recent form. */
  recentForm: number;
  /** 0–1 goalie quality proxy. */
  goalieStrength: number;
  /** 0–1 playoff experience. */
  playoffExperience: number;
  /** Multiply final strength; 1 = neutral. */
  injuryRiskModifier?: number;
}

export interface SimulationWeights {
  xGoalsPct: number;
  goalDiffPerGame: number;
  goalieStrength: number;
  specialTeams: number;
  recentForm: number;
  playoffExperience: number;
  corsiPct: number;
  defenseXga: number;
  /** Logistic steepness for series win probability. */
  logisticK: number;
  /** Home-ice edge added to strength (series prob). */
  homeIceBoost: number;
}

export type PlayoffSimMode = 'quick' | 'monte_carlo';

export interface SimulatedSeriesResult {
  seriesId: string;
  winnerSlug: string;
  loserSlug: string;
  /** Games won by the series home seed side (bracket order), after simulation. */
  homeWins: number;
  /** Games won by the series away side (bracket order), after simulation. */
  awayWins: number;
  /** Model-implied favorite's win prob before noise (0–1), for favorite side. */
  favoriteWinProb: number;
  upset: boolean;
}

export interface QuickSimResult {
  championSlug: string;
  easternChampionSlug: string;
  westernChampionSlug: string;
  seriesResults: SimulatedSeriesResult[];
  /** Estimated champion win prob from final series model. */
  finalSeriesWinProbForChampion: number;
}

export interface MonteCarloTeamRates {
  franchiseSlug: string;
  displayName: string;
  cupPct: number;
  finalPct: number;
  conferenceFinalPct: number;
}

export interface MonteCarloSummary {
  iterations: number;
  teams: MonteCarloTeamRates[];
  mostLikelyChampionSlug: string;
  mostLikelyFinalMatchup: { teamA: string; teamB: string; pct: number };
}

export interface SimulationExplanation {
  championReasons: string[];
  biggestUpset?: { seriesId: string; text: string };
  goalieEdge?: string;
  likelyFinalText: string;
  pathNote: string;
}
