import type { LivePlayoffGame } from '../types/liveScores';
import { formatGameStartTimeLocal } from '../utils/formatGameTime';
import { overtimeLabel } from '../utils/liveGameLabels';
import { MarqueeScrollRow } from './MarqueeScrollRow';

function tvSuffix(g: LivePlayoffGame): string {
  if (!g.tvStations?.length) return '';
  return ` · TV: ${g.tvStations.join(', ')}`;
}

function startTimeSuffix(iso: string): string {
  const t = formatGameStartTimeLocal(iso);
  return t ? ` · ${t}` : '';
}

function stateRibbonClass(g: LivePlayoffGame): 'soon' | 'live' | 'final' {
  if (g.state === 'scheduled') return 'soon';
  if (g.state === 'final') return 'final';
  return 'live';
}

function stateRibbonText(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') return 'Soon';
  if (g.state === 'final') return 'Final';
  return g.state === 'unknown' ? 'Live' : 'Live';
}

function scoreLineText(g: LivePlayoffGame): string {
  if (g.state === 'scheduled') {
    return `${g.awayAbbr} @ ${g.homeAbbr}${startTimeSuffix(g.gameDateUtc)}${tvSuffix(g)}`;
  }
  if (g.state === 'final') {
    return `${g.awayAbbr} ${g.awayScore} @ ${g.homeAbbr} ${g.homeScore}${startTimeSuffix(g.gameDateUtc)}${tvSuffix(g)}`;
  }
  const clock = g.inIntermission ? 'INT' : g.clockTimeRemaining;
  const tail = [g.liveDetailLine, clock].filter(Boolean).join(' · ');
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
            Local date · start times in your time zone (from NHL schedule) · Scroll sideways (or use the arrows) to
            pick a game to focus on
          </span>
        </div>
      </header>
      <div className="marquee-broadcast-tape">
        <MarqueeScrollRow ariaLabel="Today’s game scores">
          {games.map((g) => {
            const ot = overtimeLabel(g);
            return (
              <span key={g.gamePk} className="marquee-broadcast-chunk marquee-broadcast-chunk--score">
                <span className={`marquee-broadcast-ribbon marquee-broadcast-ribbon--${stateRibbonClass(g)}`}>
                  {stateRibbonText(g)}
                </span>
                {g.state !== 'scheduled' && ot ? (
                  <span className="marquee-broadcast-ribbon marquee-broadcast-ribbon--ot">{ot}</span>
                ) : null}
                <span className="marquee-broadcast-chunk-main">{scoreLineText(g)}</span>
              </span>
            );
          })}
        </MarqueeScrollRow>
      </div>
    </div>
  );
}
