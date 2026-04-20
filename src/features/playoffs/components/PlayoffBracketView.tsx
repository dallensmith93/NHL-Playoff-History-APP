import { useMemo } from 'react';
import type { Franchise } from '../../../types/models';
import type { PlayoffBracket, PlayoffTeamAdvancedStats, SimulatedSeriesResult } from '../../../types/playoffs';
import type { SeriesLiveOverlay } from '../types/liveScores';
import { BracketConnector } from './BracketConnector';
import { PlayoffSeriesCard } from './PlayoffSeriesCard';

function sliceBracketRounds(bracket: PlayoffBracket) {
  const eastR1 = bracket.rounds.find(
    (r) => r.conference === 'Eastern' && r.series[0]?.round === 'first',
  );
  const eastR2 = bracket.rounds.find(
    (r) => r.conference === 'Eastern' && r.series[0]?.round === 'second',
  );
  const westR1 = bracket.rounds.find(
    (r) => r.conference === 'Western' && r.series[0]?.round === 'first',
  );
  const westR2 = bracket.rounds.find(
    (r) => r.conference === 'Western' && r.series[0]?.round === 'second',
  );
  const allSeries = bracket.rounds.flatMap((r) => r.series);
  const eastCf = allSeries.find((s) => s.round === 'conference_final' && s.conference === 'Eastern');
  const westCf = allSeries.find((s) => s.round === 'conference_final' && s.conference === 'Western');
  const finalSeries = allSeries.find((s) => s.round === 'cup_final');
  return { eastR1, eastR2, westR1, westR2, eastCf, westCf, finalSeries };
}

