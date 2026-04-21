import type { LivePlayoffGame } from '../types/liveScores';

/** Overtime / SO chip: OT1, OT2, … (period 4 = first OT) or SO. */
export function overtimeLabel(g: LivePlayoffGame): string | null {
  if (g.isShootout) return 'SO';
  if (!g.isOvertime) return null;
  const n = g.periodNumber;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 4) {
    return `OT${n - 3}`;
  }
  return 'OT1';
}
