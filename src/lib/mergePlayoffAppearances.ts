import type { PlayoffAppearanceRecord } from '../types/models';
import { compareSeasonsAsc } from './format';

/**
 * Merge NHL Edge postseason rows with hand-curated rows. Same `season` → curated row wins
 * (richer round/result text). Remaining NHLE-only seasons are appended (sorted).
 */
export function mergePlayoffAppearances(
  curated: PlayoffAppearanceRecord[] | undefined,
  nhle: PlayoffAppearanceRecord[],
): PlayoffAppearanceRecord[] {
  const c = curated ?? [];
  if (nhle.length === 0) return c;
  const map = new Map<string, PlayoffAppearanceRecord>();
  const key = (p: PlayoffAppearanceRecord) => p.season.trim();
  for (const p of nhle) map.set(key(p), p);
  for (const p of c) map.set(key(p), p);
  return [...map.values()].sort((a, b) => compareSeasonsAsc(a.season, b.season));
}
