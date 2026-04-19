import { useState } from 'react';
import type { MonteCarloSummary, QuickSimResult } from '../../../types/playoffs';
import { exportPredictionSummary } from '../utils/sharePredictions';

export function SharePredictionButton({
  quick,
  monte,
  darkHorseDisplayName,
}: {
  quick: QuickSimResult | null;
  monte: MonteCarloSummary | null;
  /** Optional long-shot label for the copied summary. */
  darkHorseDisplayName?: string | null;
}) {
  const [done, setDone] = useState(false);

  if (!quick && !monte) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        Run a prediction above, then copy a summary to share.
      </p>
    );
  }

  return (
    <div className="share-prediction-block">
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const text = exportPredictionSummary({ quick, monte, darkHorseDisplayName });
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            window.setTimeout(() => setDone(false), 2500);
          } catch {
            window.prompt('Copy this summary:', text);
          }
        }}
      >
        {done ? 'Copied!' : 'Copy prediction summary'}
      </button>
    </div>
  );
}
