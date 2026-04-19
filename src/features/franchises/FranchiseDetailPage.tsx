import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePersistence } from '../../app/persistence';
import {
  getConnSmytheForFranchise,
  getConnSmytheSummaryForFranchise,
  getFranchiseBySlug,
  getKnownFranchiseIds,
} from '../../data/franchises';
import { FranchiseLineageSection } from '../../components/FranchiseLineageSection';
import { LineageLinks } from '../../components/LineageLinks';
import { FranchiseLogo } from '../../components/FranchiseLogo';
import { StatBlock } from '../../components/StatBlock';
import { StatsSnapshot } from '../../components/StatsSnapshot';
import { TeamThemedSurface } from '../../components/TeamThemedSurface';
import { resolveFranchiseColors } from '../../lib/branding';
import { formatSeasonRange, parseSeasonStartYear } from '../../lib/format';
import { computeFranchiseStats, computeIdentityWindowStats } from '../../lib/franchiseStats';
import { getCurrentIdentity, hasMultipleIdentities } from '../../lib/franchiseIdentity';
import { formatIdentityTransition } from '../../lib/identityLabels';
import { validateFranchise } from '../../lib/franchiseValidation';
import type { Franchise } from '../../types/models';
import type { PlayoffTeamEntry } from '../../types/playoffs';
import {
  PLAYOFF_BRACKET_2026,
  PLAYOFF_TEAM_ENTRY_BY_SLUG,
} from '../../data/playoffBracket2026';
import {
  buildWinnersMap,
  findSeriesForFranchiseSlug,
  formatSeriesScore,
  getLastGameSummary,
  resolvePlayoffEntry,
} from '../playoffs/utils/seriesTracking';

