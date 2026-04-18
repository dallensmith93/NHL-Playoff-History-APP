import { describe, expect, it } from 'vitest';
import {
  computeLeagueDashboard,
  DASHBOARD_REFERENCE_SEASON_START_YEAR,
} from '../lib/leagueDashboard';
import type { Franchise } from '../types/models';

function bareFranchise(partial: Partial<Franchise> & Pick<Franchise, 'id' | 'slug'>): Franchise {
  return {
    franchiseName: partial.franchiseName ?? partial.id,
    currentDisplayName: partial.currentDisplayName ?? partial.id,
    isActive: partial.isActive ?? true,
    isPlaceholder: partial.isPlaceholder ?? false,
    firstSeason: partial.firstSeason ?? '2000-01',
    colors: partial.colors ?? {
      primary: '#000',
      secondary: '#fff',
      onPrimary: '#fff',
      onSecondary: '#000',
    },
    currentConference: partial.currentConference ?? 'Western',
    currentDivision: partial.currentDivision ?? 'Pacific',
    lineage: partial.lineage ?? { identities: [], eras: [] },
    divisionTitles: partial.divisionTitles ?? [],
    playoffAppearances: partial.playoffAppearances ?? [],
    stanleyCupFinals: partial.stanleyCupFinals ?? [],
    stanleyCupChampionships: partial.stanleyCupChampionships ?? [],
    ...partial,
  } as Franchise;
}

describe('computeLeagueDashboard', () => {
  it('ignores placeholder franchises for Cup leader and drought', () => {
    const placeholderCupless = bareFranchise({
      id: 'ph-cupless',
      slug: 'ph-cupless',
      currentDisplayName: 'Placeholder Cupless',
      isPlaceholder: true,
      firstSeason: '1920-21',
      stanleyCupChampionships: [],
    });
    const modeled = bareFranchise({
      id: 'modeled',
      slug: 'modeled',
      currentDisplayName: 'Modeled Team',
      isPlaceholder: false,
      firstSeason: '2000-01',
      stanleyCupChampionships: [{ season: '2015-16' }],
    });
    const dash = computeLeagueDashboard([placeholderCupless, modeled]);
    expect(dash.franchiseMostChampionships?.franchise.id).toBe('modeled');
    expect(dash.longestActiveCupDrought?.franchise.id).toBe('modeled');
    expect(dash.longestActiveCupDrought?.seasonsSinceLastCup).toBe(
      DASHBOARD_REFERENCE_SEASON_START_YEAR - 2015,
    );
  });

  it('counts all franchises for active / inactive totals', () => {
    const a = bareFranchise({
      id: 'a',
      slug: 'a',
      isActive: true,
      isPlaceholder: true,
    });
    const b = bareFranchise({
      id: 'b',
      slug: 'b',
      isActive: false,
      isPlaceholder: true,
    });
    const dash = computeLeagueDashboard([a, b]);
    expect(dash.totalActiveFranchises).toBe(1);
    expect(dash.totalInactiveFranchises).toBe(1);
  });
});
