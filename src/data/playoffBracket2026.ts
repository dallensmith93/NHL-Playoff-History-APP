/**
 * 2026 Stanley Cup Playoffs bracket — local seed only (swap file for future years).
 * First-round matchups align with NHL division seeding / wild-card format.
 */
import type { PlayoffBracket, PlayoffRound, PlayoffSeries, PlayoffTeamEntry } from '../types/playoffs';

const T = (t: PlayoffTeamEntry) => ({ type: 'seed' as const, team: t });
const W = (seriesId: string) => ({ type: 'winnerOf' as const, seriesId });

export const PLAYOFF_TEAMS_2026 = {
  buf: {
    id: 'buf',
    franchiseSlug: 'buffalo-sabres',
    displayName: 'Buffalo Sabres',
    abbr: 'BUF',
    seedLabel: 'A1',
  },
  bos: {
    id: 'bos',
    franchiseSlug: 'boston-bruins',
    displayName: 'Boston Bruins',
    abbr: 'BOS',
    seedLabel: 'WC1',
  },
  tbl: {
    id: 'tbl',
    franchiseSlug: 'tampa-bay-lightning',
    displayName: 'Tampa Bay Lightning',
    abbr: 'TBL',
    seedLabel: 'A2',
  },
  mtl: {
    id: 'mtl',
    franchiseSlug: 'montreal-canadiens',
    displayName: 'Montreal Canadiens',
    abbr: 'MTL',
    seedLabel: 'A3',
  },
  car: {
    id: 'car',
    franchiseSlug: 'carolina-hurricanes',
    displayName: 'Carolina Hurricanes',
    abbr: 'CAR',
    seedLabel: 'M1',
  },
  ott: {
    id: 'ott',
    franchiseSlug: 'ottawa-senators',
    displayName: 'Ottawa Senators',
    abbr: 'OTT',
    seedLabel: 'WC2',
  },
  pit: {
    id: 'pit',
    franchiseSlug: 'pittsburgh-penguins',
    displayName: 'Pittsburgh Penguins',
    abbr: 'PIT',
    seedLabel: 'M2',
  },
  phi: {
    id: 'phi',
    franchiseSlug: 'philadelphia-flyers',
    displayName: 'Philadelphia Flyers',
    abbr: 'PHI',
    seedLabel: 'M3',
  },
  col: {
    id: 'col',
    franchiseSlug: 'colorado-avalanche',
    displayName: 'Colorado Avalanche',
    abbr: 'COL',
    seedLabel: 'C1',
  },
  lak: {
    id: 'lak',
    franchiseSlug: 'los-angeles-kings',
    displayName: 'Los Angeles Kings',
    abbr: 'LAK',
    seedLabel: 'WC2',
  },
  dal: {
    id: 'dal',
    franchiseSlug: 'dallas-stars',
    displayName: 'Dallas Stars',
    abbr: 'DAL',
    seedLabel: 'C2',
  },
  min: {
    id: 'min',
    franchiseSlug: 'minnesota-wild',
    displayName: 'Minnesota Wild',
    abbr: 'MIN',
    seedLabel: 'C3',
  },
  vgk: {
    id: 'vgk',
    franchiseSlug: 'vegas-golden-knights',
    displayName: 'Vegas Golden Knights',
    abbr: 'VGK',
    seedLabel: 'P1',
  },
  uta: {
    id: 'uta',
    franchiseSlug: 'utah-hockey-club',
    displayName: 'Utah Mammoth',
    abbr: 'UTA',
    seedLabel: 'WC1',
  },
  edm: {
    id: 'edm',
    franchiseSlug: 'edmonton-oilers',
    displayName: 'Edmonton Oilers',
    abbr: 'EDM',
    seedLabel: 'P2',
  },
  ana: {
    id: 'ana',
    franchiseSlug: 'anaheim-ducks',
    displayName: 'Anaheim Ducks',
    abbr: 'ANA',
    seedLabel: 'P3',
  },
} satisfies Record<string, PlayoffTeamEntry>;

const eastR1: PlayoffSeries[] = [
  {
    id: '2026-e-r1-a1-wc1',
    conference: 'Eastern',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.buf),
    away: T(PLAYOFF_TEAMS_2026.bos),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-e-r2-top',
  },
  {
    id: '2026-e-r1-a2-a3',
    conference: 'Eastern',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.tbl),
    away: T(PLAYOFF_TEAMS_2026.mtl),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-e-r2-top',
  },
  {
    id: '2026-e-r1-m1-wc2',
    conference: 'Eastern',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.car),
    away: T(PLAYOFF_TEAMS_2026.ott),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-e-r2-bot',
  },
  {
    id: '2026-e-r1-m2-m3',
    conference: 'Eastern',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.pit),
    away: T(PLAYOFF_TEAMS_2026.phi),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-e-r2-bot',
  },
];

