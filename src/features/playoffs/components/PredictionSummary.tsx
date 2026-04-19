import type { MonteCarloSummary, QuickSimResult } from '../../../types/playoffs';
import { SharePredictionButton } from './SharePredictionButton';

export function PredictionSummary({
  quick,
  monte,
  darkHorseDisplayName,
}: {
  quick: QuickSimResult | null;
  monte: MonteCarloSummary | null;
  darkHorseDisplayName?: string | null;
}) {
  return (
    <section className="card card-pad" style={{ marginBottom: '1rem' }}>
      <h2 className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
        Share your bracket story
      </h2>
      <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
        Copy a short text summary of your last run (champion, Monte Carlo lean, odds line). Compare with a friend’s
        runs or keep it for yourself—everything stays in this browser until you copy it out.
      </p>
      <SharePredictionButton quick={quick} monte={monte} darkHorseDisplayName={darkHorseDisplayName} />
    </section>
  );
}
