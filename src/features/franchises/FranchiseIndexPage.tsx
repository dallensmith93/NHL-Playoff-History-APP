import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePersistence } from '../../app/persistence';
import {
  FRANCHISES,
  franchiseMatchesEra,
  searchFranchiseText,
} from '../../data/franchises';
import { FranchiseLogo } from '../../components/FranchiseLogo';
import { computeFranchiseStats } from '../../lib/franchiseStats';
import { sortFranchises } from '../../lib/sortFranchises';

function matchesConference(franchise: (typeof FRANCHISES)[0], c: string): boolean {
  if (c === 'all') return true;
  if (c === 'unassigned') return !franchise.currentConference;
  return franchise.currentConference === c;
}

function matchesDivision(franchise: (typeof FRANCHISES)[0], d: string): boolean {
  if (d === 'all') return true;
  if (d === 'unassigned') return !franchise.currentDivision;
  return franchise.currentDivision === d;
}

function matchesStatus(
  franchise: (typeof FRANCHISES)[0],
  status: 'all' | 'active' | 'inactive',
): boolean {
  if (status === 'all') return true;
  if (status === 'active') return franchise.isActive;
  return !franchise.isActive;
}

export function FranchiseIndexPage() {
  const { state, setIndexFilters, setIndexSort } = usePersistence();
  const { indexFilters, indexSort } = state;

  const conferences = useMemo(() => {
    const s = new Set<string>();
    for (const f of FRANCHISES) {
      if (f.currentConference) s.add(f.currentConference);
    }
    return [...s].sort();
  }, []);

  const divisions = useMemo(() => {
    const s = new Set<string>();
    for (const f of FRANCHISES) {
      if (f.currentDivision) s.add(f.currentDivision);
    }
    return [...s].sort();
  }, []);

  const filtered = useMemo(() => {
    return FRANCHISES.filter(
      (f) =>
        searchFranchiseText(f, indexFilters.search) &&
        matchesStatus(f, indexFilters.status) &&
        matchesConference(f, indexFilters.conference) &&
        matchesDivision(f, indexFilters.division) &&
        franchiseMatchesEra(f, indexFilters.era),
    );
  }, [indexFilters]);

  const sorted = useMemo(
    () => sortFranchises(filtered, indexSort.key, indexSort.dir),
    [filtered, indexSort],
  );

  return (
    <div>
      <div className="page-hero">
        <h1>Franchises</h1>
        <p className="lede">
          Search across names and lineage identities. Filters and sort persist locally.
        </p>
      </div>

      <div className="filters-sticky">
        <div className="card card-pad">
          <div className="filters-row">
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                id="q"
                value={indexFilters.search}
                onChange={(e) => setIndexFilters({ search: e.target.value })}
                placeholder="City, nickname, franchise…"
                style={{ minWidth: '220px' }}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={indexFilters.status}
                onChange={(e) =>
                  setIndexFilters({
                    status: e.target.value as typeof indexFilters.status,
                  })
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive / defunct</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="conf">Conference</label>
              <select
                id="conf"
                value={indexFilters.conference}
                onChange={(e) => setIndexFilters({ conference: e.target.value })}
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned / historical</option>
                {conferences.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="div">Division</label>
              <select
                id="div"
                value={indexFilters.division}
                onChange={(e) => setIndexFilters({ division: e.target.value })}
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned / historical</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="era">Era</label>
              <select
                id="era"
                value={indexFilters.era}
                onChange={(e) => setIndexFilters({ era: e.target.value })}
              >
                <option value="all">All eras</option>
                <option value="original-six">Original Six clubs</option>
                <option value="1967-expansion">1967 expansion class</option>
                <option value="wha-merger">WHA merger (1979–80)</option>
                <option value="1992-plus">1992–93 expansion onward</option>
                <option value="defunct">Defunct / inactive</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort</label>
              <select
                id="sort"
                value={`${indexSort.key}:${indexSort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(':') as [
                    typeof indexSort.key,
                    typeof indexSort.dir,
                  ];
                  setIndexSort({ key, dir });
                }}
              >
                <option value="name:asc">Name (A–Z)</option>
                <option value="name:desc">Name (Z–A)</option>
                <option value="cups:desc">Cups (most first)</option>
                <option value="cups:asc">Cups (fewest first)</option>
                <option value="playoffs:desc">Playoff years (most)</option>
                <option value="playoffs:asc">Playoff years (fewest)</option>
                <option value="lastPlayoff:desc">Last playoff (most recent)</option>
                <option value="lastPlayoff:asc">Last playoff (oldest)</option>
                <option value="lastCup:desc">Last Cup (most recent)</option>
                <option value="lastCup:asc">Last Cup (oldest)</option>
              </select>
            </div>
          </div>
          <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
            Showing {sorted.length} of {FRANCHISES.length} franchises.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty card card-pad">
          <h2>No matches</h2>
          <p>Relax filters or clear search to see franchises again.</p>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setIndexFilters({
                search: '',
                status: 'all',
                conference: 'all',
                division: 'all',
                era: 'all',
              })
            }
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {sorted.map((f) => {
            const s = computeFranchiseStats(f);
            return (
              <Link
                key={f.id}
                to={`/franchises/${f.slug}`}
                className="card card-pad"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  borderTop: `3px solid ${f.colors.primary}`,
                }}
              >
                <div className="franchise-index-card-top">
                  <FranchiseLogo franchise={f} size="sm" />
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div className="display" style={{ fontSize: '1.2rem', margin: 0 }}>
                        {f.currentDisplayName}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="muted" style={{ margin: '0.35rem 0' }}>
                  {f.franchiseName}
                  {!f.isActive && ' · Inactive'}
                </p>
                <div
                  className="stat-grid"
                  style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}
                >
                  <div className="stat">
                    <div className="stat-label">Cups</div>
                    <div className="stat-value">{s.totalChampionships}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Playoffs</div>
                    <div className="stat-value">{s.totalPlayoffAppearances}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Last playoff</div>
                    <div className="stat-value" style={{ fontSize: '1.05rem' }}>
                      {s.mostRecentPlayoffSeason ?? '—'}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
