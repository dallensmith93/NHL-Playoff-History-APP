import {
  BRACKET_2026_IDS,
  getSeriesById2026,
  PLAYOFF_TEAM_ENTRY_BY_SLUG,
} from '../../../data/playoffBracket2026';
import type {
  MonteCarloMatchupOption,
  MonteCarloSeriesSlotBreakdown,
  MonteCarloSummary,
  MonteCarloTeamRates,
  PlayoffBracket,
  PlayoffSeries,
  PlayoffTeamAdvancedStats,
  PlayoffTeamEntry,
  PlayoffTeamRef,
  QuickSimResult,
  SimulationExplanation,
  SimulationWeights,
  SimulatedSeriesResult,
} from '../../../types/playoffs';
import { calculateSeriesWinProbability } from './seriesProbabilityModel';
import { resolvePlayoffEntry } from './seriesTracking';
import { matchupKey as matchupKeyFromAbbrs } from '../services/nhlTeamMap';

export { calculateTeamStrength, calculateSeriesWinProbability } from './seriesProbabilityModel';

/** One row for the “Last single run” matchup + model series line list. */
export interface QuickSimSeriesLine {
  seriesId: string;
  roundLabel: string;
  homeAbbr: string;
  awayAbbr: string;
  homeWins: number;
  awayWins: number;
  /** Model favorite’s series win probability (same scale as `SimulatedSeriesResult.favoriteWinProb`). */
  favoriteSeriesWinPct: number;
  favoriteAbbr: string;
  winnerAbbr: string;
  upset: boolean;
}

/** Bracket home side series win % from model favorite % and favorite identity. */
export function teamAWinPctFromSimLine(line: QuickSimSeriesLine): number {
  const fav = line.favoriteSeriesWinPct;
  return line.favoriteAbbr === line.homeAbbr ? fav : 100 - fav;
}

/** Weighted average team A % per series slot from a Monte Carlo batch (for bracket cards). */
export function computeMonteCarloWeightedSeriesPcts(
  mc: MonteCarloSummary,
): Map<string, { teamA_pct: number; teamB_pct: number }> {
  const out = new Map<string, { teamA_pct: number; teamB_pct: number }>();
  for (const slot of mc.seriesMatchupBreakdown) {
    let teamA = 0;
    for (const opt of slot.options) {
      teamA += (opt.frequencyPct / 100) * opt.avgTeamAPct;
    }
    const a = Math.max(5, Math.min(95, teamA));
    out.set(slot.seriesId, { teamA_pct: a, teamB_pct: 100 - a });
  }
  return out;
}

/** Single-run team A % per series (for bracket cards when Monte Carlo hasn’t been run). */
export function computeQuickSimSeriesPcts(
  result: QuickSimResult,
  seriesById: Map<string, PlayoffSeries>,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): Map<string, { teamA_pct: number; teamB_pct: number }> {
  const lines = buildQuickSimSeriesLines(result, seriesById, teamEntryBySlug);
  const out = new Map<string, { teamA_pct: number; teamB_pct: number }>();
  for (const line of lines) {
    const raw = teamAWinPctFromSimLine(line);
    const a = Math.max(5, Math.min(95, raw));
    out.set(line.seriesId, { teamA_pct: a, teamB_pct: 100 - a });
  }
  return out;
}

/**
 * Resolve each matchup in bracket order using only winners from earlier games in this run,
 * and attach the pre-simulation model “line” (favorite’s % to win the series).
 */
export function buildQuickSimSeriesLines(
  result: QuickSimResult,
  seriesById: Map<string, PlayoffSeries>,
  teamEntryBySlug: Map<string, PlayoffTeamEntry>,
): QuickSimSeriesLine[] {
  const winners = new Map<string, string>();
  const out: QuickSimSeriesLine[] = [];
  for (const r of result.seriesResults) {
    const s = seriesById.get(r.seriesId);
    if (!s) continue;
    const home = resolvePlayoffEntry(s.home, winners, teamEntryBySlug);
    const away = resolvePlayoffEntry(s.away, winners, teamEntryBySlug);
    if (!home || !away) continue;
    const favSlug = r.upset ? r.loserSlug : r.winnerSlug;
    const favoriteAbbr = teamEntryBySlug.get(favSlug)?.abbr ?? '?';
    const winnerAbbr = teamEntryBySlug.get(r.winnerSlug)?.abbr ?? '?';
    out.push({
      seriesId: r.seriesId,
      roundLabel: s.roundLabel,
      homeAbbr: home.abbr,
      awayAbbr: away.abbr,
      homeWins: r.homeWins,
      awayWins: r.awayWins,
      favoriteSeriesWinPct: r.favoriteWinProb * 100,
      favoriteAbbr,
      winnerAbbr,
      upset: r.upset,
    });
    winners.set(r.seriesId, r.winnerSlug);
  }
  return out;
}

