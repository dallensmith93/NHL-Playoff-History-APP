import type { LivePlayoffGame } from '../types/liveScores';
import { useTodayStripGames } from '../hooks/useTodayStripGames';
import { formatGameStartDetails } from '../utils/formatGameTime';
import { overtimeLabel } from '../utils/liveGameLabels';

function badgeLabel(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') return 'Soon';
  if (g.state === 'final') return 'Final';
  return 'Live';
}

function badgeClass(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') return ' live-score-badge--soon';
  if (g.state === 'final') return ' live-score-badge--final';
  return ' live-score-badge--live';
}

export function LiveScoreStrip({ games }: { games: LivePlayoffGame[] }) {
  const stripGames = useTodayStripGames(games);

  if (stripGames.length === 0) return null;

  return (
    <div className="live-score-strip card card-pad" style={{ marginBottom: '1rem' }}>
      <p className="live-score-strip-heading muted" style={{ margin: '0 0 0.45rem', fontSize: '0.78rem' }}>
        Today&apos;s games (your local date) · Final stays on the strip until midnight
      </p>
      <div className="live-score-strip-inner">
        {stripGames.map((g) => (
          <div key={g.gamePk} className="live-score-pill">
            <span className={`live-score-badge${badgeClass(g)}`}>{badgeLabel(g)}</span>
            {g.state !== 'scheduled' && overtimeLabel(g) ? (
              <span
                className="live-score-badge live-score-badge--ot"
                title={g.isShootout ? 'Shootout' : 'Overtime'}
              >
                {overtimeLabel(g)}
              </span>
            ) : null}
            {g.state === 'scheduled' ? (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-detail muted">Starts {formatGameStartDetails(g.gameDateUtc)}</span>
                {g.tvStations && g.tvStations.length > 0 ? (
                  <span className="live-score-detail muted">TV: {g.tvStations.join(', ')}</span>
                ) : null}
              </>
            ) : (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-num">{g.awayScore}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-num">{g.homeScore}</span>
                {g.liveDetailLine ? <span className="live-score-detail muted">{g.liveDetailLine}</span> : null}
                {g.tvStations && g.tvStations.length > 0 ? (
                  <span className="live-score-detail muted">TV: {g.tvStations.join(', ')}</span>
                ) : null}
                {(g.state === 'live' || g.state === 'unknown') &&
                (g.inIntermission || (g.clockTimeRemaining !== undefined && g.clockTimeRemaining !== '')) ? (
                  <span className="live-score-clock" title={g.inIntermission ? 'Intermission' : 'Time remaining'}>
                    {g.inIntermission ? 'INT' : g.clockTimeRemaining}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
