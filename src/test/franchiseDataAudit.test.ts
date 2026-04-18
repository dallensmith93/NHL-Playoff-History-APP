import { describe, expect, it } from 'vitest';
import { FRANCHISES, getKnownFranchiseIds } from '../data/franchises';
import { parseSeasonStartYear } from '../lib/format';
import { computeFranchiseStats } from '../lib/franchiseStats';
import { validateFranchise } from '../lib/franchiseValidation';
import type { Franchise } from '../types/models';

function hasTrophyOrPlayoffData(f: Franchise): boolean {
  const s = computeFranchiseStats(f);
  return (
    s.totalPlayoffAppearances > 0 ||
    s.totalChampionships > 0 ||
    s.totalScfAppearances > 0 ||
    s.divisionTitleCount > 0
  );
}

/** Franchises correctly documented as having no NHL postseason rows in our source. */
function hasNoPostseasonDocumentation(f: Franchise): boolean {
  const n = f.historicalNotes ?? '';
  return (
    n.includes('No Stanley Cup Playoff appearances') ||
    n.includes('No postseason appearances recorded yet')
  );
}

describe('franchise data audit', () => {
  const known = getKnownFranchiseIds();

  it('no validation errors on any franchise', () => {
    const errors: string[] = [];
    for (const f of FRANCHISES) {
      for (const issue of validateFranchise(f, known)) {
        if (issue.severity === 'error') {
          errors.push(`${f.id}: [${issue.code}] ${issue.message}`);
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  it('every franchise has trophy/playoff data or explicit no-postseason documentation', () => {
    const missing: string[] = [];
    for (const f of FRANCHISES) {
      if (!hasTrophyOrPlayoffData(f) && !hasNoPostseasonDocumentation(f)) missing.push(f.id);
    }
    expect(
      missing,
      `Franchises with no trophy rows and no historicalNotes explaining empty postseason:\n${missing.join('\n')}`,
    ).toEqual([]);
  });

  it('trophy rows fall within firstSeason / lastSeason bounds', () => {
    const bad: string[] = [];
    for (const f of FRANCHISES) {
      const lo = parseSeasonStartYear(f.firstSeason);
      const hi = f.lastSeason ? parseSeasonStartYear(f.lastSeason) : 9999;
      const check = (season: string, kind: string) => {
        const y = parseSeasonStartYear(season);
        if (y === 0) bad.push(`${f.id}: ${kind} invalid season "${season}"`);
        else if (y < lo || y > hi) bad.push(`${f.id}: ${kind} ${season} outside ${f.firstSeason}–${f.lastSeason ?? 'present'}`);
      };
      for (const p of f.playoffAppearances) check(p.season, 'playoff');
      for (const d of f.divisionTitles) check(d.season, 'division');
      for (const s of f.stanleyCupFinals) check(s.season, 'finals');
      for (const c of f.stanleyCupChampionships) check(c.season, 'cup');
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
