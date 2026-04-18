import type { FranchiseComputedStats } from '../types/models';
import { StatBlock } from './StatBlock';

export function StatsSnapshot({
  title,
  stats,
  subtitle,
}: {
  title: string;
  stats: FranchiseComputedStats;
  subtitle?: string;
}) {
  return (
    <div>
      <h3 className="display" style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>
        {title}
      </h3>
      {subtitle && (
        <p className="muted" style={{ margin: '0 0 0.65rem', fontSize: '0.85rem' }}>
          {subtitle}
        </p>
      )}
      <div className="stat-grid">
        <StatBlock label="Playoff appearances" value={String(stats.totalPlayoffAppearances)} />
        <StatBlock label="SCF appearances" value={String(stats.totalScfAppearances)} />
        <StatBlock label="Championships" value={String(stats.totalChampionships)} />
        <StatBlock label="Division titles" value={String(stats.divisionTitleCount)} />
        <StatBlock label="Most recent playoff" value={stats.mostRecentPlayoffSeason ?? '—'} />
        <StatBlock label="Most recent SCF" value={stats.mostRecentScfSeason ?? '—'} />
        <StatBlock
          label="SCF result"
          value={
            stats.mostRecentScfResult === 'won'
              ? 'Won'
              : stats.mostRecentScfResult === 'lost'
                ? 'Lost'
                : '—'
          }
        />
        <StatBlock label="Most recent Cup" value={stats.mostRecentChampionshipSeason ?? '—'} />
      </div>
    </div>
  );
}
