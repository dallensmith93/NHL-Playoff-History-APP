import type {
  Franchise,
  FranchiseComputedStats,
  SeasonLabel,
  TeamIdentity,
} from '../types/models';
import { getCurrentIdentity } from './franchiseIdentity';
import { compareSeasonsDesc, maxSeason, seasonInRange } from './format';

function computeStatsFromParts(
  playoffAppearances: Franchise['playoffAppearances'],
  stanleyCupFinals: Franchise['stanleyCupFinals'],
  stanleyCupChampionships: Franchise['stanleyCupChampionships'],
  divisionTitles: Franchise['divisionTitles'],
): FranchiseComputedStats {
  const playoffSeasons = playoffAppearances.map((p) => p.season);
  const uniquePlayoffs = [...new Set(playoffSeasons)];

  const finalsSeasons = stanleyCupFinals.map((f) => f.season);
  const lastFinal = maxSeason(finalsSeasons);
  const lastFinalRecord = lastFinal
    ? stanleyCupFinals.find((f) => f.season === lastFinal)
    : undefined;

  const cupSeasons = stanleyCupChampionships.map((c) => c.season);
  const lastCup = maxSeason(cupSeasons);

  return {
    totalPlayoffAppearances: uniquePlayoffs.length,
    totalScfAppearances: stanleyCupFinals.length,
    totalChampionships: stanleyCupChampionships.length,
    divisionTitleCount: divisionTitles.length,
    mostRecentPlayoffSeason: maxSeason(playoffSeasons),
    mostRecentScfSeason: lastFinal,
    mostRecentScfResult: lastFinalRecord?.result,
    mostRecentChampionshipSeason: lastCup,
  };
}

/** Full franchise history: all playoff / trophy rows on the franchise. */
export function computeFranchiseStats(franchise: Franchise): FranchiseComputedStats {
  return computeStatsFromParts(
    franchise.playoffAppearances,
    franchise.stanleyCupFinals,
    franchise.stanleyCupChampionships,
    franchise.divisionTitles,
  );
}

/** Stats where every row’s season falls inside one identity window (inclusive). */
export function computeIdentityWindowStats(
  franchise: Franchise,
  identity: TeamIdentity,
): FranchiseComputedStats {
  const inWin = (s: SeasonLabel) => seasonInRange(s, identity.fromSeason, identity.toSeason);
  return computeStatsFromParts(
    franchise.playoffAppearances.filter((p) => inWin(p.season)),
    franchise.stanleyCupFinals.filter((f) => inWin(f.season)),
    franchise.stanleyCupChampionships.filter((c) => inWin(c.season)),
    franchise.divisionTitles.filter((d) => inWin(d.season)),
  );
}

/** Playoff/trophy totals attributed only to the present-day (or final) identity window. */
export function computeCurrentIdentityStats(franchise: Franchise): FranchiseComputedStats | null {
  const id = getCurrentIdentity(franchise);
  if (!id) return null;
  return computeIdentityWindowStats(franchise, id);
}

export function sortSeasonsLatestFirst(seasons: SeasonLabel[]): SeasonLabel[] {
  return [...seasons].sort(compareSeasonsDesc);
}
