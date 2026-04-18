import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePersistence } from '../../app/persistence';
import { FRANCHISES, FRANCHISE_BY_ID } from '../../data/franchises';
import { FranchiseLogo } from '../../components/FranchiseLogo';
import { StatsSnapshot } from '../../components/StatsSnapshot';
import { TeamThemedSurface } from '../../components/TeamThemedSurface';
import { computeFranchiseStats, computeIdentityWindowStats } from '../../lib/franchiseStats';
import { getCurrentIdentity, hasMultipleIdentities } from '../../lib/franchiseIdentity';
import type { Franchise } from '../../types/models';

export function ComparePage() {
  const { state, setComparePair } = usePersistence();
  const aId = state.compareA;
  const bId = state.compareB;

  const list = useMemo(
    () => [...FRANCHISES].sort((x, y) => x.currentDisplayName.localeCompare(y.currentDisplayName)),
    [],
  );

  const a = aId ? FRANCHISE_BY_ID.get(aId) : undefined;
  const b = bId ? FRANCHISE_BY_ID.get(bId) : undefined;
  const sa = a ? computeFranchiseStats(a) : undefined;
  const sb = b ? computeFranchiseStats(b) : undefined;

  const err =
    a && b && a.id === b.id ? 'Pick two different franchises for a meaningful comparison.' : null;

  return (
    <div>
      <div className="page-hero">
        <h1>Compare franchises</h1>
        <p className="lede">
          Side-by-side view of the <strong>continuous franchise</strong> totals versus the{' '}
          <strong>current branding window</strong> when multiple identity eras exist.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <div className="filters-row">
          <div className="field">
            <label htmlFor="cmp-a">Franchise A</label>
            <select
              id="cmp-a"
              value={aId ?? ''}
              onChange={(e) => setComparePair(e.target.value || undefined, bId)}
            >
              <option value="">Select…</option>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.currentDisplayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cmp-b">Franchise B</label>
            <select
              id="cmp-b"
              value={bId ?? ''}
              onChange={(e) => setComparePair(aId, e.target.value || undefined)}
            >
              <option value="">Select…</option>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.currentDisplayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div className="card card-pad" style={{ marginBottom: '1rem', borderColor: '#c8102e' }}>
          <p style={{ margin: 0 }}>{err}</p>
        </div>
      )}

      {!a || !b ? (
        <div className="empty card card-pad">
          <h2>Select two franchises</h2>
          <p className="muted">Stats appear here once both sides are chosen.</p>
        </div>
      ) : sa && sb ? (
        <div className="compare-grid">
          <CompareColumn franchise={a} other={b} lifetime={sa} />
          <CompareColumn franchise={b} other={a} lifetime={sb} />
        </div>
      ) : null}
    </div>
  );
}

function CompareColumn({
  franchise,
  other,
  lifetime,
}: {
  franchise: Franchise;
  other: Franchise;
  lifetime: ReturnType<typeof computeFranchiseStats>;
}) {
  const current = getCurrentIdentity(franchise);
  const multi = hasMultipleIdentities(franchise);
  const windowStats =
    current && multi ? computeIdentityWindowStats(franchise, current) : undefined;

  return (
    <TeamThemedSurface colors={franchise.colors}>
      <div
        className="card card-pad"
        style={{
          borderTop: `4px solid ${franchise.colors.primary}`,
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <FranchiseLogo franchise={franchise} size="md" />
          <h2 className="display" style={{ margin: 0 }}>
            {franchise.currentDisplayName}
          </h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          vs.{' '}
          <Link to={`/franchises/${other.slug}`} style={{ fontWeight: 600 }}>
            {other.currentDisplayName}
          </Link>
        </p>
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          <strong>Entity:</strong> {franchise.franchiseName}
          {multi ? ` · ${franchise.lineage.identities.length} identity eras` : ' · single identity'}
        </p>

        <div style={{ marginTop: '1rem' }}>
          <StatsSnapshot
            title="Franchise lifetime"
            stats={lifetime}
            subtitle="All seasons on this franchise row — includes predecessor cities/names."
          />
        </div>

        {multi && windowStats && current && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <StatsSnapshot
              title={`Current identity: ${current.fullName}`}
              stats={windowStats}
              subtitle="Playoff & trophy rows dated inside this branding window only."
            />
          </div>
        )}

        {!multi && (
          <p className="muted" style={{ margin: '1rem 0 0', fontSize: '0.85rem' }}>
            Lifetime totals equal the current identity window — no relocation/rename split in the data.
          </p>
        )}

        <Link to={`/franchises/${franchise.slug}`} className="btn" style={{ marginTop: '0.75rem' }}>
          Open full history
        </Link>
      </div>
    </TeamThemedSurface>
  );
}
