import { Link } from 'react-router-dom';
import { useMemo, type CSSProperties } from 'react';
import { FranchiseLogo } from '../../components/FranchiseLogo';
import { VisitorRegionNote } from '../../components/VisitorRegionNote';
import { usePersistence } from '../../app/persistence';
import { FRANCHISES, getFranchiseBySlug, getLeagueQuickStats } from '../../data/franchises';
import { computeFranchiseStats } from '../../lib/franchiseStats';
import {
  computeLeagueDashboard,
  DASHBOARD_REFERENCE_SEASON_LABEL,
} from '../../lib/leagueDashboard';
import { formatNumber } from '../../lib/format';
import type { Franchise } from '../../types/models';

export function HomePage() {
  const { state } = usePersistence();
  const stats = useMemo(() => getLeagueQuickStats(), []);
  const dash = useMemo(() => computeLeagueDashboard(FRANCHISES), []);
  const modeledActiveCount = useMemo(
    () => FRANCHISES.filter((f) => f.isActive && !f.isPlaceholder).length,
    [],
  );

  const featured = useMemo(() => {
    return [...FRANCHISES]
      .filter((f) => !f.isPlaceholder)
      .map((f) => ({ f, s: computeFranchiseStats(f) }))
      .sort((a, b) => b.s.totalChampionships - a.s.totalChampionships)
      .slice(0, 6)
      .map((x) => x.f);
  }, []);

  const recentFranchises = useMemo(() => {
    return state.recentlyViewedSlugs
      .map((slug) => FRANCHISES.find((f) => f.slug === slug))
      .filter((f): f is Franchise => Boolean(f));
  }, [state.recentlyViewedSlugs]);

  const activeFranchiseLogos = useMemo(
    () =>
      [...FRANCHISES]
        .filter((f) => f.isActive && !f.isPlaceholder)
        .sort((a, b) => a.currentDisplayName.localeCompare(b.currentDisplayName)),
    [],
  );

  const relatedFranchiseLogos = useMemo(() => {
    const az = getFranchiseBySlug('arizona-coyotes');
    return az ? [az] : [];
  }, []);

  const lastSlug = state.lastViewedSlug;
  const last = lastSlug ? FRANCHISES.find((f) => f.slug === lastSlug) : undefined;

  return (
    <div className="home">
      <header className="home-hero">
        <p className="home-hero-eyebrow">History &amp; records · not a live scoreboard</p>
        <h1>NHL franchise history</h1>
        <p className="home-hero-lede">
          Explore lineages, relocations, and trophy history. Your favorites, notes, and filters stay
          on this device.
        </p>
        <VisitorRegionNote style={{ marginTop: '0.65rem', maxWidth: '40rem' }} />
        <p className="home-hero-lede" style={{ marginTop: '0.75rem' }}>
          <Link to="/playoffs/2026-bracket">2026 playoffs bracket &amp; champion picker →</Link>
        </p>
      </header>

      <section className="home-section" aria-labelledby="dash-heading">
        <div className="home-section-head">
          <h2 id="dash-heading" className="home-section-title">
            League snapshot
          </h2>
          <p className="home-section-sub">
            Cup records and droughts count teams that have <strong>complete trophy history</strong> here.
            Reference season: <strong>{DASHBOARD_REFERENCE_SEASON_LABEL}</strong>.
          </p>
        </div>

        <div className="stat-tiles">
          <div className="stat-tile">
            <span className="stat-tile-label">Active clubs</span>
            <span className="stat-tile-value">{formatNumber(dash.totalActiveFranchises)}</span>
            <span className="stat-tile-hint">Still playing today</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile-label">Defunct / inactive</span>
            <span className="stat-tile-value">{formatNumber(dash.totalInactiveFranchises)}</span>
            <span className="stat-tile-hint">Historical or ceased entries</span>
          </div>
          <div className="stat-tile stat-tile--wide">
            <span className="stat-tile-label">Most Stanley Cups</span>
            <span className="stat-tile-value stat-tile-value--text">
              {dash.franchiseMostChampionships ? (
                <>
                  <Link to={`/franchises/${dash.franchiseMostChampionships.franchise.slug}`}>
                    {dash.franchiseMostChampionships.franchise.currentDisplayName}
                  </Link>
                  <span className="stat-tile-inline-muted">
                    {dash.franchiseMostChampionships.championships} titles
                  </span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="stat-tile stat-tile--wide">
            <span className="stat-tile-label">Longest active Cup drought</span>
            <span className="stat-tile-value stat-tile-value--text">
              {dash.longestActiveCupDrought ? (
                <>
                  <Link to={`/franchises/${dash.longestActiveCupDrought.franchise.slug}`}>
                    {dash.longestActiveCupDrought.franchise.currentDisplayName}
                  </Link>
                  <span className="stat-tile-meta">
                    {dash.longestActiveCupDrought.seasonsSinceLastCup} seasons since last Cup
                    {dash.longestActiveCupDrought.lastCupSeason
                      ? ` · last ${dash.longestActiveCupDrought.lastCupSeason}`
                      : ' · no Cup wins recorded'}
                  </span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>

        <div className="stat-tiles stat-tiles--compact">
          <div className="stat-tile stat-tile--muted">
            <span className="stat-tile-label">Teams in app</span>
            <span className="stat-tile-value">{formatNumber(stats.franchiseCount)}</span>
          </div>
          <div className="stat-tile stat-tile--muted">
            <span className="stat-tile-label">Active with full data</span>
            <span className="stat-tile-value">{formatNumber(modeledActiveCount)}</span>
            <span className="stat-tile-hint">Included in key league stats</span>
          </div>
          <div className="stat-tile stat-tile--muted">
            <span className="stat-tile-label">Cup wins recorded</span>
            <span className="stat-tile-value">{formatNumber(stats.totalCupChampionshipsInDataset)}</span>
            <span className="stat-tile-hint">Championships counted in the app</span>
          </div>
          <div className="stat-tile stat-tile--muted">
            <span className="stat-tile-label">Conn Smythe rows</span>
            <span className="stat-tile-value">{formatNumber(stats.connSmytheWinners)}</span>
          </div>
          <div className="stat-tile stat-tile--muted">
            <span className="stat-tile-label">Your favorites</span>
            <span className="stat-tile-value">{formatNumber(state.favorites.length)}</span>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="franchises-logos-heading">
        <div className="home-section-head">
          <h2 id="franchises-logos-heading" className="home-section-title">
            Franchises
          </h2>
          <p className="home-section-sub">
            Logos from Wikipedia. Includes today’s active clubs plus the Arizona Coyotes charter (inactive; continued
            by Utah).
          </p>
        </div>

        <h3 className="home-logo-subhead">Active clubs</h3>
        <div className="home-logo-grid">
          {activeFranchiseLogos.map((f) => (
            <Link
              key={f.id}
              to={`/franchises/${f.slug}`}
              className="home-logo-cell"
              style={
                {
                  '--team-accent': f.colors.primary,
                } as CSSProperties
              }
            >
              <FranchiseLogo franchise={f} size="md" className="home-logo-cell-img" />
              <span className="home-logo-cell-name">{f.currentDisplayName}</span>
            </Link>
          ))}
        </div>

        {relatedFranchiseLogos.length > 0 && (
          <>
            <h3 className="home-logo-subhead home-logo-subhead--spaced">Related franchise</h3>
            <div className="home-logo-grid home-logo-grid--compact">
              {relatedFranchiseLogos.map((f) => (
                <Link
                  key={f.id}
                  to={`/franchises/${f.slug}`}
                  className="home-logo-cell home-logo-cell--muted"
                  style={
                    {
                      '--team-accent': f.colors.primary,
                    } as CSSProperties
                  }
                >
                  <FranchiseLogo franchise={f} size="md" className="home-logo-cell-img" />
                  <span className="home-logo-cell-name">{f.currentDisplayName}</span>
                  <span className="home-logo-cell-meta">Inactive · relocated as Utah</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="home-section" aria-labelledby="nav-heading">
        <h2 id="nav-heading" className="home-section-title home-section-title--solo">
          Explore
        </h2>
        <div className="home-link-grid">
          <Link className="home-link-card" to="/franchises">
            <span className="home-link-card-title">Franchise index</span>
            <span className="home-link-card-desc">Search, filters, and sort</span>
          </Link>
          <Link className="home-link-card" to="/conn-smythe">
            <span className="home-link-card-title">Conn Smythe</span>
            <span className="home-link-card-desc">Winners table and detail</span>
          </Link>
          <Link className="home-link-card" to="/compare">
            <span className="home-link-card-title">Compare</span>
            <span className="home-link-card-desc">Two teams side by side</span>
          </Link>
          <Link className="home-link-card" to="/favorites">
            <span className="home-link-card-title">Favorites</span>
            <span className="home-link-card-desc">{state.favorites.length} saved</span>
          </Link>
          <Link className="home-link-card" to="/about">
            <span className="home-link-card-title">About</span>
            <span className="home-link-card-desc">Data model and local storage</span>
          </Link>
        </div>
      </section>

      <div className="home-split">
        <section className="home-panel" aria-labelledby="resume-heading">
          <h2 id="resume-heading" className="home-panel-title">
            Continue
          </h2>
          {last ? (
            <p className="home-panel-body">
              <Link to={`/franchises/${last.slug}`} className="home-continue-link">
                {last.currentDisplayName}
              </Link>
            </p>
          ) : (
            <p className="home-panel-body muted">Open a team page to save your place locally.</p>
          )}
        </section>
        {recentFranchises.length > 0 && (
          <section className="home-panel" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="home-panel-title">
              Recently viewed
            </h2>
            <ul className="home-recent-list">
              {recentFranchises.map((f) => (
                <li key={f.slug}>
                  <Link to={`/franchises/${f.slug}`}>{f.currentDisplayName}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="home-section" aria-labelledby="featured-heading">
        <div className="home-section-head">
          <h2 id="featured-heading" className="home-section-title">
            Richest Cup pedigrees
          </h2>
          <p className="home-section-sub">Teams with full data, ordered by Stanley Cups.</p>
        </div>
        <div className="home-featured-grid">
          {featured.map((f) => {
            const s = computeFranchiseStats(f);
            return (
              <Link
                key={f.id}
                to={`/franchises/${f.slug}`}
                className="home-featured-card"
                style={
                  {
                    '--team-accent': f.colors.primary,
                  } as CSSProperties
                }
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FranchiseLogo franchise={f} size="sm" />
                  <span className="home-featured-name">{f.currentDisplayName}</span>
                </span>
                <span className="home-featured-stats">
                  <strong>{s.totalChampionships}</strong> Cups ·{' '}
                  <strong>{s.totalPlayoffAppearances}</strong> playoff years recorded
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