function resolveRef(
  ref: PlayoffTeamRef,
  winners: Map<string, string>,
): PlayoffTeamEntry | null {
  if (ref.type === 'seed') return ref.team;
  const slug = winners.get(ref.seriesId);
  if (!slug) return null;
  return PLAYOFF_TEAM_ENTRY_BY_SLUG.get(slug) ?? null;
}

/** Games the losing team takes (0 … winsToWin − 1); shorter series when the favorite is heavy. */
function sampleLoserWins(winsToWin: number, favoriteWinProb: number, rng: () => number): number {
  const cap = winsToWin - 1;
  if (cap <= 0) return 0;
  const bias = Math.max(0, (favoriteWinProb - 0.5) * 2.2);
  const raw: number[] = [];
  for (let k = 0; k <= cap; k++) {
    raw.push(Math.exp(-bias * k));
  }
  const sum = raw.reduce((a, b) => a + b, 0);
  let roll = rng() * sum;
  for (let k = 0; k <= cap; k++) {
    roll -= raw[k]!;
    if (roll <= 0) return k;
  }
  return cap;
}

function nextGameHomeWinProbFromSeriesProb(
  pSeriesHome: number,
  homeWins: number,
  awayWins: number,
): number {
  const leadAdj = (homeWins - awayWins) * 0.038;
  return Math.max(0.12, Math.min(0.88, 0.5 + (pSeriesHome - 0.5) * 0.42 + leadAdj));
}

export function simulateSeries(
  series: PlayoffSeries,
  winners: Map<string, string>,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  rng: () => number,
): SimulatedSeriesResult {
  const homeT = resolveRef(series.home, winners);
  const awayT = resolveRef(series.away, winners);
  if (!homeT || !awayT) {
    throw new Error(`Cannot resolve series ${series.id}`);
  }

  const w = series.winsToWin;
  if (series.homeWins >= w || series.awayWins >= w) {
    const winHome = series.homeWins >= w;
    const winnerSlug = winHome ? homeT.franchiseSlug : awayT.franchiseSlug;
    const loserSlug = winHome ? awayT.franchiseSlug : homeT.franchiseSlug;
    const { homeWinProb } = calculateSeriesWinProbability(
      homeT.franchiseSlug,
      awayT.franchiseSlug,
      statsBySlug,
      weights,
    );
    const favSlug = homeWinProb >= 0.5 ? homeT.franchiseSlug : awayT.franchiseSlug;
    const favProb = homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb;
    return {
      seriesId: series.id,
      winnerSlug,
      loserSlug,
      homeWins: series.homeWins,
      awayWins: series.awayWins,
      favoriteWinProb: favProb,
      upset: winnerSlug !== favSlug,
    };
  }

  let hw = series.homeWins;
  let aw = series.awayWins;
  const liveGames = series.games?.length ?? 0;
  const hasLiveProgress =
    liveGames > 0 && hw < w && aw < w && series.status !== 'complete';

  if (hasLiveProgress) {
    const pSeriesHome = series.currentSeriesProbability.teamA_pct / 100;
    const { homeWinProb: modelHome } = calculateSeriesWinProbability(
      homeT.franchiseSlug,
      awayT.franchiseSlug,
      statsBySlug,
      weights,
    );
    const alpha = Math.min(1, liveGames / 6);
    const blendedSeriesHome = (1 - alpha) * modelHome + alpha * pSeriesHome;

    while (hw < w && aw < w) {
      const pG = nextGameHomeWinProbFromSeriesProb(blendedSeriesHome, hw, aw);
      if (rng() < pG) hw++;
      else aw++;
    }
    const winHome = hw >= w;
    const winnerSlug = winHome ? homeT.franchiseSlug : awayT.franchiseSlug;
    const loserSlug = winHome ? awayT.franchiseSlug : homeT.franchiseSlug;
    const favSlug = modelHome >= 0.5 ? homeT.franchiseSlug : awayT.franchiseSlug;
    const favProb = modelHome >= 0.5 ? modelHome : 1 - modelHome;
    return {
      seriesId: series.id,
      winnerSlug,
      loserSlug,
      homeWins: hw,
      awayWins: aw,
      favoriteWinProb: favProb,
      upset: winnerSlug !== favSlug,
    };
  }

  const { homeWinProb } = calculateSeriesWinProbability(
    homeT.franchiseSlug,
    awayT.franchiseSlug,
    statsBySlug,
    weights,
  );
  const fav =
    homeWinProb >= 0.5
      ? { slug: homeT.franchiseSlug, prob: homeWinProb }
      : { slug: awayT.franchiseSlug, prob: 1 - homeWinProb };
  const winHome = rng() < homeWinProb;
  const winnerSlug = winHome ? homeT.franchiseSlug : awayT.franchiseSlug;
  const loserSlug = winHome ? awayT.franchiseSlug : homeT.franchiseSlug;
  const upset = winnerSlug !== fav.slug;
  const loserWins = sampleLoserWins(series.winsToWin, fav.prob, rng);
  const homeWins = winHome ? w : loserWins;
  const awayWins = winHome ? loserWins : w;
  return {
    seriesId: series.id,
    winnerSlug,
    loserSlug,
    homeWins,
    awayWins,
    favoriteWinProb: fav.prob,
    upset,
  };
}

