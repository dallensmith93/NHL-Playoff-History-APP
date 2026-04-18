/** NHL season label e.g. "2023-24" */
export type SeasonLabel = string;

/**
 * How this identity era connects to the previous identity in the same continuous franchise.
 * Use `founding` for the first NHL (or WHA→NHL) identity you model; relocations and renames keep continuity explicit.
 */
export type IdentityTransition =
  | 'founding'
  | 'continuation'
  | 'rename'
  | 'relocation'
  | 'rebrand'
  | 'merger'
  /** Final identity before the franchise entity ceased under this row (defunct). */
  | 'ceased';

export interface TeamIdentity {
  id: string;
  city: string;
  teamName: string;
  fullName: string;
  fromSeason: SeasonLabel;
  toSeason?: SeasonLabel;
  abbreviation?: string;
  transitionFromPrior?: IdentityTransition;
  /** Brand colors for this era; merges over `Franchise.colors` when present. */
  eraColors?: Partial<FranchiseColors>;
  /** Curator notes for this identity window only. */
  eraNotes?: string;
}

export interface Era {
  id: string;
  label: string;
  conference?: string;
  division?: string;
  fromSeason: SeasonLabel;
  toSeason?: SeasonLabel;
}

export interface DivisionTitleRecord {
  season: SeasonLabel;
  division?: string;
  conference?: string;
  notes?: string;
}

export interface PlayoffAppearanceRecord {
  season: SeasonLabel;
  roundReached?: string;
  result?: string;
  notes?: string;
}

export interface StanleyCupFinalRecord {
  season: SeasonLabel;
  opponent?: string;
  result: 'won' | 'lost';
  games?: string;
}

export interface StanleyCupChampionshipRecord {
  season: SeasonLabel;
  finalsOpponent?: string;
  connSmytheWinnerId?: string;
}

export interface FranchiseLineage {
  continuesFranchiseId?: string;
  predecessorFranchiseIds?: string[];
  successorFranchiseId?: string;
  identities: TeamIdentity[];
  eras: Era[];
}

export interface FranchiseColors {
  primary: string;
  secondary: string;
  accent?: string;
  /** Preferred readable text on primary background */
  onPrimary: string;
  onSecondary: string;
}

export interface Franchise {
  id: string;
  slug: string;
  franchiseName: string;
  currentDisplayName: string;
  isActive: boolean;
  isPlaceholder: boolean;
  placeholderNote?: string;
  firstSeason: SeasonLabel;
  lastSeason?: SeasonLabel;
  colors: FranchiseColors;
  lineage: FranchiseLineage;
  divisionTitles: DivisionTitleRecord[];
  playoffAppearances: PlayoffAppearanceRecord[];
  stanleyCupFinals: StanleyCupFinalRecord[];
  stanleyCupChampionships: StanleyCupChampionshipRecord[];
  historySummary?: string;
  /** Historical commentary bundled with the franchise (distinct from user notes in localStorage). */
  historicalNotes?: string;
  currentConference?: string;
  currentDivision?: string;
  /** Primary mark from Wikipedia / Wikimedia thumbnail (see `npm run generate:wiki-assets`). */
  logoUrl?: string;
  wikipediaUrl?: string;
  /** Short extract from English Wikipedia (same generation pipeline as logos). */
  wikiSummary?: string;
}

export interface ConnSmytheWinner {
  id: string;
  year: number;
  playerName: string;
  position?: string;
  teamName: string;
  franchiseId?: string;
  /** True when this player’s team lost the Stanley Cup Final that playoff year (rare). */
  lostStanleyCupFinal?: boolean;
}

/** Totals derived from playoff / finals / championship arrays (lifetime or a filtered window). */
export interface FranchiseComputedStats {
  totalPlayoffAppearances: number;
  totalScfAppearances: number;
  totalChampionships: number;
  divisionTitleCount: number;
  mostRecentPlayoffSeason?: SeasonLabel;
  mostRecentScfSeason?: SeasonLabel;
  mostRecentScfResult?: 'won' | 'lost';
  mostRecentChampionshipSeason?: SeasonLabel;
}
