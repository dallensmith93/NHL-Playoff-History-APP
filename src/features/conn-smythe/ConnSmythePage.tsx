import { Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { usePersistence } from '../../app/persistence';
import { ConnSmytheDetailCard } from '../../components/ConnSmytheDetailCard';
import { CONN_SMYTHE_WINNERS } from '../../data/connSmythe';
import { FRANCHISE_BY_ID, FRANCHISES } from '../../data/franchises';
import { resolveFranchiseForConnWinner } from '../../lib/connSmytheFranchise';

export function ConnSmythePage() {
  const { state, setConnSmytheUi } = usePersistence();
  const { search, franchiseId, selectedWinnerId } = state.connSmythe;

  const franchiseOptions = useMemo(
    () =>
      [...FRANCHISES].sort((a, b) => a.currentDisplayName.localeCompare(b.currentDisplayName)),
    [],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CONN_SMYTHE_WINNERS.filter((w) => {
      if (franchiseId !== 'all' && w.franchiseId !== franchiseId) return false;
      if (!q) return true;
      const hay = `${w.year} ${w.playerName} ${w.teamName} ${w.position ?? ''} ${w.franchiseId ?? ''} ${w.lostStanleyCupFinal ? 'lost final runner-up' : ''}`.toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.year - a.year);
  }, [search, franchiseId]);

  const selected = useMemo(() => {
    const byId = rows.find((r) => r.id === selectedWinnerId);
    return byId ?? rows[0];
  }, [rows, selectedWinnerId]);

  useEffect(() => {
    if (rows.length === 0) return;
    const ok = selectedWinnerId && rows.some((r) => r.id === selectedWinnerId);
    if (!ok && rows[0]) {
      setConnSmytheUi({ selectedWinnerId: rows[0].id });
    }
  }, [rows, selectedWinnerId, setConnSmytheUi]);

  return (
    <div>
      <div className="page-hero">
        <h1>Conn Smythe Trophy</h1>
        <p className="lede">
          Full Conn Smythe winner history. Search and filters are remembered on this device. Each row links to a
          franchise when we can match the winning team to a club in the app.
        </p>
      </div>

      <div className="filters-sticky">
        <div className="card card-pad">
          <div className="filters-row">
            <div className="field">
              <label htmlFor="cs-q">Search</label>
              <input
                id="cs-q"
                value={search}
                onChange={(e) => setConnSmytheUi({ search: e.target.value })}
                placeholder="Player, team, year, franchise id…"
                style={{ minWidth: '220px' }}
              />
            </div>
            <div className="field">
              <label htmlFor="cs-fr">Franchise filter</label>
              <select
                id="cs-fr"
                value={franchiseId}
                onChange={(e) => setConnSmytheUi({ franchiseId: e.target.value })}
              >
                <option value="all">All franchises</option>
                {franchiseOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.currentDisplayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
            Showing {rows.length} of {CONN_SMYTHE_WINNERS.length} winners (2005 lockout omitted).
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty card card-pad">
          <h2>No matches</h2>
          <p>Adjust search or franchise filter.</p>
        </div>
      ) : (
        <>
          {selected && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="display" style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
                Selected winner
              </h2>
              <ConnSmytheDetailCard
                winner={selected}
                franchise={resolveFranchiseForConnWinner(selected, FRANCHISES, FRANCHISE_BY_ID)}
              />
            </div>
          )}

          <div className="card card-pad" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Year</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Player</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Pos</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Team (as awarded)</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Franchise</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Final</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const fr = resolveFranchiseForConnWinner(w, FRANCHISES, FRANCHISE_BY_ID);
                  const isSel = w.id === selected?.id;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setConnSmytheUi({ selectedWinnerId: w.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setConnSmytheUi({ selectedWinnerId: w.id });
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      style={{
                        borderTop: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: isSel ? 'color-mix(in srgb, var(--link) 12%, var(--surface))' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.55rem 1rem', fontWeight: 700 }}>{w.year}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{w.playerName}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{w.position ?? '—'}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{w.teamName}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>
                        {fr ? (
                          <Link to={`/franchises/${fr.slug}`} onClick={(e) => e.stopPropagation()}>
                            {fr.currentDisplayName}
                          </Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.55rem 1rem' }} className="muted">
                        {w.lostStanleyCupFinal ? 'Lost' : 'Won'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="display" style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>
            Detail cards ({rows.length})
          </h2>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
            Same filter as the table — useful for scanning winners visually. Click a table row to sync the
            highlighted card above.
          </p>
          <div className="grid-cards">
            {rows.map((w) => {
              const fr = resolveFranchiseForConnWinner(w, FRANCHISES, FRANCHISE_BY_ID);
              const isSel = w.id === selected?.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setConnSmytheUi({ selectedWinnerId: w.id })}
                  className="card card-pad"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: isSel ? '2px solid var(--link)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    font: 'inherit',
                  }}
                >
                  <div className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
                    {w.year}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{w.playerName}</div>
                  <div className="muted" style={{ fontSize: '0.88rem' }}>
                    {w.teamName}
                    {w.lostStanleyCupFinal ? ' · Lost Final' : ''}
                    {fr ? (
                      <>
                        {' '}
                        ·{' '}
                        <span style={{ fontWeight: 600, color: 'var(--link)' }}>
                          {fr.currentDisplayName}
                        </span>
                      </>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
