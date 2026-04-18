import type { Era, Franchise, TeamIdentity } from '../types/models';
import { resolveFranchiseColors } from '../lib/branding';
import { formatIdentityTransition } from '../lib/identityLabels';
import { formatSeasonRange } from '../lib/format';

function IdentityEraCard({
  franchise,
  identity,
  isLast,
}: {
  franchise: Franchise;
  identity: TeamIdentity;
  isLast: boolean;
}) {
  const c = resolveFranchiseColors(franchise, identity);
  const transition = identity.transitionFromPrior;

  return (
    <div
      className="lineage-step"
      style={
        isLast
          ? undefined
          : { borderBottom: '1px dashed color-mix(in srgb, var(--border) 80%, transparent)' }
      }
    >
      <div
        className="identity-era-card"
        style={{
          borderColor: c.primary,
          background: `linear-gradient(135deg, color-mix(in srgb, ${c.primary} 12%, var(--surface)), var(--surface))`,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <h4 className="display" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>
            {identity.fullName}
          </h4>
          <span
            className="pill"
            style={{
              borderColor: c.primary,
              color: 'var(--text)',
              background: `color-mix(in srgb, ${c.secondary} 18%, var(--surface))`,
            }}
            title="How this era connects to the prior identity on the same franchise row"
          >
            {formatIdentityTransition(transition)}
          </span>
        </div>
        <p className="muted" style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>
          {formatSeasonRange(identity.fromSeason, identity.toSeason)}
          {identity.abbreviation ? ` · ${identity.abbreviation}` : ''}
        </p>
        {identity.eraNotes && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.92rem' }}>{identity.eraNotes}</p>
        )}
        <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
          Era colors: primary <code style={{ fontSize: '0.85em' }}>{c.primary}</code> · secondary{' '}
          <code style={{ fontSize: '0.85em' }}>{c.secondary}</code>
          {identity.eraColors ? ' (overrides franchise defaults)' : ' (franchise default)'}
        </p>
      </div>
    </div>
  );
}

function ConferenceEraCard({ era }: { era: Era }) {
  return (
    <div className="timeline-item">
      <h4>{era.label}</h4>
      <p>
        {formatSeasonRange(era.fromSeason, era.toSeason)}
        {era.division ? ` · ${era.division}` : ''}
        {era.conference ? ` · ${era.conference}` : ''}
      </p>
    </div>
  );
}

export function FranchiseLineageSection({ franchise }: { franchise: Franchise }) {
  const ids = franchise.lineage.identities;
  const eras = franchise.lineage.eras;

  return (
    <div>
      <h3 className="display" style={{ margin: '0 0 0.25rem' }}>
        Franchise lineage &amp; identity eras
      </h3>
      <p className="muted" style={{ marginTop: 0, maxWidth: '62ch' }}>
        One continuous franchise entity may span several <strong>identities</strong> (renames,
        relocations, rebrands). Trophy rows in the dataset belong to the franchise as a whole; use the
        snapshot on this page to compare <em>lifetime</em> totals with the <em>current identity</em>{' '}
        window when useful.
      </p>

      {ids.length === 0 ? (
        <p className="muted">No identity eras defined yet.</p>
      ) : (
        <div className="lineage-rail" style={{ marginTop: '1rem' }}>
          {ids.map((identity, index) => (
            <IdentityEraCard
              key={identity.id}
              franchise={franchise}
              identity={identity}
              isLast={index === ids.length - 1}
            />
          ))}
        </div>
      )}

      {eras.length > 0 && (
        <>
          <h3 className="display" style={{ margin: '1.5rem 0 0.25rem' }}>
            Conference / division structure
          </h3>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            League alignment changes (not the same as city/name branding).
          </p>
          <div className="timeline" style={{ marginTop: '0.75rem' }}>
            {eras.map((e) => (
              <ConferenceEraCard key={e.id} era={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
