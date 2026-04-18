export type IndexStatusFilter = 'all' | 'active' | 'inactive';

export type IndexSortKey =
  | 'name'
  | 'cups'
  | 'playoffs'
  | 'lastPlayoff'
  | 'lastCup';

export interface IndexFiltersState {
  search: string;
  status: IndexStatusFilter;
  conference: string;
  division: string;
  era: string;
}

export interface IndexSortState {
  key: IndexSortKey;
  dir: 'asc' | 'desc';
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ConnSmytheUiState {
  search: string;
  franchiseId: string;
  /** Highlighted row / detail card (winner `id` from the dataset). */
  selectedWinnerId?: string;
}

export type PlayoffSimModePersisted = 'quick' | 'monte_carlo';

/** Bracket predictor UI + last run snapshots (JSON strings for structured results). */
export interface PlayoffPredictorPersistedState {
  mode: PlayoffSimModePersisted;
  monteCarloIterations: number;
  lastQuickResultJson?: string;
  lastMonteCarloSummaryJson?: string;
  simulationCount: number;
  favoritePredictedTeamSlug?: string;
  /** When true, bracket cards prefer team primary colors more aggressively. */
  bracketAutoTheme: boolean;
}

export interface AppPersistedStateV1 {
  version: 1;
  favorites: string[];
  /** Recent franchise page slugs (most recent first), capped in the provider. */
  recentlyViewedSlugs: string[];
  indexFilters: IndexFiltersState;
  indexSort: IndexSortState;
  lastViewedSlug?: string;
  theme: ThemePreference;
  teamNotes: Record<string, string>;
  compareA?: string;
  compareB?: string;
  connSmythe: ConnSmytheUiState;
  playoffPredictor: PlayoffPredictorPersistedState;
}

export const defaultPersistedStateV1: AppPersistedStateV1 = {
  version: 1,
  favorites: [],
  recentlyViewedSlugs: [],
  indexFilters: {
    search: '',
    status: 'all',
    conference: 'all',
    division: 'all',
    era: 'all',
  },
  indexSort: { key: 'name', dir: 'asc' },
  theme: 'system',
  teamNotes: {},
  connSmythe: { search: '', franchiseId: 'all' },
  playoffPredictor: {
    mode: 'quick',
    monteCarloIterations: 2000,
    simulationCount: 0,
    bracketAutoTheme: true,
  },
};
