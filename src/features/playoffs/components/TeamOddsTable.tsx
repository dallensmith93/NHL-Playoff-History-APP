import type { Franchise } from '../../../types/models';
import type { MonteCarloSummary } from '../../../types/playoffs';

export function TeamOddsTable({
  mcSummary,
  franchiseBySlug,
}: {
  mcSummary: MonteCarloSummary;
  franchiseBySlug: Map<string, Franchise>;
}) {
  return (
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
              <td style={{ padding: '0.45rem 0.5rem' }}>
                {franchiseBySlug.get(t.franchiseSlug)?.currentDisplayName ?? t.displayName}
              </td>
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
  );
}
