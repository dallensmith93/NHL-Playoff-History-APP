import { computeFranchiseStats } from './franchiseStats';
import { parseSeasonStartYear } from './format';
import type { Franchise } from '../types/models';
import type { IndexSortKey } from '../types/persistence';

export function sortFranchises(
  list: Franchise[],
  key: IndexSortKey,
  dir: 'asc' | 'desc',
): Franchise[] {
  const mul = dir === 'asc' ? 1 : -1;
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (key === 'name') {
      return mul * a.currentDisplayName.localeCompare(b.currentDisplayName);
    }
    const sa = computeFranchiseStats(a);
    const sb = computeFranchiseStats(b);
    if (key === 'cups') {
      return mul * (sa.totalChampionships - sb.totalChampionships);
    }
    if (key === 'playoffs') {
      return mul * (sa.totalPlayoffAppearances - sb.totalPlayoffAppearances);
    }
    if (key === 'lastPlayoff') {
      const ya = sa.mostRecentPlayoffSeason
        ? parseSeasonStartYear(sa.mostRecentPlayoffSeason)
        : -Infinity;
      const yb = sb.mostRecentPlayoffSeason
        ? parseSeasonStartYear(sb.mostRecentPlayoffSeason)
        : -Infinity;
      return mul * (ya - yb);
    }
    if (key === 'lastCup') {
      const ya = sa.mostRecentChampionshipSeason
        ? parseSeasonStartYear(sa.mostRecentChampionshipSeason)
        : -Infinity;
      const yb = sb.mostRecentChampionshipSeason
        ? parseSeasonStartYear(sb.mostRecentChampionshipSeason)
        : -Infinity;
      return mul * (ya - yb);
    }
    return 0;
  });
  return sorted;
}
