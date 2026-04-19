import { PLAYOFF_TEAMS_2026 } from '../../../data/playoffBracket2026';

/** NHL schedule uses 3-letter abbreviations; map to franchise slugs used in the app. */
const ABBR_TO_SLUG: Record<string, string> = {};
for (const t of Object.values(PLAYOFF_TEAMS_2026)) {
  ABBR_TO_SLUG[t.abbr.toUpperCase()] = t.franchiseSlug;
}

export function abbrevToFranchiseSlug(abbr: string): string | undefined {
  return ABBR_TO_SLUG[abbr.trim().toUpperCase()];
}

export function matchupKey(abbrA: string, abbrB: string): string {
  const [x, y] = [abbrA, abbrB].map((s) => s.toUpperCase()).sort();
  return `${x}|${y}`;
}
