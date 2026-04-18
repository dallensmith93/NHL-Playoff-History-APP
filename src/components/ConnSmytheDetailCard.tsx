import { Link } from 'react-router-dom';
import type { ConnSmytheWinner, Franchise } from '../types/models';

export function ConnSmytheDetailCard({
  winner,
  franchise,
}: {
  winner: ConnSmytheWinner;
  franchise: Franchise | undefined;
}) {
  return (
    <div
      className="card card-pad"
      style={{
        borderLeft: franchise ? `4px solid ${franchise.colors.primary}` : '4px solid var(--border)',
      }}
    >
      <div className="display" style={{ fontSize: '1.35rem', margin: '0 0 0.35rem' }}>
        {winner.year} · {winner.playerName}
      </div>
      <p className="muted" style={{ margin: '0 0 0.5rem' }}>
        {winner.position ? `${winner.position} · ` : ''}
        {winner.teamName}
        {winner.lostStanleyCupFinal ? (
          <span> · Stanley Cup Final runner-up (won Conn Smythe)</span>
        ) : null}
      </p>
      <p style={{ margin: 0, fontSize: '0.92rem' }}>
        <strong>Franchise link:</strong>{' '}
        {franchise ? (
          <Link to={`/franchises/${franchise.slug}`}>{franchise.currentDisplayName}</Link>
        ) : (
          <span className="muted">No matching franchise page yet for this winner.</span>
        )}
      </p>
      <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
        Conn Smythe Trophy — playoff MVP for the full postseason ending in {winner.year}.
        {winner.lostStanleyCupFinal
          ? ' Only a handful of winners were on the team that lost the Final; this is one of them.'
          : ''}
      </p>
    </div>
  );
}
