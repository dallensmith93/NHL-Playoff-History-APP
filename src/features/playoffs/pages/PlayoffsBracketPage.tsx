import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePersistence } from '../../../app/persistence';
import { FRANCHISES } from '../../../data/franchises';
import { getSeriesByIdFromBracket, PLAYOFF_TEAM_ENTRY_BY_SLUG } from '../../../data/playoffBracket2026';
import { PLAYOFF_TEAM_STATS_2026 } from '../../../data/playoffTeamStats2026';
import { DEFAULT_SIMULATION_WEIGHTS } from '../../../data/simulationWeights';
import type { MonteCarloSummary, QuickSimResult } from '../../../types/playoffs';
import type { PlayoffSimModePersisted } from '../../../types/persistence';
import { VisitorRegionNote } from '../../../components/VisitorRegionNote';
import { LiveScoreStrip } from '../components/LiveScoreStrip';
import { PlayoffBracketView } from '../components/PlayoffBracketView';
import { PlayoffScoresByRound } from '../components/PlayoffScoresByRound';
import { PredictionSummary } from '../components/PredictionSummary';
import { TeamOddsTable } from '../components/TeamOddsTable';
import { UpsetAlertsPanel } from '../components/UpsetAlertsPanel';
import { usePlayoffLive } from '../context/PlayoffLiveContext';
import { buildSeriesOverlaysForBracket } from '../utils/mergeBracketWithLive';
import { explainOddsShift } from '../utils/probabilities';
import { buildWinnersMap, resolvePlayoffEntry } from '../utils/seriesTracking';
import {
  buildQuickSimSeriesLines,
  buildSimulationExplanation,
  computeMonteCarloWeightedSeriesPcts,
  computeQuickSimSeriesPcts,
  runMonteCarloFromLiveBracket,
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
          <strong>Live layer:</strong> scores and game states come from the NHL’s public schedule feed (proxied
          same-origin). If the feed fails, the app shows cached data, then falls back to the bracket seed file.
        </li>
        <li>
          <strong>Local math:</strong> pre-game and in-series win percentages are computed in your browser from the
          saved advanced stat profile plus completed games merged into the bracket—no cloud “AI” service.
        </li>
        <li>
          Each full bracket run respects current series wins (e.g. 2–1) before simulating the rest—nothing resets to
          0–0.
        </li>
        <li>
          Monte Carlo mode averages thousands of full playoff runs from that same state for cup and round odds.
        </li>
        <li>
          The short “hello from near…” line uses a general-area lookup from your connection; it does not change the
          bracket math.
        </li>
      </ul>
    </section>
  );
}

function dataStatusMessage(source: string, usedFallback: boolean, error: string | null): string {
  if (source === 'live' && !usedFallback) return 'Live NHL schedule';
  if (source === 'cached') return 'Live data unavailable — showing cached playoff data';
  if (error && usedFallback) return 'Live data unavailable — using seeded bracket until the feed returns';
  return 'Using seeded fallback data';
}