export function FranchiseDetailPage() {
  const { slug } = useParams();
  const { state, setLastViewedSlug, toggleFavorite, setTeamNote } = usePersistence();
  const [ready, setReady] = useState(false);

  const franchise = slug ? getFranchiseBySlug(slug) : undefined;

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, [slug]);

  useEffect(() => {
    if (franchise) setLastViewedSlug(franchise.slug);
  }, [franchise, setLastViewedSlug]);

  const stats = useMemo(
    () => (franchise ? computeFranchiseStats(franchise) : undefined),
    [franchise],
  );

  const currentIdentity = useMemo(
    () => (franchise ? getCurrentIdentity(franchise) : undefined),
    [franchise],
  );

  const identityStats = useMemo(() => {
    if (!franchise || !currentIdentity) return undefined;
    return computeIdentityWindowStats(franchise, currentIdentity);
  }, [franchise, currentIdentity]);

  const headerColors = useMemo(
    () => (franchise ? resolveFranchiseColors(franchise, currentIdentity) : null),
    [franchise, currentIdentity],
  );

  const validation = useMemo(() => {
    if (!franchise) return [];
    return validateFranchise(franchise, getKnownFranchiseIds());
  }, [franchise]);

  const connSmytheSummary = useMemo(
    () => (franchise ? getConnSmytheSummaryForFranchise(franchise.id) : null),
    [franchise],
  );

  const connWinners = useMemo(() => {
    if (!franchise) return [];
    return [...getConnSmytheForFranchise(franchise.id)].sort((a, b) => b.year - a.year);
  }, [franchise]);

  const winners2026 = useMemo(
    () => buildWinnersMap(PLAYOFF_BRACKET_2026, PLAYOFF_TEAM_ENTRY_BY_SLUG),
    [],
  );

  const playoff2026Series = useMemo(() => {
    if (!franchise) return undefined;
    return findSeriesForFranchiseSlug(PLAYOFF_BRACKET_2026, franchise.slug, PLAYOFF_TEAM_ENTRY_BY_SLUG);
  }, [franchise]);

  const playoff2026Sides = useMemo((): {
    home: PlayoffTeamEntry | null;
    away: PlayoffTeamEntry | null;
  } => {
    if (!playoff2026Series) return { home: null, away: null };
    return {
      home: resolvePlayoffEntry(playoff2026Series.home, winners2026, PLAYOFF_TEAM_ENTRY_BY_SLUG),
      away: resolvePlayoffEntry(playoff2026Series.away, winners2026, PLAYOFF_TEAM_ENTRY_BY_SLUG),
    };
  }, [playoff2026Series, winners2026]);

  const playoff2026Opponent = useMemo(() => {
    if (!franchise || !playoff2026Series) return undefined;
    const { home, away } = playoff2026Sides;
    if (home?.franchiseSlug === franchise.slug) return away;
    if (away?.franchiseSlug === franchise.slug) return home;
    return undefined;
  }, [franchise, playoff2026Series, playoff2026Sides]);

  const note = franchise ? (state.teamNotes[franchise.id] ?? '') : '';

  if (!ready) {
    return (
      <div className="empty card card-pad">
        <h2>Loading</h2>
        <p className="muted">Preparing franchise view…</p>
      </div>
    );
  }

  if (!franchise || !stats || !headerColors) {
    return (
      <div className="empty card card-pad">
        <h2>Franchise not found</h2>
        <p className="muted">
          No team matches that address. Try the franchise list or pick another link.
        </p>
        <Link to="/franchises" className="btn" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
          Back to franchises
        </Link>
      </div>
    );
  }

  const fav = state.favorites.includes(franchise.id);
  const multi = hasMultipleIdentities(franchise);

  return (
    <TeamThemedSurface colors={headerColors}>
      <div className="team-header">
        <div className="team-header-top">
          <div className="team-header-brand">
            <FranchiseLogo franchise={franchise} size="lg" />
            <div className="team-header-brand-text">
              <h1>{franchise.currentDisplayName}</h1>
              <p className="sub">{franchise.franchiseName}</p>
              <p className="sub" style={{ fontWeight: 500 }}>
                {franchiseStatusLabel(franchise)} ·{' '}
                {formatSeasonRange(franchise.firstSeason, franchise.lastSeason)}
              </p>
              {currentIdentity && (
                <p className="sub" style={{ fontWeight: 500 }}>
                  Header colors: <strong>{currentIdentity.fullName}</strong> identity
                  {currentIdentity.eraColors ? ' (era palette)' : ''}
                </p>
              )}
              {franchise.currentConference && (
                <p className="sub" style={{ fontWeight: 500 }}>
                  {franchise.currentConference}
                  {franchise.currentDivision ? ` · ${franchise.currentDivision}` : ''}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={
                {
                  '--btn-a': headerColors.primary,
                  '--btn-b': headerColors.secondary,
                  '--btn-fg': headerColors.onPrimary,
                } as CSSProperties
              }
              onClick={() => toggleFavorite(franchise.id)}
            >
              {fav ? 'Remove favorite' : 'Add favorite'}
            </button>
            <Link to="/compare" className="btn">
              Compare franchises
            </Link>
          </div>
        </div>
        {franchise.wikipediaUrl && (
          <p className="muted" style={{ margin: '0.85rem 0 0', fontSize: '0.82rem' }}>
            Logo and overview text are sourced from{' '}
            <a href={franchise.wikipediaUrl} target="_blank" rel="noreferrer">
              English Wikipedia
            </a>{' '}
            (Wikimedia images; team marks are trademarks of their owners).
          </p>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Franchise entity &amp; current identity
        </h2>
        <p style={{ margin: '0 0 0.35rem' }}>
          <strong>Continuous franchise:</strong> {franchise.franchiseName} — one charter across every
          identity era below (renames, relocations, rebrands share trophy history unless you split rows
          intentionally).
        </p>
        {currentIdentity ? (
          <p style={{ margin: 0 }}>
            <strong>Current identity:</strong> {currentIdentity.fullName} ·{' '}
            {formatSeasonRange(currentIdentity.fromSeason, currentIdentity.toSeason)}
            {currentIdentity.transitionFromPrior && (
              <>
                {' '}
                ·{' '}
                <span className="muted">
                  arrived via {formatIdentityTransition(currentIdentity.transitionFromPrior)}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No identity eras are listed for this franchise yet.
          </p>
        )}
        {!multi && (
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.88rem' }}>
            Single identity era — lifetime totals and “current window” totals match.
          </p>
        )}
      </div>

      <LineageLinks franchise={franchise} />

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <FranchiseLineageSection franchise={franchise} />
      </div>

      {franchise.historySummary && (
        <div className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
            History summary
          </h2>
          <p style={{ margin: 0 }}>{franchise.historySummary}</p>
        </div>
      )}

      {franchise.wikiSummary && (
        <div className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
            Wikipedia snapshot
          </h2>
          <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.88rem' }}>
            Auto-synced excerpt for quick context; team names and marks are trademarks of their owners.
          </p>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{franchise.wikiSummary}</p>
          {franchise.wikipediaUrl && (
            <p style={{ margin: '0.75rem 0 0' }}>
              <a href={franchise.wikipediaUrl} target="_blank" rel="noreferrer">
                Read on Wikipedia →
              </a>
            </p>
          )}
        </div>
      )}

      {franchise.historicalNotes && (
        <div
          className="card card-pad"
          style={{ marginBottom: '1rem', borderLeft: '4px solid var(--muted)' }}
        >
          <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
            Historical notes
          </h2>
          <p style={{ margin: 0 }}>{franchise.historicalNotes}</p>
        </div>
      )}

      {import.meta.env.DEV && validation.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: '1rem' }}>
          <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
            Data checks (dev only)
          </h2>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
            {validation.map((issue, i) => (
              <li key={`${issue.code}-${i}`} style={{ marginBottom: '0.35rem' }}>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      issue.severity === 'error'
                        ? '#b00020'
                        : issue.severity === 'warn'
                          ? '#8a5a00'
                          : 'var(--muted)',
                  }}
                >
                  {issue.severity}:
                </span>{' '}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="card card-pad"
        style={{
          marginBottom: '1rem',
          borderLeft: `4px solid ${franchise.colors.primary}`,
        }}
      >
        <h2 className="display" style={{ margin: '0 0 0.75rem' }}>
          By the numbers
        </h2>
        <StatsSnapshot
          title="Full franchise history (every era)"
          stats={stats}
          subtitle="Playoffs, finals, and Cups across the whole timeline."
        />
        {multi && identityStats && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <StatsSnapshot
              title={`Current identity window — ${currentIdentity?.fullName ?? ''}`}
              stats={identityStats}
              subtitle="Only seasons in this identity’s date range."
            />
          </div>
        )}
      </div>

      {playoff2026Series ? (
        <div className="card card-pad playoff-franchise-tracker" style={{ marginBottom: '1rem' }}>
          <h3 className="display" style={{ margin: '0 0 0.35rem' }}>
            2026 Stanley Cup Playoffs (local tracker)
          </h3>
          <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
            Box scores and win odds are seeded in the app—there is no live NHL connection.
          </p>
          <p style={{ margin: '0 0 0.35rem' }}>
            <Link to="/playoffs/2026-bracket">Open full bracket</Link>
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span className="muted">Series: </span>
            {playoff2026Sides.home?.abbr ?? '…'} vs {playoff2026Sides.away?.abbr ?? '…'}
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span className="muted">Opponent: </span>
            {playoff2026Opponent ? (
              <Link to={`/franchises/${playoff2026Opponent.franchiseSlug}`}>{playoff2026Opponent.displayName}</Link>
            ) : (
              'TBD'
            )}
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            {formatSeriesScore(
              playoff2026Series,
              playoff2026Sides.home ?? undefined,
              playoff2026Sides.away ?? undefined,
            )}
          </p>
          {getLastGameSummary(
            playoff2026Series.mostRecentGame,
            playoff2026Sides.home ?? undefined,
            playoff2026Sides.away ?? undefined,
          ) ? (
            <p style={{ margin: '0 0 0.5rem' }} className="muted">
              {getLastGameSummary(
                playoff2026Series.mostRecentGame,
                playoff2026Sides.home ?? undefined,
                playoff2026Sides.away ?? undefined,
              )}
            </p>
          ) : null}
          <p style={{ margin: '0 0 0.35rem' }}>
            <span className="muted">Win probability (model + games): </span>
            {playoff2026Sides.home?.abbr ?? '—'} {playoff2026Series.currentSeriesProbability.teamA_pct.toFixed(0)}% ·{' '}
            {playoff2026Sides.away?.abbr ?? '—'} {playoff2026Series.currentSeriesProbability.teamB_pct.toFixed(0)}%
          </p>
          {(playoff2026Series.probabilityHistory?.length ?? 0) > 1 ? (
            <div className="playoff-franchise-spark" aria-hidden>
              {(playoff2026Series.probabilityHistory ?? []).map((h, i) => (
                <div key={`${h.gameNumber}-${i}`} className="playoff-franchise-spark-col" title={`${playoff2026Sides.home?.abbr ?? 'Home'} ${h.teamA_pct.toFixed(0)}%`}>
                  <div
                    className="playoff-franchise-spark-bar"
                    style={{ height: `${Math.max(8, h.teamA_pct)}%` }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid-cards" style={{ marginBottom: '1rem' }}>
        <div
          className="card card-pad"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
            Playoff appearances
          </h3>
          {franchise.playoffAppearances.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No playoff appearances listed yet.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', maxHeight: '220px', overflow: 'auto' }}>
              {[...franchise.playoffAppearances]
                .sort((a, b) => parseSeasonStartYear(b.season) - parseSeasonStartYear(a.season))
                .map((p) => (
                  <li key={`${p.season}-${p.roundReached ?? ''}-${p.result ?? ''}`}>
                    <strong>{p.season}</strong>
                    {p.roundReached ? ` · ${p.roundReached}` : ''}
                    {p.result ? ` · ${p.result}` : ''}
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div
          className="card card-pad"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
            Division titles
          </h3>
          {franchise.divisionTitles.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No division-title rows yet.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {franchise.divisionTitles.map((d) => (
                <li key={d.season}>
                  <strong>{d.season}</strong>
                  {d.division ? ` · ${d.division}` : ''}
                  {d.conference ? ` · ${d.conference}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
          Stanley Cup Finals
        </h3>
        {franchise.stanleyCupFinals.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No finals rows yet.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {franchise.stanleyCupFinals.map((row) => (
              <li key={row.season}>
                <strong>{row.season}</strong> · {row.result === 'won' ? 'Won' : 'Lost'}
                {row.opponent ? ` vs. ${row.opponent}` : ''}
                {row.games ? ` (${row.games})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
          Championships
        </h3>
        {franchise.stanleyCupChampionships.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No championship rows yet.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {franchise.stanleyCupChampionships.map((c) => (
              <li key={c.season}>
                <strong>{c.season}</strong>
                {c.finalsOpponent ? ` · def. ${c.finalsOpponent}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="card card-pad"
        style={{
          marginBottom: '1rem',
          borderLeft: `4px solid ${franchise.colors.secondary}`,
        }}
      >
        <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
          Conn Smythe awards
        </h3>
        <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
          Winners linked to this franchise—including the rare cases where the Conn Smythe went to a player whose team
          lost the Final.
        </p>
        {connSmytheSummary && connSmytheSummary.count === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No Conn Smythe winners tied to this franchise yet.
          </p>
        ) : (
          <div className="stat-grid">
            <StatBlock
              label="Total Conn Smythe winners"
              value={String(connSmytheSummary?.count ?? 0)}
            />
            <StatBlock
              label="Most recent winner"
              value={
                connSmytheSummary?.mostRecent
                  ? `${connSmytheSummary.mostRecent.year} · ${connSmytheSummary.mostRecent.playerName}`
                  : '—'
              }
            />
          </div>
        )}
        <p style={{ margin: '0.75rem 0 0' }}>
          <Link to="/conn-smythe">Open full Conn Smythe directory →</Link>
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
          Conn Smythe winner list (this franchise)
        </h3>
        {connWinners.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No rows to list.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {connWinners.map((w) => (
              <li key={w.id}>
                <strong>{w.year}</strong> · {w.playerName}
                {w.position ? ` (${w.position})` : ''}
                {w.lostStanleyCupFinal ? (
                  <span className="muted"> · lost Final (Conn Smythe)</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="card card-pad"
        style={{
          borderColor: colorMix(franchise.colors.primary),
        }}
      >
        <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
          Your notes
        </h3>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
          Personal scratchpad—only on this browser, separate from the team history above.
        </p>
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setTeamNote(franchise.id, e.target.value)}
          placeholder="Track research, sources, or reminders…"
        />
      </div>
    </TeamThemedSurface>
  );
}

function franchiseStatusLabel(f: Franchise): string {
  if (!f.isActive) return 'Defunct / inactive franchise';
  return 'Active franchise';
}

function colorMix(hex: string): string {
  return `color-mix(in srgb, ${hex} 25%, var(--border))`;
}
