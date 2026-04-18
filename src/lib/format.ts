import type { SeasonLabel } from '../types/models';

/** YYYY-YY (e.g. 2024-25) or YYYY-YYYY (e.g. 1999-2000) */
const seasonRe = /^(\d{4})-(\d{2}|\d{4})$/;

export function parseSeasonStartYear(season: SeasonLabel): number {
  const m = seasonRe.exec(season.trim());
  if (!m || !m[1]) return 0;
  return Number.parseInt(m[1], 10);
}

export function compareSeasonsDesc(a: SeasonLabel, b: SeasonLabel): number {
  return parseSeasonStartYear(b) - parseSeasonStartYear(a);
}

export function compareSeasonsAsc(a: SeasonLabel, b: SeasonLabel): number {
  return parseSeasonStartYear(a) - parseSeasonStartYear(b);
}

export function maxSeason(seasons: SeasonLabel[]): SeasonLabel | undefined {
  if (seasons.length === 0) return undefined;
  return [...seasons].sort(compareSeasonsDesc)[0];
}

export function formatSeasonRange(
  first: SeasonLabel,
  last?: SeasonLabel,
): string {
  if (!last) return `${first}–present`;
  return `${first}–${last}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-CA').format(n);
}

/** Inclusive range on season start years (same convention as the rest of the app). */
export function seasonInRange(
  season: SeasonLabel,
  rangeFrom: SeasonLabel,
  rangeTo?: SeasonLabel,
): boolean {
  const y = parseSeasonStartYear(season);
  const y0 = parseSeasonStartYear(rangeFrom);
  const y1 = rangeTo ? parseSeasonStartYear(rangeTo) : 9999;
  return y >= y0 && y <= y1;
}
