import type { Franchise } from '../types/models';
import { parseSeasonStartYear } from '../lib/format';
import { computeFranchiseStats } from '../lib/franchiseStats';
import { mergePlayoffAppearances } from '../lib/mergePlayoffAppearances';
import { CONN_SMYTHE_WINNERS } from './connSmythe';
import {
  FRANCHISE_CUP_ENRICHMENT,
  FRANCHISE_IDS_IN_DEEP_SEED,
} from './franchiseCupEnrichment';
import { PLACEHOLDER_FRANCHISES } from './franchisePlaceholders';
import { FRANCHISE_SEED_DETAILS } from './franchiseSeed';
import { FRANCHISE_WIKI_ASSETS } from './franchiseWikiAssets.generated';
import { FRANCHISE_PLAYOFF_APPEARANCES_NHLE } from './franchisePlayoffAppearancesNhle.generated';
import { FRANCHISE_DIVISION_TITLES_NHL } from './franchiseDivisionTitlesNhl.generated';
import { PLAYOFF_APPEARANCE_2025_26 } from './playoffAppearances202526';

const byId = new Map<string, Franchise>();
for (const f of PLACEHOLDER_FRANCHISES) {
  byId.set(f.id, f);
}
for (const f of FRANCHISE_SEED_DETAILS) {
  byId.set(f.id, f);
}
for (const row of FRANCHISE_CUP_ENRICHMENT) {
  if (FRANCHISE_IDS_IN_DEEP_SEED.has(row.id)) continue;
  const base = byId.get(row.id);
  if (!base) continue;
  byId.set(row.id, {
    ...base,
    stanleyCupChampionships: row.stanleyCupChampionships,
    ...(row.playoffAppearances ? { playoffAppearances: row.playoffAppearances } : {}),
    ...(row.stanleyCupFinals ? { stanleyCupFinals: row.stanleyCupFinals } : {}),
    isPlaceholder: false,
    placeholderNote: undefined,
  });
}

/**
 * NHL Edge postseason (gameTypeId=3): union-merge into every franchise that has NHLE rows.
 * Same `season` as a seed/enrichment row → hand-curated row wins (keeps round/result detail).
 */
for (const id of [...byId.keys()]) {
  const base = byId.get(id);
  if (!base) continue;
  const nhlePo = FRANCHISE_PLAYOFF_APPEARANCES_NHLE[id];
  if (!nhlePo?.length) continue;
  const merged = mergePlayoffAppearances(base.playoffAppearances, nhlePo);
  byId.set(id, {
    ...base,
    playoffAppearances: merged,
    isPlaceholder: false,
    placeholderNote: undefined,
  });
}

/** Division regular-season champions from NHL Web API (see `npm run generate:nhle-divisions`). */
for (const id of [...byId.keys()]) {
  const genDiv = FRANCHISE_DIVISION_TITLES_NHL[id];
  if (!genDiv) continue;
  const base = byId.get(id);
  if (!base) continue;
  byId.set(id, { ...base, divisionTitles: genDiv });
}

/** 2025-26 qualifiers (Wikipedia-sourced); overrides NHLE for that season when Edge adds a generic row. */
for (const id of [...byId.keys()]) {
  const patch = PLAYOFF_APPEARANCE_2025_26[id];
  if (!patch) continue;
  const base = byId.get(id);
  if (!base) continue;
  byId.set(id, {
    ...base,
    playoffAppearances: mergePlayoffAppearances([patch], base.playoffAppearances),
  });
}

function attachWikiAssets(f: Franchise): Franchise {
  const w = FRANCHISE_WIKI_ASSETS[f.slug];
  if (!w) return f;
  return {
    ...f,
    ...(w.logoUrl ? { logoUrl: w.logoUrl } : {}),
    ...(w.wikiUrl ? { wikipediaUrl: w.wikiUrl } : {}),
    ...(w.wikiSummary ? { wikiSummary: w.wikiSummary } : {}),
  };
}

export const FRANCHISES: Franchise[] = [...byId.values()].map(attachWikiAssets).sort((a, b) =>
  a.currentDisplayName.localeCompare(b.currentDisplayName),
);

export const FRANCHISE_BY_SLUG = new Map(FRANCHISES.map((f) => [f.slug, f]));
export const FRANCHISE_BY_ID = new Map(FRANCHISES.map((f) => [f.id, f]));

export function getFranchiseBySlug(slug: string): Franchise | undefined {
  return FRANCHISE_BY_SLUG.get(slug);
}

export function searchFranchiseText(franchise: Franchise, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const hay = [
    franchise.franchiseName,
    franchise.currentDisplayName,
    franchise.historySummary ?? '',
    franchise.wikiSummary ?? '',
    ...franchise.lineage.identities.flatMap((i) => [i.fullName, i.city, i.teamName]),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(s);
}

export const ORIGINAL_SIX_IDS = new Set([
  'boston-bruins',
  'chicago-blackhawks',
  'detroit-red-wings',
  'montreal-canadiens',
  'new-york-rangers',
  'toronto-maple-leafs',
]);

export function franchiseMatchesEra(franchise: Franchise, era: string): boolean {
  if (era === 'all') return true;
  if (era === 'original-six') return ORIGINAL_SIX_IDS.has(franchise.id);
  if (era === '1967-expansion') return franchise.firstSeason === '1967-68';
  if (era === 'wha-merger') return franchise.firstSeason === '1979-80';
  if (era === '1992-plus') return parseSeasonStartYear(franchise.firstSeason) >= 1992;
  if (era === 'defunct') return !franchise.isActive;
  return true;
}

export function getConnSmytheForFranchise(franchiseId: string) {
  return CONN_SMYTHE_WINNERS.filter((w) => w.franchiseId === franchiseId);
}

export function getConnSmytheSummaryForFranchise(franchiseId: string) {
  const list = [...getConnSmytheForFranchise(franchiseId)].sort((a, b) => b.year - a.year);
  const mostRecent = list[0];
  return {
    count: list.length,
    mostRecent,
  };
}

export function getKnownFranchiseIds(): Set<string> {
  return new Set(FRANCHISES.map((f) => f.id));
}

export function getLeagueQuickStats() {
  const active = FRANCHISES.filter((f) => f.isActive).length;
  const cups = FRANCHISES.reduce((n, f) => n + computeFranchiseStats(f).totalChampionships, 0);
  const placeholders = FRANCHISES.filter((f) => f.isPlaceholder).length;
  return {
    franchiseCount: FRANCHISES.length,
    activeFranchises: active,
    totalCupChampionshipsInDataset: cups,
    placeholderFranchises: placeholders,
    connSmytheWinners: CONN_SMYTHE_WINNERS.length,
  };
}
