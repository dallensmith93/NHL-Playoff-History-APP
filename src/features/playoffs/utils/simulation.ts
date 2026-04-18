import {
  BRACKET_2026_IDS,
  getSeriesById2026,
  PLAYOFF_TEAM_ENTRY_BY_SLUG,
} from '../../../data/playoffBracket2026';
import type {
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

export function calculateTeamStrength(
  s: PlayoffTeamAdvancedStats,
  w: SimulationWeights,
): number {
  const gdN = Math.max(0, Math.min(1, (s.goalDiffPerGame + 0.85) / 1.7));
  const xgaN = Math.max(0, Math.min(1, (3.15 - s.xGaPer60) / 1.05));
  const spec = (s.ppPct + s.pkPct) / 2;
  let score =
    w.xGoalsPct * s.xGoalsPct +
    w.goalDiffPerGame * gdN +
    w.goalieStrength * s.goalieStrength +
    w.specialTeams * spec +
    w.recentForm * s.recentForm +
    w.playoffExperience * s.playoffExperience +
    w.corsiPct * s.corsiPct +
    w.defenseXga * xgaN;
  score *= s.injuryRiskModifier ?? 1;
  return score;
}

/** Home win probability before stochastic draw. */
export function calculateSeriesWinProbability(
  homeSlug: string,
  awaySlug: string,
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>,
  weights: SimulationWeights,
): { homeWinProb: number; strengthHome: number; strengthAway: number } {
  const sh = statsBySlug[homeSlug];
  const sa = statsBySlug[awaySlug];
  if (!sh || !sa) throw new Error(`Missing stats for ${homeSlug} or ${awaySlug}`);
  const strengthHome = calculateTeamStrength(sh, weights) + weights.homeIceBoost;
  const strengthAway = calculateTeamStrength(sa, weights);
  const d = strengthHome - strengthAway;
  const homeWinProb = 1 / (1 + Math.exp(-weights.logisticK * d * 22));
  return {
    homeWinProb: Math.max(0.08, Math.min(0.92, homeWinProb)),
    strengthHome,
    strengthAway,
  };
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
  const w = series.winsToWin;
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
  };
}

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
