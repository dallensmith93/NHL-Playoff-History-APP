import { Link } from 'react-router-dom';
import { usePersistence } from '../../app/persistence';
import { FranchiseLogo } from '../../components/FranchiseLogo';
import { FRANCHISE_BY_ID } from '../../data/franchises';
import { computeFranchiseStats } from '../../lib/franchiseStats';

export function FavoritesPage() {
  const { state, toggleFavorite } = usePersistence();
  const favs = state.favorites
    .map((id) => FRANCHISE_BY_ID.get(id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .sort((a, b) => a.currentDisplayName.localeCompare(b.currentDisplayName));

  if (favs.length === 0) {
    return (
      <div>
        <div className="page-hero">
          <h1>Favorites</h1>
          <p className="lede">Saved franchises on this device — empty for now.</p>
        </div>
        <div className="empty card card-pad">
          <h2>No favorites yet</h2>
          <p className="muted">
            Open any franchise and tap <strong>Add favorite</strong>. The list stays in this browser until you clear
            it.
          </p>
          <Link to="/franchises" className="btn" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
            Browse franchises
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>Favorites</h1>
        <p className="lede">{favs.length} saved locally.</p>
      </div>
      <div className="grid-cards">
        {favs.map((f) => {
          const s = computeFranchiseStats(f);
          return (
            <div
              key={f.id}
              className="card card-pad"
              style={{ borderLeft: `4px solid ${f.colors.primary}` }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '0.35rem',
                }}
              >
                <FranchiseLogo franchise={f} size="sm" />
                <div className="display" style={{ fontSize: '1.2rem', margin: 0 }}>
                  <Link to={`/franchises/${f.slug}`}>{f.currentDisplayName}</Link>
                </div>
              </div>
              <p className="muted" style={{ margin: '0 0 0.75rem' }}>
                Cups: {s.totalChampionships} · Playoffs tracked: {s.totalPlayoffAppearances}
              </p>
              <button type="button" className="btn" onClick={() => toggleFavorite(f.id)}>
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
