import type { LivePlayoffGame } from '../types/liveScores';

function formatStart(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/** Prefer live, then upcoming (scheduled), then recent finals. Include unknown so we never hide a game. */
function sortStripGames(games: LivePlayoffGame[]): LivePlayoffGame[] {
  const rank = (g: LivePlayoffGame) =>
    g.state === 'live' ? 0 : g.state === 'scheduled' ? 1 : g.state === 'final' ? 2 : g.state === 'unknown' ? 3 : 4;
  return [...games]
    .filter(
      (g) =>
        g.state === 'live' ||
        g.state === 'final' ||
        g.state === 'scheduled' ||
        g.state === 'unknown',
    )
    .sort((a, b) => {
      const rd = rank(a) - rank(b);
      if (rd !== 0) return rd;
      return new Date(a.gameDateUtc).getTime() - new Date(b.gameDateUtc).getTime();
    })
    .slice(0, 20);
}

export function LiveScoreStrip({ games }: { games: LivePlayoffGame[] }) {
  const stripGames = sortStripGames(games);
  if (stripGames.length === 0) return null;

  return (
    <div className="live-score-strip card card-pad" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
      <div className="live-score-strip-inner">
        {stripGames.map((g) => (
          <div key={g.gamePk} className="live-score-pill">
            <span
              className={`live-score-badge${g.state === 'live' ? ' live-score-badge--live' : ''}${g.state === 'scheduled' ? ' live-score-badge--soon' : ''}${g.state === 'unknown' ? ' live-score-badge--unknown' : ''}`}
            >
              {g.state === 'live'
                ? 'Live'
                : g.state === 'final'
                  ? 'Final'
                  : g.state === 'scheduled'
                    ? 'Soon'
                    : g.state === 'unknown'
                      ? 'Game'
                      : g.state}
            </span>
            {g.state === 'scheduled' ? (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-detail muted">Starts {formatStart(g.gameDateUtc)}</span>
              </>
            ) : (
              <>
                <span className="live-score-abbr">{g.awayAbbr}</span>
                <span className="live-score-num">{g.awayScore}</span>
                <span className="live-score-at">@</span>
                <span className="live-score-abbr">{g.homeAbbr}</span>
                <span className="live-score-num">{g.homeScore}</span>
                {g.liveDetailLine ? (
                  <span className="live-score-detail muted">{g.liveDetailLine}</span>
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
