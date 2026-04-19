import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FranchiseLogo, type FranchiseLogoSize } from '../../../components/FranchiseLogo';
import type { Franchise } from '../../../types/models';
import type {
  PlayoffSeries,
  PlayoffTeamAdvancedStats,
  SimulatedSeriesResult,
} from '../../../types/playoffs';
import type { SeriesLiveOverlay } from '../types/liveScores';
import { resolveBracketSide } from '../utils/bracketResolve';
import { explainOddsShift } from '../utils/probabilities';
import { formatSeriesScore, getProbabilityDelta } from '../utils/seriesTracking';
import { getUpsetAlert, labelUpset } from '../utils/upsetAlerts';

function statSummary(stats: PlayoffTeamAdvancedStats | undefined): string {
  if (!stats) return 'No saved stat snapshot for this team.';
  return [
    `Points pace ${(stats.pointsPct * 100).toFixed(1)}%`,
    `Shot quality share ${(stats.xGoalsPct * 100).toFixed(1)}%`,
    `Goals vs allowed (per game) ${stats.goalDiffPerGame >= 0 ? '+' : ''}${stats.goalDiffPerGame.toFixed(2)}`,
    `Goaltending ${(stats.goalieStrength * 100).toFixed(0)}`,
    `Late-season form ${(stats.recentForm * 100).toFixed(0)}`,
  ].join(' · ');
}

function TbdAvatar({ size }: { size: FranchiseLogoSize }) {
  return (
    <div
      className={`franchise-logo franchise-logo--${size} playoff-bracket-tbd`}
      style={{ '--logo-accent': 'var(--muted)' } as CSSProperties}
      aria-hidden
    >
      <span className="franchise-logo-fallback">?</span>
    </div>
  );
}

function TeamRow({
  franchise,
  seedLabel,
  abbr,
  slug,
  isWinner,
  stats,
  teamColorAccent,
  wins,
  logoSize,
}: {
  franchise: Franchise | undefined;
  seedLabel?: string;
  abbr: string;
  slug?: string;
  isWinner: boolean;
  stats?: PlayoffTeamAdvancedStats;
  teamColorAccent: boolean;
  wins: number;
  logoSize: FranchiseLogoSize;
}) {
  const accent = teamColorAccent && franchise ? franchise.colors.primary : undefined;
  const row = (
    <div
      title={statSummary(stats)}
      className={`playoff-bracket-team-row${isWinner ? ' playoff-bracket-team-row--winner' : ''}`}
      style={{
        borderLeftWidth: accent ? 3 : 1,
        borderLeftStyle: 'solid',
        borderLeftColor: accent ?? 'transparent',
      }}
    >
      <span className="playoff-bracket-logo-wrap">
        {franchise ? (
          <FranchiseLogo franchise={franchise} size={logoSize} className="playoff-bracket-franchise-logo" />
        ) : (
          <TbdAvatar size={logoSize} />
        )}
      </span>
      <div className="playoff-bracket-team-meta">
        <div className="playoff-bracket-team-line">
          {seedLabel ? (
            <span className="playoff-bracket-seed muted">{seedLabel}</span>
          ) : (
            <span className="playoff-bracket-seed muted">—</span>
          )}
          <span className="playoff-bracket-abbr">{abbr}</span>
        </div>
        {franchise ? (
          <div className="playoff-bracket-name muted">{franchise.currentDisplayName}</div>
        ) : (
          <div className="playoff-bracket-name muted">TBD</div>
        )}
      </div>
      <span className="playoff-bracket-wins-wrap">
        <span className="playoff-bracket-wins-label muted" aria-hidden>
          W
        </span>
        <span className="playoff-bracket-wins" aria-label={`${wins} wins in series`}>
          {wins}
        </span>
      </span>
    </div>
  );

  if (slug && franchise) {
    return (
      <Link
        to={`/franchises/${franchise.slug}`}
        className="playoff-bracket-team-link"
      >
        {row}
      </Link>
    );
  }
  return row;
}

