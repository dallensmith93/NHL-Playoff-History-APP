/**
 * 2025–26 postseason qualifiers (season label `2025-26`).
 * Sourced from English Wikipedia "2026 Stanley Cup playoffs" playoff seeds
 * (https://en.wikipedia.org/wiki/2026_Stanley_Cup_playoffs), as of 2026-04-16.
 * First-round matchups had not started (playoffs begin 2026-04-18); NHLE stats
 * API has no gameType 3 row for this season yet — merge this after NHLE so these
 * rows override any future generic Edge row until hand-removed.
 */
import type { PlayoffAppearanceRecord } from '../types/models';

const p = (roundReached: string, result: string): Omit<PlayoffAppearanceRecord, 'season'> => ({
  roundReached,
  result,
});

/** Franchise id → appearance row for 2025-26 (sixteen qualifiers only). */
export const PLAYOFF_APPEARANCE_2025_26: Record<string, PlayoffAppearanceRecord> = {
  'anaheim-ducks': {
    season: '2025-26',
    ...p('First round', 'Qualified (P3) — vs Edmonton (P2); first playoff berth since 2017-18'),
  },
  'boston-bruins': {
    season: '2025-26',
    ...p('First round', 'Qualified (WC1) — vs Buffalo (A1)'),
  },
  'buffalo-sabres': {
    season: '2025-26',
    ...p('First round', 'Atlantic Division champions (A1) — vs Boston (WC1)'),
  },
  'carolina-hurricanes': {
    season: '2025-26',
    ...p(
      'First round',
      'Metropolitan Division champions (M1); Eastern Conference regular-season champions — vs Ottawa (WC2)',
    ),
  },
  'colorado-avalanche': {
    season: '2025-26',
    ...p(
      'First round',
      'Central Division champions (C1); Western Conference regular-season champions; Presidents\' Trophy — vs Los Angeles (WC2)',
    ),
  },
  'dallas-stars': { season: '2025-26', ...p('First round', 'Qualified (C2) — vs Minnesota (C3)') },
  'edmonton-oilers': { season: '2025-26', ...p('First round', 'Qualified (P2) — vs Anaheim (P3)') },
  'los-angeles-kings': {
    season: '2025-26',
    ...p('First round', 'Qualified (WC2) — vs Colorado (C1)'),
  },
  'minnesota-wild': { season: '2025-26', ...p('First round', 'Qualified (C3) — vs Dallas (C2)') },
  'montreal-canadiens': { season: '2025-26', ...p('First round', 'Qualified (A3) — vs Tampa Bay (A2)') },
  'ottawa-senators': {
    season: '2025-26',
    ...p('First round', 'Qualified (WC2) — vs Carolina (M1)'),
  },
  'philadelphia-flyers': {
    season: '2025-26',
    ...p('First round', 'Qualified (M3) — vs Pittsburgh (M2)'),
  },
  'pittsburgh-penguins': {
    season: '2025-26',
    ...p('First round', 'Qualified (M2) — vs Philadelphia (M3)'),
  },
  'tampa-bay-lightning': {
    season: '2025-26',
    ...p('First round', 'Qualified (A2) — vs Montréal (A3)'),
  },
  'utah-hockey-club': {
    season: '2025-26',
    ...p('First round', 'Qualified (WC1) — vs Vegas (P1)'),
  },
  'vegas-golden-knights': {
    season: '2025-26',
    ...p('First round', 'Pacific Division champions (P1) — vs Utah (WC1)'),
  },
};
