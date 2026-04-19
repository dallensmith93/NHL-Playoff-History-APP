import type { PlayoffBracket, PlayoffTeamEntry } from '../../../types/playoffs';
import { buildWinnersMap, resolvePlayoffEntry } from '../utils/seriesTracking';
import { getUpsetAlert, labelUpset } from '../utils/upsetAlerts';

export function UpsetAlertsPanel({
  bracket,
  teamEntryBySlug,
}: {
  bracket: PlayoffBracket;
  teamEntryBySlug: Map<string, PlayoffTeamEntry>;
}) {
  const winners = buildWinnersMap(bracket, teamEntryBySlug);
  const items: { seriesId: string; roundLabel: string; label: string }[] = [];

  for (const r of bracket.rounds) {
    for (const s of r.series) {
      const home = resolvePlayoffEntry(s.home, winners, teamEntryBySlug) ?? undefined;
      const away = resolvePlayoffEntry(s.away, winners, teamEntryBySlug) ?? undefined;
      const kind = getUpsetAlert(s, s.preSeriesProbability, s.mostRecentGame, home, away);
      const label = labelUpset(kind);
      if (kind !== 'none' && label) {
        items.push({ seriesId: s.id, roundLabel: s.roundLabel, label });
      }
    }
  }

  if (items.length === 0) {
    return (
      <section className="card card-pad" style={{ marginBottom: '1rem' }}>
        <h2 className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.35rem' }}>
          Upset &amp; leverage signals
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          No upset-style flags on the board right now—underdog wins, big swings, or favorites sliding under 50% will
          show here when games go final.
        </p>
      </section>
    );
  }

  return (
    <section className="card card-pad" style={{ marginBottom: '1rem' }}>
      <h2 className="display" style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
        Upset &amp; leverage signals
      </h2>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
        {items.map((x) => (
          <li key={x.seriesId} style={{ marginBottom: '0.35rem' }}>
            <span className="playoff-bracket-upset-badge" style={{ marginRight: '0.35rem' }}>
              {x.label}
            </span>
            <span className="muted">{x.roundLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
