import { useMemo, useState, useCallback } from 'react';
import { usePersistence } from '../../../app/persistence';
import { FRANCHISES } from '../../../data/franchises';
import {
  getSeriesById2026,
  PLAYOFF_BRACKET_2026,
  PLAYOFF_TEAM_ENTRY_BY_SLUG,
} from '../../../data/playoffBracket2026';
import { PLAYOFF_TEAM_STATS_2026 } from '../../../data/playoffTeamStats2026';
import { DEFAULT_SIMULATION_WEIGHTS } from '../../../data/simulationWeights';
import type { MonteCarloSummary, QuickSimResult } from '../../../types/playoffs';
import type { PlayoffSimModePersisted } from '../../../types/persistence';
import { VisitorRegionNote } from '../../../components/VisitorRegionNote';
import { PlayoffBracketView } from '../components/PlayoffBracketView';
import {
  formatPlayoffSeriesHeadline,
  formatPlayoffSeriesRoundPlain,
  winnerMapFromQuickResult,
} from '../utils/bracketResolve';
import {
  buildSimulationExplanation,
  migrateQuickSimResult,
  runMonteCarlo,
  simulateBracket,
  summarizeQuickRunForDisplay,
} from '../utils/simulation';

function HowPredictorWorks() {
  return (
    <section className="card card-pad" style={{ marginTop: '1.25rem' }}>
      <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
        How the picks are made
      </h2>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.92rem' }} className="muted">
        <li>
          This is a <strong>for-fun bracket toy</strong>, not an official NHL prediction. Team strength numbers are
          saved with the app—the picker does not fetch live stats when you run it.
        </li>
        <li>
          Each club gets a strength score from things like scoring-chance share, goals for and against, special
          teams, goaltending, late-season results, and playoff experience.
        </li>
        <li>
          Every series rolls the dice with the better team more likely to win, but not guaranteed—underdogs can
          still steal one.
        </li>
        <li>
          Run it once for a single story, or run it many times and average the outcomes to see which teams show up
          most often.
        </li>
        <li>
          The short “hello from near…” line on this page uses a general-area lookup from your connection; it does
          not change the bracket math.
        </li>
      </ul>
    </section>
  );
}

