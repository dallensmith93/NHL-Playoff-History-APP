/**
 * Fetches postseason (gameTypeId=3) team seasons from api.nhle.com and writes
 * src/data/franchisePlayoffAppearancesNhle.generated.ts
 *
 * Run: node scripts/generate-franchise-playoffs-nhle.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NHLE_CONFIG, seasonIdToLabel, seasonLabelStartYear } from './nhl-franchise-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/franchisePlayoffAppearancesNhle.generated.ts');

const UA = { 'User-Agent': 'NHL-Franchise-History-App/1.0 (local dataset; educational)' };

/** @param {number} seasonId */
function seasonIdStartYear(seasonId) {
  return Math.floor(seasonId / 10000);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function fetchAllPlayoffRows(teamId) {
  const rows = [];
  let start = 0;
  const limit = 100;
  while (true) {
    const cayenne = encodeURIComponent(`teamId=${teamId} and gameTypeId=3`);
    const url = `https://api.nhle.com/stats/rest/en/team/summary?limit=${limit}&start=${start}&sort=seasonId&dir=ASC&cayenneExp=${cayenne}`;
    const j = await fetchJson(url);
    for (const row of j.data ?? []) rows.push(row);
    if (!j.data?.length || rows.length >= (j.total ?? 0)) break;
    start += limit;
  }
  return rows;
}

function rowToPlayoffAppearance(row) {
  const season = seasonIdToLabel(row.seasonId);
  const w = row.wins ?? 0;
  const l = row.losses ?? 0;
  const gp = row.gamesPlayed ?? w + l;
  return {
    season,
    roundReached: 'Stanley Cup Playoffs',
    result: `${w}-${l} (${gp} GP)`,
  };
}

function filterByEra(rows, cfg) {
  let out = rows;
  if (cfg.seasonFrom) {
    const minY = seasonLabelStartYear(cfg.seasonFrom);
    out = out.filter((r) => seasonIdStartYear(r.seasonId) >= minY);
  }
  if (cfg.seasonTo) {
    const maxY = seasonLabelStartYear(cfg.seasonTo);
    out = out.filter((r) => seasonIdStartYear(r.seasonId) <= maxY);
  }
  return out;
}

function dedupeBySeason(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.seasonId)) m.set(r.seasonId, r);
  }
  return [...m.values()].sort((a, b) => a.seasonId - b.seasonId);
}

async function main() {
  const teamList = (await fetchJson('https://api.nhle.com/stats/rest/en/team')).data ?? [];
  const byFranchise = new Map();
  for (const t of teamList) {
    const fid = t.franchiseId;
    if (!byFranchise.has(fid)) byFranchise.set(fid, []);
    byFranchise.get(fid).push(t.id);
  }

  /** @type {Record<string, ReturnType<typeof rowToPlayoffAppearance>[]>} */
  const out = {};

  for (const [slug, cfg] of Object.entries(NHLE_CONFIG)) {
    let teamIds = [];
    if (cfg.teamIds?.length) teamIds = cfg.teamIds;
    else if (cfg.franchiseId != null) teamIds = byFranchise.get(cfg.franchiseId) ?? [];

    if (!teamIds.length) {
      console.warn(`No team ids for ${slug}`);
      out[slug] = [];
      continue;
    }

    const all = [];
    for (const tid of teamIds) {
      const rows = await fetchAllPlayoffRows(tid);
      all.push(...rows);
    }
    const merged = dedupeBySeason(all);
    const filtered = filterByEra(merged, cfg);
    out[slug] = filtered.map(rowToPlayoffAppearance);
    console.warn(`${slug}: ${out[slug].length} playoff years`);
  }

  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = [
    '/**',
    ' * AUTO-GENERATED — run `npm run generate:nhle-playoffs`.',
    ' * Postseason appearances from NHL Edge Stats API (team summary, gameTypeId=3).',
    ' * Union-merged into franchise playoff lists (curated wins on same season); see franchises.ts.',
    ' */',
    "import type { PlayoffAppearanceRecord } from '../types/models';",
    '',
    'export const FRANCHISE_PLAYOFF_APPEARANCES_NHLE: Record<string, PlayoffAppearanceRecord[]> = {',
  ];

  const slugs = Object.keys(out).sort();
  for (const slug of slugs) {
    const rows = out[slug];
    lines.push(`  '${slug}': [`);
    for (const r of rows) {
      lines.push(
        `    { season: '${esc(r.season)}', roundReached: '${esc(r.roundReached)}', result: '${esc(r.result)}' },`,
      );
    }
    lines.push(`  ],`);
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.warn(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
