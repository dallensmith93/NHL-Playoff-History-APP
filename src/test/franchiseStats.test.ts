import { describe, expect, it } from 'vitest';
import { computeFranchiseStats, computeIdentityWindowStats } from '../lib/franchiseStats';
import type { Franchise } from '../types/models';

const minimal: Franchise = {
  id: 'test',
  slug: 'test',
  franchiseName: 'Test',
  currentDisplayName: 'Test',
  isActive: true,
  isPlaceholder: true,
  firstSeason: '2000-01',
  colors: {
    primary: '#000',
    secondary: '#fff',
    onPrimary: '#fff',
    onSecondary: '#000',
  },
  lineage: { identities: [], eras: [] },
  divisionTitles: [{ season: '2010-11', division: 'X' }],
  playoffAppearances: [
    { season: '2010-11' },
    { season: '2012-13' },
    { season: '2010-11' },
  ],
  stanleyCupFinals: [
    { season: '2012-13', result: 'lost' },
    { season: '2015-16', result: 'won' },
  ],
  stanleyCupChampionships: [{ season: '2015-16' }],
};

describe('computeFranchiseStats', () => {
  it('dedupes playoff seasons and picks latest finals/cup', () => {
    const s = computeFranchiseStats(minimal);
    expect(s.totalPlayoffAppearances).toBe(2);
    expect(s.divisionTitleCount).toBe(1);
    expect(s.mostRecentPlayoffSeason).toBe('2012-13');
    expect(s.mostRecentScfSeason).toBe('2015-16');
    expect(s.mostRecentScfResult).toBe('won');
    expect(s.mostRecentChampionshipSeason).toBe('2015-16');
    expect(s.totalChampionships).toBe(1);
    expect(s.totalScfAppearances).toBe(2);
  });
});

describe('computeIdentityWindowStats', () => {
  it('filters rows to identity from/to seasons', () => {
    const f: Franchise = {
      ...minimal,
      lineage: {
        identities: [
          {
            id: 'a',
            city: 'A',
            teamName: 'A',
            fullName: 'A A',
            fromSeason: '2010-11',
            toSeason: '2011-12',
          },
        ],
        eras: [],
      },
      playoffAppearances: [{ season: '2010-11' }, { season: '2015-16' }],
      stanleyCupFinals: [{ season: '2015-16', result: 'lost' }],
      stanleyCupChampionships: [],
      divisionTitles: [],
    };
    const id = f.lineage.identities[0];
    if (!id) throw new Error('missing id');
    const w = computeIdentityWindowStats(f, id);
    expect(w.totalPlayoffAppearances).toBe(1);
    expect(w.totalScfAppearances).toBe(0);
  });
});
