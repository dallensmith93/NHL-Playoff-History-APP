import type { Franchise } from '../types/models';
import { parseSeasonStartYear } from './format';
import { computeFranchiseStats } from './franchiseStats';

/**
 * Start year of the “current” NHL season for drought math (e.g. 2025 for 2025–26).
 * Update when you move the app’s reference season forward.
 */
export const DASHBOARD_REFERENCE_SEASON_START_YEAR = 2026;

/** Human-readable label for the reference season (shown in UI). */
export const DASHBOARD_REFERENCE_SEASON_LABEL = '2025–26';

export interface LeagueDashboardStats {
  totalActiveFranchises: number;
  totalInactiveFranchises: number;
  /**
   * Richest Cup pedigree among franchises marked with full data only.
   * Incomplete rows often have empty cup arrays and would skew rankings.
   */
  franchiseMostChampionships: {
    franchise: Franchise;
    championships: number;
  } | null;
  /**
   * Among **active** franchises with full data: largest
   * `referenceSeasonStartYear − startYear(last Cup)` (or − firstSeason if no Cups recorded).
   */
  longestActiveCupDrought: {
    franchise: Franchise;
    seasonsSinceLastCup: number;
    lastCupSeason?: string;
  } | null;
}

function isModeledFranchise(f: Franchise): boolean {
  return !f.isPlaceholder;
}

export function computeLeagueDashboard(franchises: Franchise[]): LeagueDashboardStats {
  const active = franchises.filter((f) => f.isActive);
  const inactive = franchises.filter((f) => !f.isActive);

  let most: { franchise: Franchise; championships: number } | null = null;
  for (const f of franchises.filter(isModeledFranchise)) {
    const n = computeFranchiseStats(f).totalChampionships;
    if (
      !most ||
      n > most.championships ||
      (n === most.championships &&
        f.currentDisplayName.localeCompare(most.franchise.currentDisplayName) < 0)
    ) {
      most = { franchise: f, championships: n };
    }
  }
  if (most && most.championships === 0) {
    most = null;
  }

  let longest: {
    franchise: Franchise;
    seasonsSinceLastCup: number;
    lastCupSeason?: string;
  } | null = null;

  const ref = DASHBOARD_REFERENCE_SEASON_START_YEAR;

  for (const f of active.filter(isModeledFranchise)) {
    const s = computeFranchiseStats(f);
    const founding = parseSeasonStartYear(f.firstSeason);
    const lastCup = s.mostRecentChampionshipSeason;
    const anchorStartYear = lastCup ? parseSeasonStartYear(lastCup) : founding;
    const seasonsSinceLastCup = ref - anchorStartYear;
    if (!longest || seasonsSinceLastCup > longest.seasonsSinceLastCup) {
      longest = {
        franchise: f,
        seasonsSinceLastCup,
        lastCupSeason: lastCup,
      };
    }
  }

  return {
    totalActiveFranchises: active.length,
    totalInactiveFranchises: inactive.length,
    franchiseMostChampionships: most,
    longestActiveCupDrought: longest,
  };
}
