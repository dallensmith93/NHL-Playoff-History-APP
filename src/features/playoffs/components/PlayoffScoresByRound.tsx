import type { GameResult, PlayoffBracket, PlayoffSeries } from '../../../types/playoffs';
import { resolveBracketSide } from '../utils/bracketResolve';

function formatGameDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function gameLineText(g: GameResult, homeAbbr: string, awayAbbr: string): string {
  const when = formatGameDate(g.date);
  const head = when ? `Game ${g.gameNumber} · ${when}` : `Game ${g.gameNumber}`;
  return `${head}: ${homeAbbr} ${g.homeScore}–${g.awayScore} ${awayAbbr}`;
}

function SeriesScoresBlock({
  series,
  winnerBySeries,
}: {
  series: PlayoffSeries;
  winnerBySeries: Map<string, string>;
}) {
  const home = resolveBracketSide(series.home, winnerBySeries).entry;
  const away = resolveBracketSide(series.away, winnerBySeries).entry;
  const ha = home?.abbr ?? '…';
  const aa = away?.abbr ?? '…';
  const finals = series.games.filter((g) => g.isFinal);
  const head = `${ha} vs ${aa}`;

  return (
    <div className="playoff-scores-series">
      <div className="playoff-scores-series-head">
        <strong className="playoff-scores-series-matchup">{head}</strong>
        {finals.length > 0 ? (
          <span className="playoff-scores-series-record muted">
            Series {series.homeWins}–{series.awayWins}
          </span>
        ) : null}
      </div>
      {finals.length === 0 ? (
        <p className="playoff-scores-series-empty muted">No completed games in this series yet.</p>
      ) : (
        <ul className="playoff-scores-games-list">
          {finals.map((g) => (
            <li key={`${series.id}-g${g.gameNumber}`} className="playoff-scores-game-line">
              {gameLineText(g, ha, aa)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlayoffScoresByRound({
  bracket,
  winnerBySeries,
}: {
  bracket: PlayoffBracket;
  winnerBySeries: Map<string, string>;
}) {
  const hasAnyFinalGame = bracket.rounds.some((r) =>
    r.series.some((s) => s.games.some((g) => g.isFinal)),
  );

  return (
    <section className="card card-pad playoff-scores-by-round" style={{ marginBottom: '1rem' }}>
      <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.35rem' }}>
        Playoff scores by round
      </h2>
      <p className="muted" style={{ margin: '0 0 0.85rem', fontSize: '0.88rem' }}>
        Final box scores from the live schedule (newest games appear as they finish).{' '}
        {hasAnyFinalGame
          ? 'Matchups without games yet stay in the list so you can follow each round in order.'
          : ''}
      </p>
      {!hasAnyFinalGame ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          No completed playoff games in the feed yet — check back after games go final.
        </p>
      ) : (
        <div className="playoff-scores-rounds">
          {bracket.rounds.map((round) => (
            <div key={round.id} className="playoff-scores-round-block">
              <h3 className="playoff-scores-round-title">{round.label}</h3>
              <div className="playoff-scores-round-inner">
                {round.series.map((s) => (
                  <SeriesScoresBlock key={s.id} series={s} winnerBySeries={winnerBySeries} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