const westR1: PlayoffSeries[] = [
  {
    id: '2026-w-r1-c1-wc2',
    conference: 'Western',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.col),
    away: T(PLAYOFF_TEAMS_2026.lak),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-w-r2-top',
  },
  {
    id: '2026-w-r1-c2-c3',
    conference: 'Western',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.dal),
    away: T(PLAYOFF_TEAMS_2026.min),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-w-r2-top',
  },
  {
    id: '2026-w-r1-p1-wc1',
    conference: 'Western',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.vgk),
    away: T(PLAYOFF_TEAMS_2026.uta),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-w-r2-bot',
  },
  {
    id: '2026-w-r1-p2-p3',
    conference: 'Western',
    round: 'first',
    roundLabel: 'First round',
    home: T(PLAYOFF_TEAMS_2026.edm),
    away: T(PLAYOFF_TEAMS_2026.ana),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'in_progress',
    nextSeriesIdForWinner: '2026-w-r2-bot',
  },
];

const eastR2: PlayoffSeries[] = [
  {
    id: '2026-e-r2-top',
    conference: 'Eastern',
    round: 'second',
    roundLabel: 'Second round',
    home: W('2026-e-r1-a1-wc1'),
    away: W('2026-e-r1-a2-a3'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-e-cf',
  },
  {
    id: '2026-e-r2-bot',
    conference: 'Eastern',
    round: 'second',
    roundLabel: 'Second round',
    home: W('2026-e-r1-m1-wc2'),
    away: W('2026-e-r1-m2-m3'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-e-cf',
  },
];

const westR2: PlayoffSeries[] = [
  {
    id: '2026-w-r2-top',
    conference: 'Western',
    round: 'second',
    roundLabel: 'Second round',
    home: W('2026-w-r1-c1-wc2'),
    away: W('2026-w-r1-c2-c3'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-w-cf',
  },
  {
    id: '2026-w-r2-bot',
    conference: 'Western',
    round: 'second',
    roundLabel: 'Second round',
    home: W('2026-w-r1-p1-wc1'),
    away: W('2026-w-r1-p2-p3'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-w-cf',
  },
];

const conferenceFinals: PlayoffSeries[] = [
  {
    id: '2026-e-cf',
    conference: 'Eastern',
    round: 'conference_final',
    roundLabel: 'Eastern Conference Final',
    home: W('2026-e-r2-top'),
    away: W('2026-e-r2-bot'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-final',
  },
  {
    id: '2026-w-cf',
    conference: 'Western',
    round: 'conference_final',
    roundLabel: 'Western Conference Final',
    home: W('2026-w-r2-top'),
    away: W('2026-w-r2-bot'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
    nextSeriesIdForWinner: '2026-final',
  },
];

const cupFinal: PlayoffSeries[] = [
  {
    id: '2026-final',
    conference: 'Final',
    round: 'cup_final',
    roundLabel: 'Stanley Cup Final',
    home: W('2026-e-cf'),
    away: W('2026-w-cf'),
    winsToWin: 4,
    homeWins: 0,
    awayWins: 0,
    status: 'upcoming',
  },
];

const rounds: PlayoffRound[] = [
  { id: '2026-east-r1', label: 'Eastern Conference — First Round', conference: 'Eastern', series: eastR1 },
  { id: '2026-west-r1', label: 'Western Conference — First Round', conference: 'Western', series: westR1 },
  { id: '2026-east-r2', label: 'Eastern Conference — Second Round', conference: 'Eastern', series: eastR2 },
  { id: '2026-west-r2', label: 'Western Conference — Second Round', conference: 'Western', series: westR2 },
  { id: '2026-cf', label: 'Conference Finals', series: [...conferenceFinals] },
  { id: '2026-scf', label: 'Stanley Cup Final', series: cupFinal },
];

const seriesOrder = [
  ...eastR1.map((s) => s.id),
  ...westR1.map((s) => s.id),
  ...eastR2.map((s) => s.id),
  ...westR2.map((s) => s.id),
  '2026-e-cf',
  '2026-w-cf',
  '2026-final',
];

export const PLAYOFF_BRACKET_2026: PlayoffBracket = {
  seasonLabel: '2025-26',
  title: '2026 Stanley Cup Playoffs Bracket',
  playoffYear: 2026,
  rounds,
  seriesOrder,
};

/** Stable ids for simulation / analytics (keep in sync with `seriesOrder` last & CF rows). */
export const BRACKET_2026_IDS = {
  eastCf: '2026-e-cf',
  westCf: '2026-w-cf',
  final: '2026-final',
} as const;

export function getAllSeries2026(): PlayoffSeries[] {
  return rounds.flatMap((r) => r.series);
}

export function getSeriesById2026(): Map<string, PlayoffSeries> {
  return new Map(getAllSeries2026().map((s) => [s.id, s]));
}

/** Resolve franchise slug → bracket team entry (playoff teams only). */
export const PLAYOFF_TEAM_ENTRY_BY_SLUG: Map<string, PlayoffTeamEntry> = new Map(
  Object.values(PLAYOFF_TEAMS_2026).map((t) => [t.franchiseSlug, t]),
);
