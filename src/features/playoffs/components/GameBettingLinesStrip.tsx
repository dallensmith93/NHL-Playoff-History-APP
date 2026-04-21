import type { LivePlayoffGame } from '../types/liveScores';
import type { PartnerGameOddsSummary } from '../services/partnerOddsService';
import { formatAmericanOdds } from '../services/partnerOddsService';

function formatTeamLine(t: PartnerGameOddsSummary['away']): string {
  const ml = t.moneyLine !== undefined ? formatAmericanOdds(t.moneyLine) : '—';
  const pl =
    t.puckLine !== undefined
      ? `${t.puckLine.spread} ${formatAmericanOdds(t.puckLine.odds)}`
      : '—';
  const ou = t.totalSide !== undefined ? `${t.totalSide.label} ${formatAmericanOdds(t.totalSide.odds)}` : '—';
  return `${t.abbrev} ML ${ml} · PL ${pl} · ${ou}`;
}

export function GameBettingLinesStrip({
  games,
  oddsByGameId,
  partnerName,
  partnerSiteUrl,
  oddsUpdatedLabel,
  oddsError,
}: {
  games: LivePlayoffGame[];
  oddsByGameId: Map<number, PartnerGameOddsSummary> | null;
  partnerName: string | null;
  partnerSiteUrl?: string;
  oddsUpdatedLabel: string | null;
  oddsError: string | null;
}) {
  if (games.length === 0) return null;

  return (
    <div className="betting-lines-strip card card-pad playoffs-stack-item">
      <div className="betting-lines-strip-head">
        <p className="betting-lines-strip-title">Game lines (betting)</p>
        <p className="betting-lines-strip-meta muted">
          {partnerName ? (
            <>
              Via {partnerSiteUrl ? (
                <a href={partnerSiteUrl} target="_blank" rel="noreferrer noopener">
                  {partnerName}
                </a>
              ) : (
                partnerName
              )}{' '}
              (US) ·{' '}
            </>
          ) : null}
          {oddsUpdatedLabel ? <>Updated {oddsUpdatedLabel}</> : null}
          {oddsError ? <span className="betting-lines-strip-warn"> · {oddsError}</span> : null}
        </p>
      </div>
      <p className="muted betting-lines-disclaimer">
        For quick reference only. Odds change; confirm with a licensed book where you play.
      </p>
      <div className="betting-lines-grid">
        {games.map((g) => {
          const o = oddsByGameId?.get(g.gamePk);
          const matchup = (
            <span className="betting-lines-matchup">
              {g.awayAbbr} @ {g.homeAbbr}
            </span>
          );
          return (
            <div key={g.gamePk} className="betting-lines-pill">
              {matchup}
              {o ? (
                <span className="betting-lines-detail">
                  <span className="betting-lines-away">{formatTeamLine(o.away)}</span>
                  <span className="betting-lines-home">{formatTeamLine(o.home)}</span>
                </span>
              ) : (
                <span className="muted betting-lines-missing">Lines not in feed for this game yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
