/** Live / schedule layer — NHL Stats-style feed mapped to app semantics. */

export type LiveGameState = 'scheduled' | 'live' | 'final' | 'unknown';

export interface LivePlayoffGame {
  gamePk: number;
  gameDateUtc: string;
  state: LiveGameState;
  /** NHL team abbreviations (e.g. CAR, OTT). */
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  /** True when the NHL feed marks the game as final. */
  isFinal: boolean;
  /** Best-effort period/clock summary for live games (schedule row). */
  liveDetailLine?: string;
  /** From gamecenter landing — time left in period, e.g. `12:34` or `00:00`. */
  clockTimeRemaining?: string;
  clockSecondsRemaining?: number;
  /** From gamecenter landing — between periods. */
  inIntermission?: boolean;
  /** Regulation overtime (not shootout). */
  isOvertime?: boolean;
  /** Shootout period. */
  isShootout?: boolean;
  gameType?: string;
  /** True only for NHL playoff games (gameType 3). Bracket merge uses this; score strip shows all types. */
  isPlayoffGame?: boolean;
}

export type LiveDataSource = 'live' | 'cached' | 'seed';

export interface LiveScoreboardFetchResult {
  games: LivePlayoffGame[];
  source: LiveDataSource;
  fetchedAt: string;
  error?: string;
  /** True when we had to skip networking (offline) or use stale cache only. */
  usedFallback?: boolean;
}

/** Per-series UI overlay built from live feed + merge logic. */
export interface SeriesLiveOverlay {
  bracketStatusLabel: string;
  /** e.g. final score one-liner or live score line */
  primaryLine?: string;
  nextGameLine?: string;
  state: LiveGameState;
  source: LiveDataSource;
}

export type UpsetAlertKind =
  | 'none'
  | 'upset_alert'
  | 'underdog_surge'
  | 'favorite_trouble'
  | 'momentum_swing';