export function PlayoffsBracketPage() {
  const { state, setPlayoffPredictor } = usePersistence();
  const pp = state.playoffPredictor;

  const { bracket, liveGames, liveIndex, source, fetchedAt, error, usedFallback, refresh, loading } =
    usePlayoffLive();

  const seriesById = useMemo(() => getSeriesByIdFromBracket(bracket), [bracket]);

  const liveOverlayBySeriesId = useMemo(
    () => buildSeriesOverlaysForBracket(bracket, liveIndex, source, PLAYOFF_TEAM_ENTRY_BY_SLUG),
    [bracket, liveIndex, source],
  );

  const franchiseBySlug = useMemo(
    () => new Map(FRANCHISES.map((f) => [f.slug, f])),
    [],
  );

  const [quickResult, setQuickResult] = useState<QuickSimResult | null>(null);
  const [mcSummary, setMcSummary] = useState<MonteCarloSummary | null>(null);

  const [mcRunning, setMcRunning] = useState(false);

  /** When live merge changes scores/results, drop stale one-off / Monte runs so the page reflects the feed. */
  const liveDataRevision = useMemo(
    () =>
      bracket.seriesOrder
        .map((id) => {
          const s = seriesById.get(id);
          if (!s) return '';
          const mg = s.mostRecentGame;
          return `${id}:${s.homeWins}-${s.awayWins}:${s.games?.length ?? 0}:${mg?.date ?? ''}:${mg?.gameNumber ?? 0}:${mg?.isFinal ? '1' : '0'}`;
        })
        .join('|'),
    [bracket, seriesById],
  );

  useEffect(() => {
    setQuickResult(null);
    setMcSummary(null);
  }, [liveDataRevision]);

  /** Live bracket winners first so `winnerOf` slots resolve without running a sim. Sim fills series not yet decided in the feed. */
  const bracketWinnerSlugs = useMemo(
    () => buildWinnersMap(bracket, PLAYOFF_TEAM_ENTRY_BY_SLUG),
    [bracket],
  );

  const oddsExplainSnippets = useMemo(() => {
    const winners = bracketWinnerSlugs;
    const rows: { id: string; text: string; sortKey: string }[] = [];
    for (const sid of bracket.seriesOrder) {
      const s = seriesById.get(sid);
      if (!s) continue;
      const h = resolvePlayoffEntry(s.home, winners, PLAYOFF_TEAM_ENTRY_BY_SLUG) ?? undefined;
      const a = resolvePlayoffEntry(s.away, winners, PLAYOFF_TEAM_ENTRY_BY_SLUG) ?? undefined;
      if (!s.mostRecentGame?.isFinal || !h || !a) continue;
      const mg = s.mostRecentGame;
      rows.push({
        id: s.id,
        sortKey: `${mg.date}\u0000${String(mg.gameNumber).padStart(2, '0')}\u0000${sid}`,
        text: explainOddsShift(s, h, a, PLAYOFF_TEAM_STATS_2026),
      });
    }
    rows.sort((x, y) => (x.sortKey < y.sortKey ? 1 : x.sortKey > y.sortKey ? -1 : 0));
    return rows.map(({ id, text }) => ({ id, text }));
  }, [bracketWinnerSlugs, seriesById]);

  const winnerBySeries = useMemo(() => {
    const m = new Map(bracketWinnerSlugs);
    if (quickResult) {
      for (const r of quickResult.seriesResults) {
        if (!m.has(r.seriesId)) m.set(r.seriesId, r.winnerSlug);
      }
    }
    return m;
  }, [bracketWinnerSlugs, quickResult]);

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
      bracket,
      seriesById,
      PLAYOFF_TEAM_STATS_2026,
      DEFAULT_SIMULATION_WEIGHTS,
      rng,
    );
    setQuickResult(result);
    setPlayoffPredictor({
      simulationCount: state.playoffPredictor.simulationCount + 1,
    });
  }, [bracket, seriesById, setPlayoffPredictor, state.playoffPredictor.simulationCount]);

  const runMonte = useCallback(() => {
    setMcRunning(true);
    const it = Math.max(500, Math.min(10_000, pp.monteCarloIterations));
    const rng = Math.random;
    window.setTimeout(() => {
      const summary = runMonteCarloFromLiveBracket(
        bracket,
        seriesById,
        PLAYOFF_TEAM_STATS_2026,
        DEFAULT_SIMULATION_WEIGHTS,
        it,
        rng,
      );
      setMcSummary(summary);
      setPlayoffPredictor({
        simulationCount: state.playoffPredictor.simulationCount + 1,
      });
      setMcRunning(false);
    }, 0);
  }, [
    bracket,
    seriesById,
    pp.monteCarloIterations,
    setPlayoffPredictor,
    state.playoffPredictor.simulationCount,
  ]);

  const reset = useCallback(() => {
    setQuickResult(null);
    setMcSummary(null);
  }, []);

  const quickDisplay = quickResult ? summarizeQuickRunForDisplay(quickResult) : null;

  const quickSimSeriesLines = useMemo(() => {
    if (!quickResult) return [];
    return buildQuickSimSeriesLines(quickResult, seriesById, PLAYOFF_TEAM_ENTRY_BY_SLUG);
  }, [quickResult, seriesById]);

  /** Bracket card % for series with no live games yet — Monte Carlo batch beats single-run when both exist. */
  const simBracketLinePctBySeriesId = useMemo(() => {
    if (mcSummary) return computeMonteCarloWeightedSeriesPcts(mcSummary);
    if (quickResult) return computeQuickSimSeriesPcts(quickResult, seriesById, PLAYOFF_TEAM_ENTRY_BY_SLUG);
    return undefined;
  }, [mcSummary, quickResult, seriesById]);

  const simBracketLineSource: 'monte_carlo' | 'quick' | undefined = mcSummary
    ? 'monte_carlo'
    : quickResult
      ? 'quick'
      : undefined;

  const playoffSlugs = useMemo(() => [...PLAYOFF_TEAM_ENTRY_BY_SLUG.keys()].sort(), []);

  const darkHorse = useMemo(() => {
    if (!mcSummary) return null;
    const pool = mcSummary.teams.filter((t) => t.cupPct >= 1 && t.cupPct <= 12);
    if (!pool.length) return null;
    return pool.reduce((a, b) => (a.cupPct < b.cupPct ? a : b));
  }, [mcSummary]);

  const lastUpdatedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div className="playoffs-bracket-page">
      <LiveScoreStrip games={liveGames} />

      <div className="page-hero">
        <h1>{bracket.title}</h1>
        <p className="lede">
          Live tracker and local bracket math for the <strong>{bracket.seasonLabel}</strong> Stanley Cup Playoffs.
          Scores sync from the public NHL schedule when available; win probabilities and simulations stay on your
          device.
        </p>
        <VisitorRegionNote style={{ marginTop: '0.65rem', maxWidth: '42rem' }} />
      </div>

      <section className="card card-pad" style={{ marginBottom: '1rem' }}>
        <div className="playoffs-live-status-row">
          <div>
            <h2 className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
              Live schedule sync
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
              Last updated: <strong>{lastUpdatedLabel}</strong>
              {loading ? ' · updating…' : null}
            </p>
            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
              {dataStatusMessage(source, usedFallback, error)}{error && usedFallback ? ` (${error})` : null}
            </p>
          </div>
          <div className="playoffs-live-status-actions">
            <button type="button" className="btn" onClick={() => void refresh()} disabled={loading}>
              Refresh now
            </button>
            <label className="playoffs-auto-refresh-label">
              <input
                type="checkbox"
                checked={pp.playoffLiveAutoRefresh !== false}
                onChange={(e) => setPlayoffPredictor({ playoffLiveAutoRefresh: e.target.checked })}
              />
              Auto-refresh scores (about every 5s while live, else ~10–14s)
            </label>
          </div>
        </div>
      </section>

      <PlayoffScoresByRound bracket={bracket} winnerBySeries={winnerBySeries} />

      <section className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.2rem', margin: '0 0 0.75rem' }}>
          Champion picker
        </h2>
        <div
          className="filters-row playoffs-champion-controls"
          style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}
        >
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
        <div className="playoffs-champion-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={runQuick}>
            Pick a champion (one run)
          </button>
          <button type="button" className="btn" onClick={runMonte} disabled={mcRunning}>
            {mcRunning ? 'Working through the runs…' : 'Run a bunch and average'}
          </button>
          <button type="button" className="btn" onClick={reset}>
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
          {quickSimSeriesLines.length > 0 ? (
            <>
              <h3 className="display" style={{ fontSize: '1rem', margin: '0.85rem 0 0.35rem' }}>
                This run — matchups & model series lines
              </h3>
              <p className="muted" style={{ margin: '0 0 0.55rem', fontSize: '0.82rem' }}>
                Each row is the pairing as of this run, the model&apos;s pre-series win probability for the
                favorite, then the simulated score (winner in parentheses).
              </p>
              <ul className="quick-sim-series-lines">
                {quickSimSeriesLines.map((line) => (
                  <li key={line.seriesId}>
                    <span className="quick-sim-series-lines-round">{line.roundLabel}</span>
                    <span className="quick-sim-series-lines-matchup">
                      {line.homeAbbr} vs {line.awayAbbr}
                    </span>
                    <span className="muted"> · Favorite {line.favoriteAbbr} ~{line.favoriteSeriesWinPct.toFixed(1)}%</span>
                    <span>
                      {' '}
                      · {line.homeWins}-{line.awayWins}
                    </span>
                    <span className="muted">
                      {' '}
                      ({line.winnerAbbr} wins{line.upset ? ', upset' : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
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
          {mcSummary.seriesMatchupBreakdown.length > 0 ? (
            <>
              <h3 className="display" style={{ fontSize: '1.02rem', margin: '0.85rem 0 0.35rem' }}>
                Matchups & model lines by bracket slot
              </h3>
              <p className="muted" style={{ margin: '0 0 0.65rem', fontSize: '0.82rem' }}>
                For each series position, every pairing that showed up in this batch, how often it occurred, and the
                average pre-series favorite % (the &quot;line&quot;) across runs where that matchup happened — so you
                can compare possible future series side by side.
              </p>
              <div className="mc-matchup-breakdown">
                {mcSummary.seriesMatchupBreakdown.map((slot) => (
                  <div key={slot.seriesId} className="mc-matchup-slot">
                    <h4 className="mc-matchup-slot-title">{slot.roundLabel}</h4>
                    <div className="mc-matchup-table-wrap">
                      <table className="mc-matchup-table">
                        <thead>
                          <tr>
                            <th scope="col">Matchup</th>
                            <th scope="col">% of runs</th>
                            <th scope="col">Avg favorite %</th>
                            <th scope="col">Avg home (A) %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slot.options.map((opt) => (
                            <tr key={opt.matchupKey}>
                              <td>{opt.matchupLabel}</td>
                              <td>{opt.frequencyPct.toFixed(1)}%</td>
                              <td>{opt.avgFavoriteSeriesWinPct.toFixed(1)}%</td>
                              <td>{opt.avgTeamAPct.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <TeamOddsTable mcSummary={mcSummary} franchiseBySlug={franchiseBySlug} />
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

      {oddsExplainSnippets.length > 0 ? (
        <section className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
            Why the lines moved (updates when games go final)
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.9rem' }} className="muted">
            {oddsExplainSnippets.map((x) => (
              <li key={x.id} style={{ marginBottom: '0.45rem' }}>
                {x.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <UpsetAlertsPanel bracket={bracket} teamEntryBySlug={PLAYOFF_TEAM_ENTRY_BY_SLUG} />

      <PredictionSummary
        quick={quickResult}
        monte={mcSummary}
        darkHorseDisplayName={
          darkHorse ? franchiseBySlug.get(darkHorse.franchiseSlug)?.currentDisplayName : null
        }
      />

      <PlayoffBracketView
        bracket={bracket}
        franchiseBySlug={franchiseBySlug}
        statsBySlug={PLAYOFF_TEAM_STATS_2026}
        winnerBySeries={winnerBySeries}
        simResultsBySeriesId={simResultsBySeriesId}
        teamColorAccent={pp.bracketAutoTheme}
        liveOverlayBySeriesId={liveOverlayBySeriesId}
        simBracketLinePctBySeriesId={simBracketLinePctBySeriesId}
        simBracketLineSource={simBracketLineSource}
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
