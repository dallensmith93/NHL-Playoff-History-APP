import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FranchiseLogo, type FranchiseLogoSize } from '../../../components/FranchiseLogo';
import type { Franchise } from '../../../types/models';
import type {
  PlayoffSeries,
  PlayoffTeamAdvancedStats,
  SimulatedSeriesResult,
} from '../../../types/playoffs';
import { resolveBracketSide } from '../utils/bracketResolve';

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
        onClick={(e) => e.stopPropagation()}
      >
        {row}
      </Link>
    );
  }
  return row;
}

export function PlayoffSeriesCard({
  series,
  winnerBySeries,
  franchiseBySlug,
  statsBySlug,
  simResult,
  teamColorAccent,
}: {
  series: PlayoffSeries;
  winnerBySeries: Map<string, string>;
  franchiseBySlug: Map<string, Franchise>;
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>;
  simResult?: SimulatedSeriesResult;
  teamColorAccent: boolean;
}) {
  const home = resolveBracketSide(series.home, winnerBySeries).entry;
  const away = resolveBracketSide(series.away, winnerBySeries).entry;
  const wSlug = simResult?.winnerSlug ?? winnerBySeries.get(series.id);

  const displayHomeWins = simResult?.homeWins ?? series.homeWins;
  const displayAwayWins = simResult?.awayWins ?? series.awayWins;

  const statusLabel = simResult
    ? 'Finished (this run)'
    : series.status === 'complete'
      ? 'Complete'
      : series.status === 'in_progress'
        ? 'In progress'
        : 'Upcoming';

  const isFinal = series.conference === 'Final';
  /** Tighter logos in early rounds leave room for full team names. */
  const logoSize: FranchiseLogoSize = isFinal ? 'md' : 'xs';

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
          abbr={home?.abbr ?? 'TBD'}
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
          abbr={away?.abbr ?? 'TBD'}
          slug={away?.franchiseSlug}
          isWinner={!!away && wSlug === away.franchiseSlug}
          stats={away ? statsBySlug[away.franchiseSlug] : undefined}
          teamColorAccent={teamColorAccent}
          wins={displayAwayWins}
          logoSize={logoSize}
        />
      </div>
      <div className="playoff-bracket-matchup-foot">
        <span>
          Best of {series.winsToWin * 2 - 1} · {displayHomeWins}-{displayAwayWins}
          {simResult ? <span className="muted"> (this run)</span> : null}
        </span>
        <span className="muted">· {statusLabel}</span>
        {simResult?.upset ? <span className="playoff-bracket-upset-badge">Upset</span> : null}
      </div>
      {wSlug ? (
        <div className="playoff-bracket-sim-winner muted">
          This run: <strong>{franchiseBySlug.get(wSlug)?.currentDisplayName ?? wSlug}</strong>
        </div>
      ) : null}
    </div>
  );
}