export function PlayoffBracketView({
  bracket,
  franchiseBySlug,
  statsBySlug,
  winnerBySeries,
  simResultsBySeriesId,
  teamColorAccent,
  liveOverlayBySeriesId,
  simBracketLinePctBySeriesId,
  simBracketLineSource,
}: {
  bracket: PlayoffBracket;
  franchiseBySlug: Map<string, Franchise>;
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>;
  winnerBySeries: Map<string, string>;
  simResultsBySeriesId: Map<string, SimulatedSeriesResult>;
  teamColorAccent: boolean;
  liveOverlayBySeriesId?: Map<string, SeriesLiveOverlay>;
  /** When set, future series (no live games yet) use these % instead of 50–50 from the static bracket. */
  simBracketLinePctBySeriesId?: Map<string, { teamA_pct: number; teamB_pct: number }>;
  simBracketLineSource?: 'monte_carlo' | 'quick';
}) {
  const { eastR1, eastR2, westR1, westR2, eastCf, westCf, finalSeries } = useMemo(
    () => sliceBracketRounds(bracket),
    [bracket],
  );

  const cardProps = {
    franchiseBySlug,
    statsBySlug,
    winnerBySeries,
    teamColorAccent,
    simBracketLinePctBySeriesId,
    simBracketLineSource,
  };

  const missingLayout = !eastR1 || !eastR2 || !westR1 || !westR2 || !eastCf || !westCf || !finalSeries;

  return (
    <div className="playoff-bracket-section">
      <h2 className="display playoff-bracket-page-title">
        {bracket.seasonLabel} season · {bracket.playoffYear} playoffs
      </h2>
      <p className="muted playoff-bracket-hint">
        Series odds use the app’s saved regular-season profile and any completed games merged from the live schedule
        when available.{' '}
        {simBracketLinePctBySeriesId && simBracketLinePctBySeriesId.size > 0
          ? simBracketLineSource === 'monte_carlo'
            ? 'Slots without any games played yet show the weighted Monte Carlo line from your last batch.'
            : 'Slots without any games played yet show the model line from your last single run.'
          : null}{' '}
        Hover a probability line for a short template explanation; hover a team row for stat detail.
      </p>

      {missingLayout ? (
        <p className="muted">
          Something’s missing in the saved bracket: we need a full East and West side, both conference finals, and
          the Stanley Cup Final.
        </p>
      ) : (
        <div className="playoff-bracket-frame">
          <div className="playoff-bracket-row" role="region" aria-label="Stanley Cup Playoffs bracket diagram">
            <div className="playoff-bracket-half playoff-bracket-half--east">
              <h3 className="playoff-bracket-conf-heading">Eastern Conference</h3>
              <div className="playoff-bracket-half-inner">
                <div className="playoff-bracket-col playoff-bracket-col--feed">
                  {eastR1!.series.map((s) => (
                    <PlayoffSeriesCard
                      key={s.id}
                      series={s}
                      simResult={simResultsBySeriesId.get(s.id)}
                      liveOverlay={liveOverlayBySeriesId?.get(s.id)}
                      {...cardProps}
                    />
                  ))}
                </div>
                <BracketConnector kind="r1-r2-east" />
                <div className="playoff-bracket-col playoff-bracket-col--feed playoff-bracket-col--mid">
                  {eastR2!.series.map((s) => (
                    <PlayoffSeriesCard
                      key={s.id}
                      series={s}
                      simResult={simResultsBySeriesId.get(s.id)}
                      liveOverlay={liveOverlayBySeriesId?.get(s.id)}
                      {...cardProps}
                    />
                  ))}
                </div>
                <BracketConnector kind="r2-cf-east" />
                <div className="playoff-bracket-col playoff-bracket-col--single">
                  <PlayoffSeriesCard
                    series={eastCf!}
                    simResult={simResultsBySeriesId.get(eastCf!.id)}
                    liveOverlay={liveOverlayBySeriesId?.get(eastCf!.id)}
                    {...cardProps}
                  />
                </div>
              </div>
            </div>

            <BracketConnector kind="cf-final-east" />

            <div className="playoff-bracket-col playoff-bracket-col--final-wrap">
              <h3 className="playoff-bracket-conf-heading playoff-bracket-conf-heading--center">
                Stanley Cup Final
              </h3>
              <div className="playoff-bracket-col playoff-bracket-col--final">
                <PlayoffSeriesCard
                  series={finalSeries!}
                  simResult={simResultsBySeriesId.get(finalSeries!.id)}
                  liveOverlay={liveOverlayBySeriesId?.get(finalSeries!.id)}
                  {...cardProps}
                />
              </div>
            </div>

            <BracketConnector kind="cf-final-west" />

            <div className="playoff-bracket-half playoff-bracket-half--west">
              <h3 className="playoff-bracket-conf-heading playoff-bracket-conf-heading--west">
                Western Conference
              </h3>
              <div className="playoff-bracket-half-inner">
                <div className="playoff-bracket-col playoff-bracket-col--single">
                  <PlayoffSeriesCard
                    series={westCf!}
                    simResult={simResultsBySeriesId.get(westCf!.id)}
                    liveOverlay={liveOverlayBySeriesId?.get(westCf!.id)}
                    {...cardProps}
                  />
                </div>
                <BracketConnector kind="r2-cf-west" />
                <div className="playoff-bracket-col playoff-bracket-col--feed playoff-bracket-col--mid">
                  {westR2!.series.map((s) => (
                    <PlayoffSeriesCard
                      key={s.id}
                      series={s}
                      simResult={simResultsBySeriesId.get(s.id)}
                      liveOverlay={liveOverlayBySeriesId?.get(s.id)}
                      {...cardProps}
                    />
                  ))}
                </div>
                <BracketConnector kind="r1-r2-west" />
                <div className="playoff-bracket-col playoff-bracket-col--feed">
                  {westR1!.series.map((s) => (
                    <PlayoffSeriesCard
                      key={s.id}
                      series={s}
                      simResult={simResultsBySeriesId.get(s.id)}
                      liveOverlay={liveOverlayBySeriesId?.get(s.id)}
                      {...cardProps}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
