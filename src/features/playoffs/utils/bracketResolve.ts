import { PLAYOFF_TEAM_ENTRY_BY_SLUG } from '../../../data/playoffBracket2026';
import type { PlayoffSeries, PlayoffTeamEntry, PlayoffTeamRef } from '../../../types/playoffs';

export function resolveBracketSide(
  ref: PlayoffTeamRef,
  winnerBySeries: Map<string, string>,
): { entry: PlayoffTeamEntry | null; tbdFrom?: string } {
  if (ref.type === 'seed') return { entry: ref.team };
  const slug = winnerBySeries.get(ref.seriesId);
  if (!slug) return { entry: null, tbdFrom: ref.seriesId };
  const entry = PLAYOFF_TEAM_ENTRY_BY_SLUG.get(slug);
  return { entry: entry ?? null };
}

/** Build winner map from a quick sim (series id → winning franchise slug). */
export function winnerMapFromQuickResult(seriesResults: { seriesId: string; winnerSlug: string }[]): Map<string, string> {
  return new Map(seriesResults.map((r) => [r.seriesId, r.winnerSlug]));
}

/** Short "BUF vs BOS" label; TBD slots shown as … */
export function formatPlayoffSeriesHeadline(s: PlayoffSeries): string {
  const a = s.home.type === 'seed' ? s.home.team.abbr : '…';
  const b = s.away.type === 'seed' ? s.away.team.abbr : '…';
  return `${a} vs ${b}`;
}

export function formatPlayoffSeriesRoundPlain(s: PlayoffSeries): string {
  if (s.conference === 'Final') return 'Stanley Cup Final';
  const conf = s.conference === 'Eastern' ? 'East' : 'West';
  if (s.round === 'first') return `${conf}, first round`;
  if (s.round === 'second') return `${conf}, second round`;
  if (s.round === 'conference_final') return `${conf}, conference final`;
  return s.roundLabel;
}