/** Fill in scores for quick-sim JSON saved before `homeWins` / `awayWins` existed. */
export function migrateQuickSimResult(
  parsed: QuickSimResult,
  bracket: PlayoffBracket,
  seriesById: Map<string, PlayoffSeries>,
): QuickSimResult {
  const winners = new Map<string, string>();
  const seriesResults: SimulatedSeriesResult[] = [];

  for (const sid of bracket.seriesOrder) {
    const r = parsed.seriesResults.find((x) => x.seriesId === sid);
    if (!r) continue;
    const s = seriesById.get(sid);
    const needsScores =
      typeof (r as Partial<SimulatedSeriesResult>).homeWins !== 'number' ||
      typeof (r as Partial<SimulatedSeriesResult>).awayWins !== 'number';

    let row: SimulatedSeriesResult;
    if (needsScores && s) {
      const tw = s.winsToWin;
      const homeT = resolveRef(s.home, winners);
      const awayT = resolveRef(s.away, winners);
      if (homeT && awayT) {
        const winHome = r.winnerSlug === homeT.franchiseSlug;
        const lw = 2;
        row = {
          ...(r as SimulatedSeriesResult),
          homeWins: winHome ? tw : lw,
          awayWins: winHome ? lw : tw,
        };
      } else {
        row = { ...(r as SimulatedSeriesResult), homeWins: 0, awayWins: 0 };
      }
    } else if (!needsScores) {
      row = r as SimulatedSeriesResult;
    } else {
      row = { ...(r as SimulatedSeriesResult), homeWins: 0, awayWins: 0 };
    }
    seriesResults.push(row);
    winners.set(sid, row.winnerSlug);
  }

  return { ...parsed, seriesResults };
}

export function simulateBracket(
  bracket: PlayoffBracket,
  seriesById: Map<string, PlayoffSeries>,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  rng: () => number,
): QuickSimResult {
  const winners = new Map<string, string>();
  const seriesResults: SimulatedSeriesResult[] = [];

  for (const sid of bracket.seriesOrder) {
    const s = seriesById.get(sid);
    if (!s) continue;
    const r = simulateSeries(s, winners, statsBySlug, weights, rng);
    seriesResults.push(r);
    winners.set(s.id, r.winnerSlug);
  }

  const final = seriesResults.find((x) => x.seriesId === '2026-final');
  if (!final) throw new Error('Missing final series result');

  const ecf = winners.get('2026-e-cf');
  const wcf = winners.get('2026-w-cf');
  if (!ecf || !wcf) throw new Error('Missing conference champions');

  const finalSeries = seriesById.get('2026-final')!;
  const homeF = resolveRef(finalSeries.home, winners)!;
  const awayF = resolveRef(finalSeries.away, winners)!;
  const { homeWinProb } = calculateSeriesWinProbability(
    homeF.franchiseSlug,
    awayF.franchiseSlug,
    statsBySlug,
    weights,
  );
  const champProbForChamp =
    final.winnerSlug === homeF.franchiseSlug ? homeWinProb : 1 - homeWinProb;

  return {
    championSlug: final.winnerSlug,
    easternChampionSlug: ecf,
    westernChampionSlug: wcf,
    seriesResults,
    finalSeriesWinProbForChampion: champProbForChamp,
  };
}

