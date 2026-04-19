import type { MonteCarloSummary, QuickSimResult } from '../../../types/playoffs';
import { PLAYOFF_TEAM_ENTRY_BY_SLUG } from '../../../data/playoffBracket2026';

export function exportPredictionSummary(params: {
  quick: QuickSimResult | null;
  monte: MonteCarloSummary | null;
  iterations?: number;
  darkHorseDisplayName?: string | null;
}): string {
  const lines: string[] = ['2026 Stanley Cup Playoffs — bracket prediction (this app, local math)'];
  if (params.quick) {
    const ch = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(params.quick.championSlug)?.displayName ?? params.quick.championSlug;
    lines.push(`Single run champion: ${ch}`);
  }
  if (params.monte) {
    const best = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(params.monte.mostLikelyChampionSlug)?.displayName;
    const top = params.monte.teams[0];
    lines.push(
      `Monte Carlo (${params.iterations ?? params.monte.iterations} runs) — most likely Cup: ${best ?? params.monte.mostLikelyChampionSlug}`,
    );
    if (top) {
      lines.push(`Top Cup odds in this batch: ${top.displayName} ${top.cupPct.toFixed(1)}%`);
    }
    const fm = params.monte.mostLikelyFinalMatchup;
    if (fm.pct > 0 && fm.teamA && fm.teamB) {
      const a = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(fm.teamA)?.displayName ?? fm.teamA;
      const b = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(fm.teamB)?.displayName ?? fm.teamB;
      lines.push(
        `Most common Final pairing in this batch: ${a} vs ${b} (${(fm.pct * 100).toFixed(1)}%)`,
      );
    }
  }
  if (params.darkHorseDisplayName) {
    lines.push(`Dark horse called out in the UI: ${params.darkHorseDisplayName}`);
  }
  lines.push('');
  lines.push(
    'Copy and share this text. Odds use saved team priors plus any completed games merged from the live schedule when available.',
  );
  return lines.join('\n');
}