export function PlayoffsBracketPage() {
  const { state, setPlayoffPredictor } = usePersistence();
  const pp = state.playoffPredictor;

  const seriesById = useMemo(() => getSeriesById2026(), []);
  const franchiseBySlug = useMemo(
    () => new Map(FRANCHISES.map((f) => [f.slug, f])),
    [],
  );

  const [quickResult, setQuickResult] = useState<QuickSimResult | null>(() => {
    try {
      if (!pp.lastQuickResultJson) return null;
      const parsed = JSON.parse(pp.lastQuickResultJson) as QuickSimResult;
      return migrateQuickSimResult(parsed, PLAYOFF_BRACKET_2026, getSeriesById2026());
    } catch {
      return null;
    }
  });

  const [mcSummary, setMcSummary] = useState<MonteCarloSummary | null>(() => {
    try {
      if (!pp.lastMonteCarloSummaryJson) return null;
      return JSON.parse(pp.lastMonteCarloSummaryJson) as MonteCarloSummary;
    } catch {
      return null;
    }
  });

  const [mcRunning, setMcRunning] = useState(false);

  const winnerBySeries = useMemo(() => {
    if (!quickResult) return new Map<string, string>();
    return winnerMapFromQuickResult(quickResult.seriesResults);
  }, [quickResult]);

  const simResultsBySeriesId = useMemo(() => {
    const m = new Map<string, QuickSimResult['seriesResults'][0]>();
    if (!quickResult) return m;
    for (const r of quickResult.seriesResults) m.set(r.seriesId, r);
    return m;
  }, [quickResult]);

  const explanation = useMemo(() => {
    if (!quickResult) return null;
    return buildSimulationExplanation(quickResult, PLAYOFF_TEAM_STATS_2026, DEFAULT_SIMULATION_WEIGHTS);
  }, [quickResult]);

  const runQuick = useCallback(() => {
    const rng = Math.random;
    const result = simulateBracket(
      PLAYOFF_BRACKET_2026,
      seriesById,
      PLAYOFF_TEAM_STATS_2026,
      DEFAULT_SIMULATION_WEIGHTS,
      rng,
    );
    setQuickResult(result);
    setPlayoffPredictor({
      lastQuickResultJson: JSON.stringify(result),
      simulationCount: state.playoffPredictor.simulationCount + 1,
    });
  }, [seriesById, setPlayoffPredictor, state.playoffPredictor.simulationCount]);

  const runMonte = useCallback(() => {
    setMcRunning(true);
    const it = Math.max(500, Math.min(10_000, pp.monteCarloIterations));
    const rng = Math.random;
    window.setTimeout(() => {
      const summary = runMonteCarlo(
        PLAYOFF_BRACKET_2026,
        seriesById,
        PLAYOFF_TEAM_STATS_2026,
        DEFAULT_SIMULATION_WEIGHTS,
        it,
        rng,
      );
      setMcSummary(summary);
      setPlayoffPredictor({
        lastMonteCarloSummaryJson: JSON.stringify(summary),
        simulationCount: state.playoffPredictor.simulationCount + 1,
      });
      setMcRunning(false);
    }, 0);
  }, [
    seriesById,
    pp.monteCarloIterations,
    setPlayoffPredictor,
    state.playoffPredictor.simulationCount,
  ]);

  const reset = useCallback(() => {
    setQuickResult(null);
    setMcSummary(null);
    setPlayoffPredictor({
      lastQuickResultJson: undefined,
      lastMonteCarloSummaryJson: undefined,
    });
  }, [setPlayoffPredictor]);

  const quickDisplay = quickResult ? summarizeQuickRunForDisplay(quickResult) : null;

  const playoffSlugs = useMemo(() => [...PLAYOFF_TEAM_ENTRY_BY_SLUG.keys()].sort(), []);

  const darkHorse = useMemo(() => {
    if (!mcSummary) return null;
    const pool = mcSummary.teams.filter((t) => t.cupPct >= 1 && t.cupPct <= 12);
    if (!pool.length) return null;
    return pool.reduce((a, b) => (a.cupPct < b.cupPct ? a : b));
  }, [mcSummary]);

  return (
    <div className="playoffs-bracket-page">
      <div className="page-hero">
        <h1>{PLAYOFF_BRACKET_2026.title}</h1>
        <p className="lede">
          Bracket for the <strong>{PLAYOFF_BRACKET_2026.seasonLabel}</strong> season, saved right inside this app.
          Nothing here phones home for scores or updates. Use the buttons below to play out the playoffs with a
          lighthearted, stats-based picker—rerun anytime for a different winner.
        </p>
        <VisitorRegionNote style={{ marginTop: '0.65rem', maxWidth: '42rem' }} />
      </div>

      <section className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>
          Champion picker
        </h2>
        <div className="filters-row" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="field">
            <label htmlFor="pp-mode">How to run it</label>
            <select
              id="pp-mode"
              value={pp.mode}
              onChange={(e) =>
                setPlayoffPredictor({ mode: e.target.value as PlayoffSimModePersisted })
              }
            >
              <option value="quick">One full playoff run</option>
              <option value="monte_carlo">Many runs, then average</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pp-mc-n">Number of runs (many-runs mode)</label>
            <input
              id="pp-mc-n"
              type="number"
              min={500}
              max={10000}
              step={500}
              value={pp.monteCarloIterations}
              onChange={(e) =>
                setPlayoffPredictor({ monteCarloIterations: Number(e.target.value) || 2000 })
              }
              style={{ width: '6rem' }}
            />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={pp.bracketAutoTheme}
                onChange={(e) => setPlayoffPredictor({ bracketAutoTheme: e.target.checked })}
              />
              Show team colors on the edge of each row
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={runQuick}>
            Pick a champion (one run)
          </button>
          <button type="button" className="btn" onClick={runMonte} disabled={mcRunning}>
            {mcRunning ? 'Working through the runs…' : 'Run a bunch and average'}
          </button>
          <button type="button" onClick={reset}>
            Clear saved picks
          </button>
        </div>
        <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
          Times you’ve run the picker (saved in this browser): {pp.simulationCount}
        </p>
      </section>

      {quickResult ? (
        <section className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
            Last single run
          </h2>
          <div className="stat-grid" style={{ marginBottom: '0.75rem' }}>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Champion
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                {franchiseBySlug.get(quickResult.championSlug)?.currentDisplayName ??
                  quickResult.championSlug}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                How strong a favorite they were in the Final (this run)
              </div>
              <div style={{ fontWeight: 700 }}>{quickDisplay?.championPct.toFixed(1)}%</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                East champion
              </div>
              <div style={{ fontWeight: 600 }}>
                {franchiseBySlug.get(quickResult.easternChampionSlug)?.currentDisplayName}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                West champion
              </div>
              <div style={{ fontWeight: 600 }}>
                {franchiseBySlug.get(quickResult.westernChampionSlug)?.currentDisplayName}
              </div>
            </div>
          </div>
          {(() => {
            const f = quickResult.seriesResults.find((r) => r.seriesId === '2026-final');
            if (!f) return null;
            const east = franchiseBySlug.get(quickResult.easternChampionSlug)?.currentDisplayName;
            const west = franchiseBySlug.get(quickResult.westernChampionSlug)?.currentDisplayName;
            return (
              <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                Stanley Cup Final (this run): {east} {f.homeWins}, {west} {f.awayWins}
              </p>
            );
          })()}
        </section>
      ) : null}

      {mcSummary ? (
        <section className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
            After {mcSummary.iterations} full playoff runs
          </h2>
          {mcSummary.mostLikelyFinalMatchup.pct > 0 ? (
            <p style={{ fontSize: '0.88rem' }} className="muted">
              Most common Stanley Cup Final pairing:{' '}
              {franchiseBySlug.get(mcSummary.mostLikelyFinalMatchup.teamA)?.currentDisplayName} vs{' '}
              {franchiseBySlug.get(mcSummary.mostLikelyFinalMatchup.teamB)?.currentDisplayName}{' '}
              (about {(mcSummary.mostLikelyFinalMatchup.pct * 100).toFixed(1)}% of the time)
            </p>
          ) : null}
          <p style={{ fontSize: '0.88rem', marginTop: 0 }} className="muted">
            Team that won the Cup most often:{' '}
            <strong>
              {franchiseBySlug.get(mcSummary.mostLikelyChampionSlug)?.currentDisplayName}
            </strong>
          </p>
          {darkHorse ? (
            <p style={{ fontSize: '0.88rem' }} className="muted">
              Long-shot watch:{' '}
              <strong>{franchiseBySlug.get(darkHorse.franchiseSlug)?.currentDisplayName}</strong> still showed up
              in about {darkHorse.cupPct.toFixed(1)}% of wins in this batch
            </p>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table
              className="playoffs-odds-table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}
            >
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
                  <th style={{ padding: '0.5rem' }}>Team</th>
                  <th style={{ padding: '0.5rem' }}>Win the Cup</th>
                  <th style={{ padding: '0.5rem' }}>Reach the Final</th>
                  <th style={{ padding: '0.5rem' }}>Reach conference final</th>
                </tr>
              </thead>
              <tbody>
                {mcSummary.teams.map((t) => (
                  <tr key={t.franchiseSlug} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.45rem 0.5rem' }}>{t.displayName}</td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div
                          style={{
                            flex: 1,
                            maxWidth: '120px',
                            height: '8px',
                            background: 'var(--surface-2)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, t.cupPct)}%`,
                              height: '100%',
                              background: 'var(--link)',
                            }}
                          />
                        </div>
                        <span>{t.cupPct.toFixed(1)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>{t.finalPct.toFixed(1)}</td>
                    <td style={{ padding: '0.45rem 0.5rem' }}>{t.conferenceFinalPct.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {explanation ? (
        <section className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
            Story from the last single run
          </h2>
          <p style={{ marginTop: 0 }}>
            This run gave the nod to{' '}
            <strong>
              {franchiseBySlug.get(quickResult!.championSlug)?.currentDisplayName}
            </strong>{' '}
            because {explanation.championReasons.slice(0, 3).join('; ')}. {explanation.pathNote}
          </p>
          {explanation.biggestUpset ? (
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Biggest surprise: {explanation.biggestUpset.text}
            </p>
          ) : (
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Every series went to the team that was already favored in this run.
            </p>
          )}
          {explanation.goalieEdge ? (
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              {explanation.goalieEdge}
            </p>
          ) : null}
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
            {explanation.likelyFinalText}
          </p>
        </section>
      ) : null}

      {quickResult ? (
        <section className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
            Round by round (last single run)
          </h2>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
            {quickResult.seriesResults.map((r) => {
              const s = seriesById.get(r.seriesId);
              const headline = s ? formatPlayoffSeriesHeadline(s) : 'Matchup';
              const rd = s ? formatPlayoffSeriesRoundPlain(s) : '';
              return (
                <li key={r.seriesId} style={{ marginBottom: '0.25rem' }}>
                  <span className="muted">{rd}</span>
                  {rd ? ': ' : null}
                  {headline}{' '}
                  <strong>
                    ({r.homeWins}-{r.awayWins})
                  </strong>{' '}
                  → {franchiseBySlug.get(r.winnerSlug)?.currentDisplayName}
                  {r.upset ? ' · upset' : ''}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <PlayoffBracketView
        bracket={PLAYOFF_BRACKET_2026}
        franchiseBySlug={franchiseBySlug}
        statsBySlug={PLAYOFF_TEAM_STATS_2026}
        winnerBySeries={winnerBySeries}
        simResultsBySeriesId={simResultsBySeriesId}
        teamColorAccent={pp.bracketAutoTheme}
      />

      <div className="field" style={{ marginTop: '1rem' }}>
        <label htmlFor="fav-pred">Team you’re rooting for (saved on this device)</label>
        <select
          id="fav-pred"
          value={pp.favoritePredictedTeamSlug ?? ''}
          onChange={(e) =>
            setPlayoffPredictor({
              favoritePredictedTeamSlug: e.target.value || undefined,
            })
          }
        >
          <option value="">—</option>
          {playoffSlugs.map((s) => (
            <option key={s} value={s}>
              {franchiseBySlug.get(s)?.currentDisplayName}
            </option>
          ))}
        </select>
      </div>

      <HowPredictorWorks />
    </div>
  );
}
