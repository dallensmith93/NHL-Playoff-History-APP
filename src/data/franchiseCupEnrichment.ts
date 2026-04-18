/**
 * Stanley Cup and related trophy patches for franchises not fully covered in the main franchise file.
 * Merge order is placeholders → `franchiseSeed` details → this list; each row replaces fields for its id.
 *
 * Optional `playoffAppearances` and `stanleyCupFinals` replace those fields
 * on the merged franchise when set (see `FranchiseCupEnrichmentRow`).
 * Division titles come from `FRANCHISE_DIVISION_TITLES_NHL` (see `franchises.ts`).
 *
 * Seasons use the app’s `YYYY-YY` label for the championship season (e.g. June 2025 win → `2024-25`).
 */
import type {
  PlayoffAppearanceRecord,
  StanleyCupChampionshipRecord,
  StanleyCupFinalRecord,
} from '../types/models';

const c = (season: string): StanleyCupChampionshipRecord => ({ season });

const po = (
  season: string,
  roundReached?: string,
  result?: string,
): PlayoffAppearanceRecord => ({ season, roundReached, result });

const fin = (
  season: string,
  result: 'won' | 'lost',
  opponent?: string,
  games?: string,
): StanleyCupFinalRecord => ({ season, result, opponent, games });

/** Franchise ids that already have full cup history in the main seed — do not duplicate here. */
export const FRANCHISE_IDS_IN_DEEP_SEED = new Set([
  'toronto-maple-leafs',
  'montreal-canadiens',
  'boston-bruins',
  'detroit-red-wings',
  'chicago-blackhawks',
  'new-york-rangers',
  'edmonton-oilers',
  'pittsburgh-penguins',
  'colorado-avalanche',
  'dallas-stars',
  'carolina-hurricanes',
  'tampa-bay-lightning',
  'vegas-golden-knights',
  'new-jersey-devils',
  'calgary-flames',
  'winnipeg-jets',
]);

export interface FranchiseCupEnrichmentRow {
  id: string;
  stanleyCupChampionships: StanleyCupChampionshipRecord[];
  /** When set, replaces `playoffAppearances` on the merged franchise. */
  playoffAppearances?: PlayoffAppearanceRecord[];
  /** When set, replaces `stanleyCupFinals` on the merged franchise. */
  stanleyCupFinals?: StanleyCupFinalRecord[];
}

export const FRANCHISE_CUP_ENRICHMENT: FranchiseCupEnrichmentRow[] = [
  {
    id: 'anaheim-ducks',
    stanleyCupChampionships: [c('2006-07')],
    stanleyCupFinals: [
      fin('2002-03', 'lost', 'New Jersey Devils', '3-4'),
      fin('2006-07', 'won', 'Ottawa Senators', '4-1'),
    ],
    playoffAppearances: [
      po('1996-97', 'Conference semifinals', 'Won QF vs PHX 4-3; lost SF vs DET 0-4'),
      po('1998-99', 'Conference quarterfinals', 'Lost vs DET 0-4'),
      po('2002-03', 'Stanley Cup Final', 'Won West; lost Final vs NJD 3-4'),
      po('2005-06', 'Conference finals', 'Won R1 vs CGY 4-3, R2 vs COL 4-0; lost CF vs EDM 1-4'),
      po('2006-07', 'Stanley Cup champions', 'Won Cup vs OTT 4-1'),
      po('2007-08', 'Conference quarterfinals', 'Lost vs DAL 2-4'),
      po('2008-09', 'Conference semifinals', 'Won R1 vs SJS 4-2; lost vs DET 3-4'),
      po('2010-11', 'Conference quarterfinals', 'Lost vs NSH 2-4'),
      po('2012-13', 'Conference quarterfinals', 'Lost vs DET 3-4'),
      po('2013-14', 'Conference semifinals', 'Won R1 vs DAL 4-2; lost vs LAK 3-4'),
      po('2014-15', 'Conference finals', 'Won R1 vs WPG 4-0, R2 vs CGY 4-1; lost CF vs CHI 3-4'),
      po('2015-16', 'First round', 'Lost vs NSH 3-4'),
      po('2016-17', 'Conference finals', 'Won R1 vs CGY 4-0, R2 vs EDM 4-3; lost CF vs NSH 2-4'),
      po('2017-18', 'First round', 'Lost vs SJS 0-4'),
    ],
  },
  {
    id: 'buffalo-sabres',
    stanleyCupChampionships: [],
  },
  { id: 'columbus-blue-jackets', stanleyCupChampionships: [] },
  {
    id: 'florida-panthers',
    stanleyCupChampionships: [c('2023-24'), c('2024-25')],
  },
  {
    id: 'los-angeles-kings',
    stanleyCupChampionships: [c('2011-12'), c('2013-14')],
  },
  {
    id: 'minnesota-wild',
    stanleyCupChampionships: [],
  },
  {
    id: 'nashville-predators',
    stanleyCupChampionships: [],
  },
  {
    id: 'new-york-islanders',
    stanleyCupChampionships: [
      c('1979-80'),
      c('1980-81'),
      c('1981-82'),
      c('1982-83'),
    ],
  },
  {
    id: 'ottawa-senators',
    stanleyCupChampionships: [],
  },
  {
    id: 'philadelphia-flyers',
    stanleyCupChampionships: [c('1973-74'), c('1974-75')],
  },
  {
    id: 'san-jose-sharks',
    stanleyCupChampionships: [],
  },
  { id: 'seattle-kraken', stanleyCupChampionships: [] },
  {
    id: 'st-louis-blues',
    stanleyCupChampionships: [c('2018-19')],
  },
  {
    id: 'arizona-coyotes',
    stanleyCupChampionships: [],
  },
  { id: 'utah-hockey-club', stanleyCupChampionships: [] },
  {
    id: 'vancouver-canucks',
    stanleyCupChampionships: [],
  },
  {
    id: 'washington-capitals',
    stanleyCupChampionships: [c('2017-18')],
  },
  {
    id: 'montreal-maroons',
    stanleyCupChampionships: [c('1925-26'), c('1934-35')],
  },
  {
    id: 'ottawa-senators-original',
    stanleyCupChampionships: [
      c('1902-03'),
      c('1903-04'),
      c('1904-05'),
      c('1905-06'),
      c('1908-09'),
      c('1909-10'),
      c('1910-11'),
      c('1919-20'),
      c('1920-21'),
      c('1922-23'),
      c('1926-27'),
    ],
  },
  { id: 'brooklyn-americans', stanleyCupChampionships: [] },
  { id: 'philadelphia-quakers', stanleyCupChampionships: [] },
  { id: 'hamilton-tigers', stanleyCupChampionships: [] },
  { id: 'pittsburgh-pirates-nhl', stanleyCupChampionships: [] },
  { id: 'st-louis-eagles', stanleyCupChampionships: [] },
  { id: 'california-golden-seals', stanleyCupChampionships: [] },
  { id: 'cleveland-barons', stanleyCupChampionships: [] },
];
