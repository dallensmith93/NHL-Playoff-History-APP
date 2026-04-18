/**
 * Shared NHL ↔ app slug mapping for generator scripts (Edge stats + Web API).
 * Keep in sync with app franchise coverage.
 */
export const NHLE_CONFIG = {
  'anaheim-ducks': { franchiseId: 32 },
  'arizona-coyotes': { franchiseId: 28, seasonTo: '2023-24' },
  'boston-bruins': { franchiseId: 6 },
  'buffalo-sabres': { franchiseId: 19 },
  'calgary-flames': { franchiseId: 21 },
  'carolina-hurricanes': { franchiseId: 26 },
  'chicago-blackhawks': { franchiseId: 11 },
  'colorado-avalanche': { franchiseId: 27 },
  'columbus-blue-jackets': { franchiseId: 36 },
  'dallas-stars': { franchiseId: 15 },
  'detroit-red-wings': { franchiseId: 12 },
  'edmonton-oilers': { franchiseId: 25 },
  'florida-panthers': { franchiseId: 33 },
  'los-angeles-kings': { franchiseId: 14 },
  'minnesota-wild': { franchiseId: 37 },
  'montreal-canadiens': { franchiseId: 1 },
  'nashville-predators': { franchiseId: 34 },
  'new-jersey-devils': { franchiseId: 23 },
  'new-york-islanders': { franchiseId: 22 },
  'new-york-rangers': { franchiseId: 10 },
  'ottawa-senators': { franchiseId: 30 },
  'philadelphia-flyers': { franchiseId: 16 },
  'pittsburgh-penguins': { franchiseId: 17 },
  'san-jose-sharks': { franchiseId: 29 },
  'seattle-kraken': { franchiseId: 39 },
  'st-louis-blues': { franchiseId: 18 },
  'tampa-bay-lightning': { franchiseId: 31 },
  'toronto-maple-leafs': { franchiseId: 5 },
  'utah-hockey-club': { franchiseId: 40, seasonFrom: '2024-25' },
  'vancouver-canucks': { franchiseId: 20 },
  'vegas-golden-knights': { franchiseId: 38 },
  'washington-capitals': { franchiseId: 24 },
  'winnipeg-jets': { franchiseId: 35 },

  'montreal-maroons': { teamIds: [43] },
  'brooklyn-americans': { franchiseId: 8, seasonFrom: '1925-26', seasonTo: '1941-42' },
  'philadelphia-quakers': { teamIds: [39] },
  'hamilton-tigers': { teamIds: [37] },
  'pittsburgh-pirates-nhl': { teamIds: [38] },
  'st-louis-eagles': { teamIds: [45] },
  'ottawa-senators-original': { teamIds: [36] },
  'california-golden-seals': { teamIds: [46, 56], seasonFrom: '1967-68', seasonTo: '1975-76' },
  'cleveland-barons': { teamIds: [49], seasonFrom: '1976-77', seasonTo: '1977-78' },
};

/** @param {string} label e.g. 2023-24 */
export function seasonLabelStartYear(label) {
  return parseInt(label.split('-')[0], 10);
}

/** @param {number} seasonId e.g. 20242025 → 2024-25 */
export function seasonIdToLabel(seasonId) {
  const s = String(seasonId);
  if (s.length !== 8) return s;
  const y1 = s.slice(0, 4);
  const y2full = s.slice(4, 8);
  const y2short = y2full.slice(-2).padStart(2, '0');
  return `${y1}-${y2short}`;
}
