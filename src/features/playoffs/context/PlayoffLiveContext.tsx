import { createContext, useContext, type ReactNode } from 'react';
import { usePersistence } from '../../../app/persistence';
import { useLivePlayoffScores, type UseLivePlayoffScoresResult } from '../hooks/useLivePlayoffScores';

const PlayoffLiveContext = createContext<UseLivePlayoffScoresResult | null>(null);

export function PlayoffLiveProvider({ children }: { children: ReactNode }) {
  const { state } = usePersistence();
  const pollDisabled = state.playoffPredictor.playoffLiveAutoRefresh === false;
  const value = useLivePlayoffScores({ pollDisabled });

  return <PlayoffLiveContext.Provider value={value}>{children}</PlayoffLiveContext.Provider>;
}

export function usePlayoffLive(): UseLivePlayoffScoresResult {
  const ctx = useContext(PlayoffLiveContext);
  if (!ctx) {
    throw new Error('usePlayoffLive must be used within PlayoffLiveProvider');
  }
  return ctx;
}
