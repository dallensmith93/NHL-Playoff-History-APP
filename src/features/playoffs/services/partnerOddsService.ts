import { nhleWebPath } from './nhlStatsUrl';

/** Single row from DraftKings (or other partner) embedded in the NHL Web API. */
interface RawOddsEntry {
  description?: string;
  value?: number;
  qualifier?: string;
}

interface RawPartnerTeam {
  abbrev?: string;
  odds?: RawOddsEntry[];
}

interface RawPartnerGame {
  gameId?: number;
  gameType?: number;
  startTimeUTC?: string;
  homeTeam?: RawPartnerTeam;
  awayTeam?: RawPartnerTeam;
}

interface RawPartnerPayload {
  lastUpdatedUTC?: string;
  bettingPartner?: { name?: string; siteUrl?: string };
  games?: RawPartnerGame[];
}

export interface TeamBettingDisplay {
  abbrev: string;
  /** American odds for regulation two-way ML when present. */
  moneyLine?: number;
  /** Puck line, e.g. spread -1.5 at +150. */
  puckLine?: { spread: string; odds: number };
  /** Over or under total segment from the feed, e.g. O6.5 at +114. */
  totalSide?: { label: string; odds: number };
}

export interface PartnerGameOddsSummary {
  gameId: number;
  away: TeamBettingDisplay;
  home: TeamBettingDisplay;
}

export interface PartnerOddsFetchResult {
  byGameId: Map<number, PartnerGameOddsSummary>;
  partnerName: string;
  partnerSiteUrl?: string;
  lastUpdatedUTC: string;
}

function pickMoneyLine2Way(entries: RawOddsEntry[] | undefined): number | undefined {
  if (!entries) return undefined;
  const twoWay = entries.filter((e) => String(e.description ?? '') === 'MONEY_LINE_2_WAY');
  const main = twoWay.find((e) => String(e.qualifier ?? '') === '');
  const v = main?.value ?? twoWay[0]?.value;
  if (v === undefined || v === null || !Number.isFinite(Number(v))) return undefined;
  return Number(v);
}

function pickPuckLine(entries: RawOddsEntry[] | undefined): { spread: string; odds: number } | undefined {
  if (!entries) return undefined;
  const row = entries.find((e) => String(e.description ?? '') === 'PUCK_LINE');
  if (!row || row.value === undefined || row.value === null) return undefined;
  const spread = String(row.qualifier ?? '').trim();
  if (!spread) return undefined;
  return { spread, odds: Number(row.value) };
}

function pickTotalSide(entries: RawOddsEntry[] | undefined): { label: string; odds: number } | undefined {
  if (!entries) return undefined;
  const row = entries.find((e) => String(e.description ?? '') === 'OVER_UNDER');
  if (!row || row.value === undefined || row.value === null) return undefined;
  const q = String(row.qualifier ?? '').trim();
  if (!q) return undefined;
  return { label: q, odds: Number(row.value) };
}

function mapTeam(team: RawPartnerTeam | undefined): TeamBettingDisplay {
  const abbrev = String(team?.abbrev ?? '').toUpperCase();
  const odds = team?.odds;
  return {
    abbrev,
    moneyLine: pickMoneyLine2Way(odds),
    puckLine: pickPuckLine(odds),
    totalSide: pickTotalSide(odds),
  };
}

function parsePayload(data: unknown): PartnerOddsFetchResult {
  const p = data as RawPartnerPayload;
  const map = new Map<number, PartnerGameOddsSummary>();
  for (const g of p.games ?? []) {
    const id = g.gameId;
    if (typeof id !== 'number' || !Number.isFinite(id)) continue;
    if (g.gameType !== undefined && g.gameType !== 3) continue;
    const away = mapTeam(g.awayTeam);
    const home = mapTeam(g.homeTeam);
    if (!away.abbrev || !home.abbrev) continue;
    map.set(id, { gameId: id, away, home });
  }
  return {
    byGameId: map,
    partnerName: String(p.bettingPartner?.name ?? 'NHL partner'),
    partnerSiteUrl: p.bettingPartner?.siteUrl,
    lastUpdatedUTC: String(p.lastUpdatedUTC ?? new Date().toISOString()),
  };
}

export function formatAmericanOdds(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n);
  if (r > 0) return `+${r}`;
  return String(r);
}

/**
 * NHL-published partner lines (moneyline, puck line, total) for the US market.
 * Same-origin in dev via `/nhle-web` proxy; production uses Netlify `nhle-web` function.
 */
export async function fetchPartnerGameOdds(
  countryCode: 'US' | 'CA' = 'US',
  signal?: AbortSignal,
): Promise<PartnerOddsFetchResult> {
  const url = nhleWebPath(`/v1/partner-game/${countryCode}/now`);
  const res = await fetch(url, {
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`partner odds ${res.status}`);
  const data = (await res.json()) as unknown;
  return parsePayload(data);
}