export function runMonteCarlo(
  bracket: PlayoffBracket,
  seriesById: Map<string, PlayoffSeries>,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
  iterations: number,
  rng: () => number,
): MonteCarloSummary {
  const slugs = Object.keys(statsBySlug);
  const cup = new Map<string, number>();
  const finals = new Map<string, number>();
  const cf = new Map<string, number>();
  const finalMatchup = new Map<string, number>();
  /** seriesId → canonical matchup key → counts & sums for averaging */
  const slotAcc = new Map<
    string,
    Map<string, { count: number; sumFav: number; sumTeamA: number; label: string }>
  >();

  for (const s of slugs) {
    cup.set(s, 0);
    finals.set(s, 0);
    cf.set(s, 0);
  }

  for (let i = 0; i < iterations; i++) {
    const run = simulateBracket(bracket, seriesById, statsBySlug, weights, rng);
    cup.set(run.championSlug, (cup.get(run.championSlug) ?? 0) + 1);
    finals.set(run.easternChampionSlug, (finals.get(run.easternChampionSlug) ?? 0) + 1);
    finals.set(run.westernChampionSlug, (finals.get(run.westernChampionSlug) ?? 0) + 1);

    const ecfR = run.seriesResults.find((r) => r.seriesId === BRACKET_2026_IDS.eastCf);
    const wcfR = run.seriesResults.find((r) => r.seriesId === BRACKET_2026_IDS.westCf);
    if (ecfR) {
      cf.set(ecfR.winnerSlug, (cf.get(ecfR.winnerSlug) ?? 0) + 1);
      cf.set(ecfR.loserSlug, (cf.get(ecfR.loserSlug) ?? 0) + 1);
    }
    if (wcfR) {
      cf.set(wcfR.winnerSlug, (cf.get(wcfR.winnerSlug) ?? 0) + 1);
      cf.set(wcfR.loserSlug, (cf.get(wcfR.loserSlug) ?? 0) + 1);
    }

    const key = [run.easternChampionSlug, run.westernChampionSlug].sort().join('|');
    finalMatchup.set(key, (finalMatchup.get(key) ?? 0) + 1);

    const lines = buildQuickSimSeriesLines(run, seriesById, PLAYOFF_TEAM_ENTRY_BY_SLUG);
    for (const line of lines) {
      const mk = matchupKeyFromAbbrs(line.homeAbbr, line.awayAbbr);
      const label = `${line.homeAbbr} vs ${line.awayAbbr}`;
      const teamA = teamAWinPctFromSimLine(line);
      let m = slotAcc.get(line.seriesId);
      if (!m) {
        m = new Map();
        slotAcc.set(line.seriesId, m);
      }
      const cur = m.get(mk);
      if (!cur) {
        m.set(mk, { count: 1, sumFav: line.favoriteSeriesWinPct, sumTeamA: teamA, label });
      } else {
        cur.count += 1;
        cur.sumFav += line.favoriteSeriesWinPct;
        cur.sumTeamA += teamA;
      }
    }
  }

  const seriesMatchupBreakdown: MonteCarloSeriesSlotBreakdown[] = [];
  for (const sid of bracket.seriesOrder) {
    const m = slotAcc.get(sid);
    if (!m || m.size === 0) continue;
    const s = seriesById.get(sid);
    const options: MonteCarloMatchupOption[] = [...m.entries()].map(([matchupKey, v]) => ({
      matchupKey,
      matchupLabel: v.label,
      frequencyPct: (v.count / iterations) * 100,
      avgFavoriteSeriesWinPct: v.sumFav / v.count,
      avgTeamAPct: v.sumTeamA / v.count,
    }));
    options.sort((a, b) => b.frequencyPct - a.frequencyPct);
    seriesMatchupBreakdown.push({
      seriesId: sid,
      roundLabel: s?.roundLabel ?? sid,
      options,
    });
  }

  let bestFinal = { teamA: '', teamB: '', pct: 0 };
  for (const [k, c] of finalMatchup) {
    const pct = c / iterations;
    if (pct > bestFinal.pct) {
      const parts = k.split('|');
      const a = parts[0] ?? '';
      const b = parts[1] ?? '';
      bestFinal = { teamA: a, teamB: b, pct };
    }
  }

  const teams: MonteCarloTeamRates[] = slugs.map((franchiseSlug) => {
    const t = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(franchiseSlug);
    return {
      franchiseSlug,
      displayName: t?.displayName ?? franchiseSlug,
      cupPct: ((cup.get(franchiseSlug) ?? 0) / iterations) * 100,
      finalPct: ((finals.get(franchiseSlug) ?? 0) / iterations) * 100,
      conferenceFinalPct: ((cf.get(franchiseSlug) ?? 0) / iterations) * 100,
    };
  });
  teams.sort((a, b) => b.cupPct - a.cupPct);

  const mostLikelyChampionSlug = [...cup.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  return {
    iterations,
    teams,
    mostLikelyChampionSlug,
    mostLikelyFinalMatchup: bestFinal,
    seriesMatchupBreakdown,
  };
}

/** Alias: Monte Carlo using whatever bracket state you pass (including live-merged). */
export const runMonteCarloFromLiveBracket = runMonteCarlo;

function avgStat(
  slugs: string[],
  stats: Record<string, PlayoffTeamAdvancedStats>,
  pick: keyof PlayoffTeamAdvancedStats,
): number {
  const nums = slugs
    .map((s) => stats[s]?.[pick])
    .filter((v): v is number => typeof v === 'number');
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildSimulationExplanation(
  result: QuickSimResult,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  _weights: SimulationWeights,
): SimulationExplanation {
  const champ = statsBySlug[result.championSlug];
  const pool = Object.keys(statsBySlug);
  const reasons: string[] = [];
  if (champ) {
    const xg = champ.xGoalsPct;
    const xgAvg = avgStat(pool, statsBySlug, 'xGoalsPct');
    if (xg >= xgAvg + 0.02) {
      reasons.push(
        `strong share of scoring chances and shot quality (${(xg * 100).toFixed(1)}% vs about ${(xgAvg * 100).toFixed(1)}% for the playoff field)`,
      );
    }
    const gs = champ.goalieStrength;
    const gsAvg = avgStat(pool, statsBySlug, 'goalieStrength');
    if (gs >= gsAvg + 0.04) {
      reasons.push(`goaltending rated ahead of most clubs in this bracket`);
    }
    const st = (champ.ppPct + champ.pkPct) / 2;
    const stAvg =
      avgStat(pool, statsBySlug, 'ppPct') / 2 + avgStat(pool, statsBySlug, 'pkPct') / 2;
    if (st >= stAvg + 0.015) {
      reasons.push(`power play and penalty kill both strong`);
    }
    const rf = champ.recentForm;
    if (rf >= 0.82) {
      reasons.push(`entered the playoffs playing well down the stretch`);
    }
  }
  if (reasons.length === 0) {
    reasons.push(`no one huge standout stat—just a solid all-around profile compared with the field`);
  }

  const upsets = result.seriesResults.filter((r) => r.upset);
  const biggest = upsets.reduce<SimulatedSeriesResult | undefined>((best, r) => {
    if (!best || r.favoriteWinProb > best.favoriteWinProb) return r;
    return best;
  }, undefined);

  let goalieEdge: string | undefined;
  if (champ && biggest) {
    const w = statsBySlug[biggest.winnerSlug];
    const l = statsBySlug[biggest.loserSlug];
    if (w && l && w.goalieStrength > l.goalieStrength + 0.06) {
      const wt = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(biggest.winnerSlug);
      goalieEdge = `${wt?.displayName ?? biggest.winnerSlug} had the clearer edge in net in this matchup.`;
    }
  }

  const eastT = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(result.easternChampionSlug);
  const westT = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(result.westernChampionSlug);
  const seriesById = getSeriesById2026();
  const upsetSeries = biggest ? seriesById.get(biggest.seriesId) : undefined;
  const upsetRound = upsetSeries
    ? upsetSeries.conference === 'Final'
      ? 'the Final'
      : `${upsetSeries.conference === 'Eastern' ? 'East' : 'West'}, ${upsetSeries.roundLabel.toLowerCase()}`
    : 'that round';

  return {
    championReasons: reasons,
    biggestUpset: biggest
      ? {
          seriesId: biggest.seriesId,
          text: `${PLAYOFF_TEAM_ENTRY_BY_SLUG.get(biggest.winnerSlug)?.displayName ?? biggest.winnerSlug} pulled a surprise in ${upsetRound}. Before the series, the favorite on paper had about a ${(biggest.favoriteWinProb * 100).toFixed(0)}% chance to move on.`,
        }
      : undefined,
    goalieEdge,
    likelyFinalText: `Stanley Cup Final in this run: ${eastT?.displayName ?? 'East winner'} vs ${westT?.displayName ?? 'West winner'}.`,
    pathNote: `Luck still matters—hit the button again and you’ll get a different trip through the bracket.`,
  };
}

export function summarizeQuickRunForDisplay(result: QuickSimResult): {
  championPct: number;
} {
  return { championPct: result.finalSeriesWinProbForChampion * 100 };
}
