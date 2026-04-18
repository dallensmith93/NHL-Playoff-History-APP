import { Link } from 'react-router-dom';
import type { Franchise } from '../types/models';
import { FRANCHISE_BY_ID } from '../data/franchises';

function LinkToFranchise({ id, label }: { id: string; label: string }) {
  const f = FRANCHISE_BY_ID.get(id);
  if (!f) {
    return (
      <span className="muted">
        {label}: <code>{id}</code> (not in dataset)
      </span>
    );
  }
  return (
    <Link to={`/franchises/${f.slug}`}>
      {label}: {f.currentDisplayName}
    </Link>
  );
}

export function LineageLinks({ franchise }: { franchise: Franchise }) {
  const { lineage } = franchise;
  const preds = lineage.predecessorFranchiseIds ?? [];
  const succ = lineage.successorFranchiseId;
  const cont = lineage.continuesFranchiseId;

  if (preds.length === 0 && !succ && !cont) return null;

  return (
    <div className="card card-pad" style={{ marginBottom: '1rem' }}>
      <h3 className="display" style={{ margin: '0 0 0.5rem' }}>
        Franchise graph
      </h3>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {cont && (
          <li key="cont">
            <LinkToFranchise id={cont} label="Continues" />
          </li>
        )}
        {preds.map((id) => (
          <li key={id}>
            <LinkToFranchise id={id} label="Predecessor" />
          </li>
        ))}
        {succ && (
          <li key="succ">
            <LinkToFranchise id={succ} label="Successor" />
          </li>
        )}
      </ul>
    </div>
  );
}
