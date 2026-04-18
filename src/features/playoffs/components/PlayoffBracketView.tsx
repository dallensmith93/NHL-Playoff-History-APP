import { useMemo } from 'react';
import type { Franchise } from '../../../types/models';
import type { PlayoffBracket, PlayoffTeamAdvancedStats, SimulatedSeriesResult } from '../../../types/playoffs';
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
}: {
  bracket: PlayoffBracket;
  franchiseBySlug: Map<string, Franchise>;
  statsBySlug: Record<string, PlayoffTeamAdvancedStats>;
  winnerBySeries: Map<string, string>;
  simResultsBySeriesId: Map<string, SimulatedSeriesResult>;
  teamColorAccent: boolean;
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
  };

  const missingLayout = !eastR1 || !eastR2 || !westR1 || !westR2 || !eastCf || !westCf || !finalSeries;

  return (
    <div className="playoff-bracket-section">
      <h2 className="display playoff-bracket-page-title">
        {bracket.seasonLabel} season · {bracket.playoffYear} playoffs
      </h2>
      <p className="muted playoff-bracket-hint">
        Pause on a team row for a quick stat snapshot.
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
                      {...cardProps}
                    />
                  ))}
                </div>
                <BracketConnector kind="r2-cf-east" />
                <div className="playoff-bracket-col playoff-bracket-col--single">
                  <PlayoffSeriesCard
                    series={eastCf!}
                    simResult={simResultsBySeriesId.get(eastCf!.id)}
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
