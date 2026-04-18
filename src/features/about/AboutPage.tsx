import { Link } from 'react-router-dom';
import { useRef, useState, type ChangeEventHandler } from 'react';
import { usePersistence } from '../../app/persistence';
import { STORAGE_ROOT_KEY, STORAGE_VERSION } from '../../lib/localStorage';

export function AboutPage() {
  const { exportUserLibraryJson, importUserLibrary, state } = usePersistence();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [msg, setMsg] = useState<string | null>(null);

  const downloadBackup = () => {
    const json = exportUserLibraryJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhl-franchise-user-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Download started (favorites + team notes only).');
  };

  const triggerImport = () => {
    setMsg(null);
    fileRef.current?.click();
  };

  const onFileChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = importUserLibrary(text, importMode);
      setMsg(r.ok ? `Imported (${importMode}).` : r.error ?? 'Import failed.');
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="page-hero">
        <h1>About this app</h1>
        <p className="lede">
          Historical, offline-first NHL franchise browsing built for expansion — not live scores.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Data source
        </h2>
        <p style={{ margin: '0 0 0.75rem' }}>
          All franchise, playoff, and Conn Smythe rows ship as TypeScript modules under{' '}
          <code>src/data/</code>. There is no runtime API — everything you see is bundled from those files.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Computed fields:</strong> Playoff / SCF / championship totals and “most recent”
          seasons are derived in <code>src/lib/franchiseStats.ts</code>. Use{' '}
          <code>computeIdentityWindowStats</code> to attribute subsets to a single{' '}
          <code>TeamIdentity</code> window (current branding vs full lineage).
        </p>
        <p style={{ margin: '0.75rem 0 0' }}>
          <strong>Continuity:</strong> Renames, relocations, and rebrands belong in{' '}
          <code>lineage.identities[]</code> with <code>transitionFromPrior</code>. Optional{' '}
          <code>eraColors</code> and <code>historicalNotes</code> document branding without splitting
          unrelated franchises.
        </p>
        <p style={{ margin: '0.75rem 0 0' }}>
          <strong>Data checks:</strong> <code>validateFranchise</code> in{' '}
          <code>src/lib/franchiseValidation.ts</code> flags ordering gaps, unknown lineage ids, and
          bounds issues as you expand coverage.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Backup: favorites &amp; notes (JSON)
        </h2>
        <p style={{ margin: '0 0 0.75rem' }}>
          Export only your <strong>favorite franchise ids</strong> and <strong>per-team notes</strong>. The
          full app state (filters, theme, compare picks, etc.) stays in{' '}
          <code>localStorage</code> separately — see README for the full schema if you need to back that
          up manually.
        </p>
        <p style={{ margin: '0 0 0.75rem' }}>
          Current local counts: <strong>{state.favorites.length}</strong> favorites,{' '}
          <strong>{Object.keys(state.teamNotes).filter((k) => state.teamNotes[k]?.trim()).length}</strong>{' '}
          teams with non-empty notes.
        </p>
        <div className="filters-row" style={{ marginBottom: '0.75rem' }}>
          <label className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="radio"
              name="im"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Merge import (union favorites; imported notes overwrite keys)
          </label>
          <label className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="radio"
              name="im"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            Replace (favorites and notes become exactly the file)
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={downloadBackup}>
            Download JSON
          </button>
          <button type="button" className="btn" onClick={triggerImport}>
            Import JSON…
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        {msg && (
          <p style={{ margin: '0.75rem 0 0' }} role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          What persists locally
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>Favorites (franchise ids)</li>
          <li>Recently viewed franchise slugs + last viewed slug</li>
          <li>Franchise index search, filters, and sort</li>
          <li>Conn Smythe search, franchise filter, and selected winner id</li>
          <li>Compare tool selections</li>
          <li>Theme preference (system / light / dark)</li>
          <li>Per-franchise notes you type on detail pages</li>
        </ul>
        <p className="muted" style={{ margin: '0.75rem 0 0' }}>
          Storage key: <code>{STORAGE_ROOT_KEY}:v{STORAGE_VERSION}:app-state</code> — see{' '}
          <code>src/types/persistence.ts</code> and README for the JSON shape.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ margin: '0 0 0.5rem' }}>
          Lineage model
        </h2>
        <p style={{ margin: 0 }}>
          A <strong>franchise</strong> is the continuous legal entity. Relocations and renames live in{' '}
          <code>lineage.identities</code>. Use <code>predecessorFranchiseIds</code>,{' '}
          <code>successorFranchiseId</code>, and <code>continuesFranchiseId</code> sparingly to link
          unusual splits — most moves are represented by identities on a single row (e.g. Nordiques →
          Avalanche).
        </p>
      </div>

      <p>
        <Link to="/franchises">Back to franchises</Link>
      </p>
    </div>
  );
}
