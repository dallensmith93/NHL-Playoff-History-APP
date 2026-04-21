import type { LivePlayoffGame } from '../types/liveScores';
import { MarqueeScrollRow } from './MarqueeScrollRow';

function overtimeLabel(g: LivePlayoffGame): string | null {
  if (g.isShootout) return 'SO';
  if (!g.isOvertime) return null;
  const n = g.periodNumber;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 4) return `OT${n - 3}`;
  return 'OT';
}

function tvSuffix(g: LivePlayoffGame): string {
  if (!g.tvStations?.length) return '';
  return ` · TV: ${g.tvStations.join(', ')}`;
}

function segmentForGame(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') {
    return `${g.awayAbbr} @ ${g.homeAbbr} · upcoming${tvSuffix(g)}`;
  }
  if (g.state === 'final') {
    const ot = overtimeLabel(g);
    return `${g.awayAbbr} ${g.awayScore} @ ${g.homeAbbr} ${g.homeScore} Final${ot ? ` ${ot}` : ''}${tvSuffix(g)}`;
  }
  const ot = overtimeLabel(g);
  const clock = g.inIntermission ? 'INT' : g.clockTimeRemaining;
  const tail = [g.liveDetailLine, ot, clock].filter(Boolean).join(' · ');
  return `${g.awayAbbr} ${g.awayScore} @ ${g.homeAbbr} ${g.homeScore}${tail ? ` · ${tail}` : ''}${tvSuffix(g)}`;
}

export function LiveScoresMarquee({ games }: { games: LivePlayoffGame[] }) {
  if (games.length === 0) return null;

  return (
    <div
      className="marquee-broadcast marquee-broadcast--scores playoffs-stack-item"
      role="region"
      aria-label="Scores ticker"
    >
      <header className="marquee-broadcast-top">
        <span className="marquee-broadcast-badge" aria-hidden="true">
          Scores
        </span>
        <div className="marquee-broadcast-headline">
          <span className="marquee-broadcast-title">Today&apos;s games</span>
          <span className="marquee-broadcast-sub">
            Local calendar date · NHL schedule feed · Scroll sideways (or use the arrows) to pick a game to focus on
          </span>
        </div>
      </header>
      <div className="marquee-broadcast-tape">
        <MarqueeScrollRow ariaLabel="Today’s game scores" variant="scores">
          {games.map((g) => (
            <span key={g.gamePk} className="marquee-broadcast-chunk marquee-broadcast-chunk--score">
              {segmentForGame(g)}
            </span>
          ))}
        </MarqueeScrollRow>
      </div>
    </div>
  );
}
