/** Local-first playoff bracket + predictor (no live APIs). */

export type BracketStatus = 'not_started' | 'in_progress' | 'complete';

export interface GameResult {
  gameNumber: number;
  /** Franchise slug (matches `Franchise.slug`). */
  homeTeamSlug: string;
  awayTeamSlug: string;
  homeScore: number;
  awayScore: number;
  winnerTeamSlug: string;
  /** ISO date string — edit in seed data when adding results. */
  date: string;
  isFinal: boolean;
}

/** teamA = bracket home side; teamB = away side. */
export interface SeriesScoreSnapshot {
  teamA_wins: number;
  teamB_wins: number;
}

export interface SeriesWinProbabilityPair {
  teamA_pct: number;
  teamB_pct: number;
}

export interface SeriesProbabilityHistoryEntry {
  gameNumber: number;
  teamA_pct: number;
  teamB_pct: number;
}

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
  /** Seeded game log — edit in `playoffBracket2026.ts` only (no API). */
  games: GameResult[];
  seriesScore: SeriesScoreSnapshot;
  mostRecentGame?: GameResult;
  preSeriesProbability: SeriesWinProbabilityPair;
  currentSeriesProbability: SeriesWinProbabilityPair;
  probabilityHistory: SeriesProbabilityHistoryEntry[];
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
  /**
   * 0–1 current roster / core playoff familiarity (recent springs, returning players).
   * Distinct from franchise history below.
   */
  playoffExperience: number;
  /**
   * 0–1 organizational playoff pedigree: Cups, conference titles, sustained contention
   * (seeded per club — edit with `playoffTeamStats2026.ts`).
   */
  franchisePlayoffHistory: number;
  /** Multiply final strength; 1 = neutral. */
  injuryRiskModifier?: number;
}

export interface SimulationWeights {
  /** Regular-season standings signal (points %). */
  pointsPct: number;
  xGoalsPct: number;
  goalDiffPerGame: number;
  goalieStrength: number;
  specialTeams: number;
  recentForm: number;
  /** Roster / core playoff reps. */
  playoffExperience: number;
  /** Franchise Cups, deep runs, sustained success vs league. */
  franchisePlayoffHistory: number;
  corsiPct: number;
  defenseXga: number;
  /** Logistic steepness for series win probability. */
  logisticK: number;
  /** Scales how fast win probability moves with strength gap (tune with weights). */
  seriesProbabilityScale: number;
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
