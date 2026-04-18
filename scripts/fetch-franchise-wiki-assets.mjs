/**
 * Fetches English Wikipedia page-summary thumbnails + extracts for NHL franchise pages.
 * Logos are served from Wikimedia Commons / Wikipedia — see README for attribution.
 *
 * Usage: node scripts/fetch-franchise-wiki-assets.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, '../src/data/franchiseWikiAssets.generated.ts');

/** Slug in app → Wikipedia canonical title */
const WIKI_TITLE_BY_SLUG = {
  'anaheim-ducks': 'Anaheim_Ducks',
  'arizona-coyotes': 'Arizona_Coyotes',
  'boston-bruins': 'Boston_Bruins',
  'buffalo-sabres': 'Buffalo_Sabres',
  'calgary-flames': 'Calgary_Flames',
  'carolina-hurricanes': 'Carolina_Hurricanes',
  'chicago-blackhawks': 'Chicago_Blackhawks',
  'colorado-avalanche': 'Colorado_Avalanche',
  'columbus-blue-jackets': 'Columbus_Blue_Jackets',
  'dallas-stars': 'Dallas_Stars',
  'detroit-red-wings': 'Detroit_Red_Wings',
  'edmonton-oilers': 'Edmonton_Oilers',
  'florida-panthers': 'Florida_Panthers',
  'los-angeles-kings': 'Los_Angeles_Kings',
  'minnesota-wild': 'Minnesota_Wild',
  'montreal-canadiens': 'Montreal_Canadiens',
  'nashville-predators': 'Nashville_Predators',
  'new-jersey-devils': 'New_Jersey_Devils',
  'new-york-islanders': 'New_York_Islanders',
  'new-york-rangers': 'New_York_Rangers',
  'ottawa-senators': 'Ottawa_Senators',
  'philadelphia-flyers': 'Philadelphia_Flyers',
  'pittsburgh-penguins': 'Pittsburgh_Penguins',
  'san-jose-sharks': 'San_Jose_Sharks',
  'seattle-kraken': 'Seattle_Kraken',
  'st-louis-blues': 'St._Louis_Blues',
  'tampa-bay-lightning': 'Tampa_Bay_Lightning',
  'toronto-maple-leafs': 'Toronto_Maple_Leafs',
  'utah-hockey-club': 'Utah_Mammoth',
  'vancouver-canucks': 'Vancouver_Canucks',
  'vegas-golden-knights': 'Vegas_Golden_Knights',
  'washington-capitals': 'Washington_Capitals',
  'winnipeg-jets': 'Winnipeg_Jets',
  'montreal-maroons': 'Montreal_Maroons',
  'brooklyn-americans': 'Brooklyn_Americans',
  'philadelphia-quakers': 'Philadelphia_Quakers_(NHL)',
  'hamilton-tigers': 'Hamilton_Tigers',
  'pittsburgh-pirates-nhl': 'Pittsburgh_Pirates_(NHL)',
  'st-louis-eagles': 'St._Louis_Eagles',
  'ottawa-senators-original': 'Ottawa_Senators_(original)',
  'california-golden-seals': 'California_Golden_Seals',
  'cleveland-barons': 'Cleveland_Barons_(NHL)',
};

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}

async function fetchSummary(title) {
  const enc = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'NHL-Franchise-History-App/1.0 (educational; local dataset)' },
  });
  if (!res.ok) throw new Error(`${title}: ${res.status}`);
  return res.json();
}

const entries = Object.entries(WIKI_TITLE_BY_SLUG);
const result = {};

for (let i = 0; i < entries.length; i++) {
  const [slug, title] = entries[i];
  process.stderr.write(`[${i + 1}/${entries.length}] ${slug}… `);
  try {
    const j = await fetchSummary(title);
    const logoUrl = j.thumbnail?.source ?? '';
    const wikiSummary = typeof j.extract === 'string' ? j.extract : '';
    const wikiUrl = j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    result[slug] = { logoUrl, wikiSummary: wikiSummary.slice(0, 1200), wikiUrl };
    process.stderr.write(logoUrl ? 'ok\n' : 'no thumb\n');
  } catch (e) {
    process.stderr.write(`ERR ${e.message}\n`);
    result[slug] = { logoUrl: '', wikiSummary: '', wikiUrl: '' };
  }
  await new Promise((r) => setTimeout(r, 250));
}

const lines = [
  '/**',
  ' * AUTO-GENERATED — run `npm run generate:wiki-assets`.',
  ' * Thumbnail URLs point at Wikimedia servers (Wikipedia infobox / Commons).',
  ' */',
  '',
  'export interface FranchiseWikiAssets {',
  '  logoUrl: string;',
  '  wikiSummary: string;',
  '  wikiUrl: string;',
  '}',
  '',
  'export const FRANCHISE_WIKI_ASSETS: Record<string, FranchiseWikiAssets> = {',
];

for (const [slug, v] of Object.entries(result)) {
  lines.push(`  '${slug}': {`);
  lines.push(`    logoUrl: '${esc(v.logoUrl)}',`);
  lines.push(`    wikiSummary: '${esc(v.wikiSummary)}',`);
  lines.push(`    wikiUrl: '${esc(v.wikiUrl)}',`);
  lines.push(`  },`);
}
lines.push('};');
lines.push('');

writeFileSync(outFile, lines.join('\n'), 'utf8');
console.error('Wrote', outFile);