function shortLastScore(
  series: PlayoffSeries,
  homeAbbr: string,
  awayAbbr: string,
): string | null {
  const g = series.mostRecentGame;
  if (!g) return null;
  return `${homeAbbr} ${g.homeScore}–${awayAbbr} ${g.awayScore}`;
}

export function PlayoffSeriesCard({
  series,
  winnerBySeries,
  franchiseBySlug,
  statsBySlug,
  simResult,
  teamColorAccent,
  liveOverlay,
}: {
  series: PlayoffSeries;
  winnerBySeries: Map<string, string>;
  franchiseBySlug: Map<string, Franchise>;
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>;
  simResult?: SimulatedSeriesResult;
  teamColorAccent: boolean;
  liveOverlay?: SeriesLiveOverlay;
}) {
  const home = resolveBracketSide(series.home, winnerBySeries).entry;
  const away = resolveBracketSide(series.away, winnerBySeries).entry;

  /** Merged live schedule updates `series` wins; a stale quick-sim snapshot must not mask real results. */
  const mergedGamesPlayed = series.homeWins + series.awayWins;
  const useMergedWins =
    mergedGamesPlayed > 0 || series.mostRecentGame !== undefined || series.winnerFranchiseSlug !== undefined;
  const displayHomeWins = useMergedWins ? series.homeWins : (simResult?.homeWins ?? series.homeWins);
  const displayAwayWins = useMergedWins ? series.awayWins : (simResult?.awayWins ?? series.awayWins);

  const wSlug =
    series.winnerFranchiseSlug ?? simResult?.winnerSlug ?? winnerBySeries.get(series.id);

  const statusLabel =
    series.status === 'complete'
      ? 'Complete'
      : series.status === 'in_progress'
        ? 'Live'
        : 'Upcoming';

  const isFinal = series.conference === 'Final';
  const logoSize: FranchiseLogoSize = isFinal ? 'md' : 'xs';

  const hist = series.probabilityHistory ?? [];
  const prevPair = hist.length >= 2 ? hist[hist.length - 2] : undefined;
  const cur = series.currentSeriesProbability;
  const delta = getProbabilityDelta(cur, prevPair);

  const homeE = home ?? undefined;
  const awayE = away ?? undefined;
  const upsetKind = getUpsetAlert(series, series.preSeriesProbability, series.mostRecentGame, homeE, awayE);
  const upsetLabel = labelUpset(upsetKind);

  const ha = home?.abbr ?? '—';
  const aa = away?.abbr ?? '—';
  const bothKnown = !!(home && away);

  const arrowA = delta.teamA > 0.35 ? '↑' : delta.teamA < -0.35 ? '↓' : '';
  const arrowB = delta.teamB > 0.35 ? '↑' : delta.teamB < -0.35 ? '↓' : '';
  const showDelta = hist.length >= 2;
  const deltaAStr = showDelta && Math.abs(delta.teamA) >= 0.25 ? `${delta.teamA > 0 ? '+' : ''}${delta.teamA.toFixed(0)}` : '';
  const deltaBStr = showDelta && Math.abs(delta.teamB) >= 0.25 ? `${delta.teamB > 0 ? '+' : ''}${delta.teamB.toFixed(0)}` : '';

  const scoreLine = bothKnown
    ? formatSeriesScore(series, home ?? undefined, away ?? undefined)
    : 'Matchup TBD';
  const lastShort = bothKnown ? shortLastScore(series, ha, aa) : null;

  return (
    <div className={`playoff-bracket-matchup${isFinal ? ' playoff-bracket-matchup--final' : ''}`}>
      <div className="playoff-bracket-matchup-label muted">
        <span className="playoff-bracket-matchup-label-text">
          {series.roundLabel}
          {series.conference !== 'Final' ? ` · ${series.conference}` : ''}
        </span>
      </div>
      <div className="playoff-bracket-teams">
        <TeamRow
          franchise={home ? franchiseBySlug.get(home.franchiseSlug) : undefined}
          seedLabel={home?.seedLabel}
          abbr={ha}
          slug={home?.franchiseSlug}
          isWinner={!!home && wSlug === home.franchiseSlug}
          stats={home ? statsBySlug[home.franchiseSlug] : undefined}
          teamColorAccent={teamColorAccent}
          wins={displayHomeWins}
          logoSize={logoSize}
        />
        <TeamRow
          franchise={away ? franchiseBySlug.get(away.franchiseSlug) : undefined}
          seedLabel={away?.seedLabel}
          abbr={aa}
          slug={away?.franchiseSlug}
          isWinner={!!away && wSlug === away.franchiseSlug}
          stats={away ? statsBySlug[away.franchiseSlug] : undefined}
          teamColorAccent={teamColorAccent}
          wins={displayAwayWins}
          logoSize={logoSize}
        />
      </div>

      {liveOverlay?.bracketStatusLabel === 'Live' ? (
        <p className="playoff-live-badge-line">
          <span className="live-score-badge live-score-badge--live">Live</span>
        </p>
      ) : null}
      {liveOverlay?.primaryLine ? <p className="playoff-live-primary muted">{liveOverlay.primaryLine}</p> : null}
      {liveOverlay?.nextGameLine ? (
        <p className="playoff-live-next muted" style={{ fontSize: '0.82rem' }}>
          {liveOverlay.nextGameLine}
        </p>
      ) : null}

      {bothKnown ? (
        <div className="playoff-track-compact">
          <p className="playoff-track-summary muted">{scoreLine}</p>
          {series.mostRecentGame?.isFinal ? (
            <p className="playoff-track-final-score" aria-label="Most recent game final score">
              Final
              {series.mostRecentGame.gameNumber ? ` · Game ${series.mostRecentGame.gameNumber}` : ''}:{' '}
              <strong>
                {ha} {series.mostRecentGame.homeScore}–{series.mostRecentGame.awayScore} {aa}
              </strong>
            </p>
          ) : lastShort ? (
            <p className="playoff-track-last muted">
              Last: <span className="playoff-track-last-score">{lastShort}</span>
            </p>
          ) : null}
          <p
            className="playoff-track-odds"
            aria-label="Series win probability"
            title={explainOddsShift(series, homeE, awayE, statsBySlug)}
          >
            <span
              className={`playoff-track-odds-team${arrowA === '↑' ? ' playoff-track-odds--up' : ''}${arrowA === '↓' ? ' playoff-track-odds--down' : ''}`}
            >
              {ha} {cur.teamA_pct.toFixed(0)}%{arrowA}
              {deltaAStr ? <span className="muted"> ({deltaAStr})</span> : null}
            </span>
            <span className="playoff-track-odds-sep muted"> · </span>
            <span
              className={`playoff-track-odds-team${arrowB === '↑' ? ' playoff-track-odds--up' : ''}${arrowB === '↓' ? ' playoff-track-odds--down' : ''}`}
            >
              {aa} {cur.teamB_pct.toFixed(0)}%{arrowB}
              {deltaBStr ? <span className="muted"> ({deltaBStr})</span> : null}
            </span>
          </p>
          <div className="playoff-track-split" role="presentation" aria-hidden>
            <span
              className="playoff-track-split-a"
              style={{ flexGrow: Math.max(1, cur.teamA_pct) }}
            />
            <span
              className="playoff-track-split-b"
              style={{ flexGrow: Math.max(1, cur.teamB_pct) }}
            />
          </div>
        </div>
      ) : null}

      <div className="playoff-bracket-matchup-foot">
        <span>
          Best of {series.winsToWin * 2 - 1} · {displayHomeWins}-{displayAwayWins}
          {simResult ? <span className="muted"> (run)</span> : null}
        </span>
        <span className="muted">· {liveOverlay?.bracketStatusLabel ?? statusLabel}</span>
        {simResult?.upset ? <span className="playoff-bracket-upset-badge">Upset</span> : null}
        {upsetLabel && upsetKind !== 'none' ? (
          <span className="playoff-bracket-upset-badge">{upsetLabel}</span>
        ) : null}
      </div>
      {simResult && wSlug ? (
        <div className="playoff-bracket-sim-winner muted">
          Run winner: <strong>{franchiseBySlug.get(wSlug)?.currentDisplayName ?? wSlug}</strong>
        </div>
      ) : null}
    </div>
  );
}
