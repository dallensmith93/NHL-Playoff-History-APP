/**
 * End-of-regular-season division champions from NHL Web API standings
 * (`/v1/standings/{standingsEnd}` per season from `/v1/standings-season`).
 *
 * A team is a division champion when `divisionSequence === 1` while `divisionsInUse`
 * is true for that season (NHL structure; 1967–68 onward in this API).
 *
 * Run: node scripts/generate-franchise-division-titles-nhl.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NHLE_CONFIG, seasonIdToLabel, seasonLabelStartYear } from './nhl-franchise-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/franchiseDivisionTitlesNhl.generated.ts');

const UA = { 'User-Agent': 'NHL-Franchise-History-App/1.0 (local dataset; educational)' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugAllowsYear(slug, yearStart) {
  const cfg = NHLE_CONFIG[slug];
  if (!cfg) return false;
  const from = cfg.seasonFrom ? seasonLabelStartYear(cfg.seasonFrom) : -9999;
  const to = cfg.seasonTo ? seasonLabelStartYear(cfg.seasonTo) : 9999;
  return yearStart >= from && yearStart <= to;
}

function buildTeamIdToSlug() {
  /** @type {Record<number, string>} */
  const m = {};
  for (const [slug, cfg] of Object.entries(NHLE_CONFIG)) {
    if (cfg.teamIds?.length) {
      for (const tid of cfg.teamIds) m[tid] = slug;
    }
  }
  return m;
}

function buildFranchiseRules() {
  /** @type {{ franchiseId: number; slug: string; seasonFrom: number | null; seasonTo: number | null }[]} */
  const rules = [];
  for (const [slug, cfg] of Object.entries(NHLE_CONFIG)) {
    if (cfg.franchiseId != null) {
      rules.push({
        franchiseId: cfg.franchiseId,
        slug,
        seasonFrom: cfg.seasonFrom ? seasonLabelStartYear(cfg.seasonFrom) : null,
        seasonTo: cfg.seasonTo ? seasonLabelStartYear(cfg.seasonTo) : null,
      });
    }
  }
  return rules;
}

/**
 * @param {string} triCode
 * @param {number} seasonId
 * @param {Map<string, { id: number; franchiseId: number }[]>} teamsByTri
 * @param {Record<number, string>} teamIdToSlug
 * @param {{ franchiseId: number; slug: string; seasonFrom: number | null; seasonTo: number | null }[]} franchiseRules
 */
function triCodeToSlug(triCode, seasonId, teamsByTri, teamIdToSlug, franchiseRules) {
  const label = seasonIdToLabel(seasonId);
  const y = seasonLabelStartYear(label);
  const candidates = teamsByTri.get(triCode) ?? [];
  if (!candidates.length) {
    console.warn(`Unknown triCode in standings: ${triCode} (${label})`);
    return null;
  }

  for (const t of candidates) {
    const sid = teamIdToSlug[t.id];
    if (sid && slugAllowsYear(sid, y)) return sid;
  }

  const fid = candidates[0].franchiseId;
  const matches = franchiseRules.filter((r) => r.franchiseId === fid);
  for (const r of matches) {
    const from = r.seasonFrom ?? -9999;
    const to = r.seasonTo ?? 9999;
    if (y >= from && y <= to) return r.slug;
  }
  if (matches.length === 1 && matches[0].seasonFrom == null && matches[0].seasonTo == null) {
    return matches[0].slug;
  }
  return null;
}

async function main() {
  const teamList = (await fetch('https://api.nhle.com/stats/rest/en/team', { headers: UA }).then((r) =>
    r.json(),
  )).data ?? [];

  /** @type {Map<string, { id: number; franchiseId: number }[]>} */
  const teamsByTri = new Map();
  for (const t of teamList) {
    const code = t.triCode;
    if (!teamsByTri.has(code)) teamsByTri.set(code, []);
    teamsByTri.get(code).push({ id: t.id, franchiseId: t.franchiseId });
  }

  const teamIdToSlug = buildTeamIdToSlug();
  const franchiseRules = buildFranchiseRules();

  const seasonIndex = await fetch('https://api-web.nhle.com/v1/standings-season', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  }).then((r) => r.json());

  /** @type {Record<string, { season: string; division: string; conference?: string }[]>} */
  const bySlug = {};
  for (const slug of Object.keys(NHLE_CONFIG)) bySlug[slug] = [];

  const seasons = seasonIndex.seasons ?? [];
  let n = 0;
  for (const meta of seasons) {
    if (!meta.divisionsInUse) continue;
    const date = meta.standingsEnd;
    await sleep(30);
    const res = await fetch(`https://api-web.nhle.com/v1/standings/${date}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) {
      console.warn(`standings ${date}: ${res.status}`);
      continue;
    }
    const j = await res.json();
    const rows = j.standings ?? [];
    const champs = rows.filter((r) => r.divisionSequence === 1);
    const seasonLabel = seasonIdToLabel(rows[0]?.seasonId ?? meta.id);

    for (const row of champs) {
      const abbrev = row.teamAbbrev?.default;
      if (!abbrev) continue;
      const slug = triCodeToSlug(abbrev, row.seasonId, teamsByTri, teamIdToSlug, franchiseRules);
      if (!slug) continue;
      const division = row.divisionName ?? '';
      const conference = row.conferenceName || undefined;
      bySlug[slug].push({ season: seasonLabel, division, conference });
    }
    n++;
    if (n % 20 === 0) console.warn(`… ${n} seasons fetched`);
  }

  for (const slug of Object.keys(bySlug)) {
    const arr = bySlug[slug];
    const seen = new Set();
    bySlug[slug] = arr.filter((r) => {
      if (seen.has(r.season)) return false;
      seen.add(r.season);
      return true;
    });
    bySlug[slug].sort((a, b) => seasonLabelStartYear(a.season) - seasonLabelStartYear(b.season));
  }

  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = [
    '/**',
    ' * AUTO-GENERATED — run `npm run generate:nhle-divisions`.',
    ' * Division regular-season champions: NHL Web API `/v1/standings/{standingsEnd}`',
    ' * with `divisionSequence === 1` when `divisionsInUse` for that season.',
    ' * Replaces hand-entered division title lists in the app build (see franchises.ts).',
    ' */',
    "import type { DivisionTitleRecord } from '../types/models';",
    '',
    'export const FRANCHISE_DIVISION_TITLES_NHL: Record<string, DivisionTitleRecord[]> = {',
  ];

  for (const slug of Object.keys(NHLE_CONFIG).sort()) {
    const rows = bySlug[slug] ?? [];
    lines.push(`  '${slug}': [`);
    for (const r of rows) {
      const conf = r.conference ? `, conference: '${esc(r.conference)}'` : '';
      lines.push(
        `    { season: '${esc(r.season)}', division: '${esc(r.division)}'${conf} },`,
      );
    }
    lines.push(`  ],`);
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.warn(`Wrote ${OUT} (${seasons.filter((s) => s.divisionsInUse).length} division-era seasons scanned)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
