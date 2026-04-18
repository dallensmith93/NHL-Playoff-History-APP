import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadPersistedState, savePersistedState } from '../lib/localStorage';
import {
  buildUserLibraryExport,
  parseUserLibraryImport,
  serializeUserLibraryExport,
} from '../lib/userLibraryExport';
import type {
  AppPersistedStateV1,
  ConnSmytheUiState,
  IndexFiltersState,
  IndexSortState,
  PlayoffPredictorPersistedState,
  ThemePreference,
} from '../types/persistence';

const RECENT_SLUGS_CAP = 20;

export type UserLibraryImportMode = 'merge' | 'replace';

export interface UserLibraryImportResult {
  ok: boolean;
  error?: string;
}

export interface PersistenceApi {
  state: AppPersistedStateV1;
  setIndexFilters: (partial: Partial<IndexFiltersState>) => void;
  setIndexSort: (sort: IndexSortState) => void;
  toggleFavorite: (franchiseId: string) => void;
  setTeamNote: (franchiseId: string, note: string) => void;
  setLastViewedSlug: (slug: string) => void;
  setTheme: (theme: ThemePreference) => void;
  setComparePair: (a: string | undefined, b: string | undefined) => void;
  setConnSmytheUi: (partial: Partial<ConnSmytheUiState>) => void;
  setPlayoffPredictor: (partial: Partial<PlayoffPredictorPersistedState>) => void;
  /** JSON string suitable for download (favorites + team notes only). */
  exportUserLibraryJson: () => string;
  importUserLibrary: (json: string, mode: UserLibraryImportMode) => UserLibraryImportResult;
}

const PersistenceContext = createContext<PersistenceApi | null>(null);

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppPersistedStateV1>(() => loadPersistedState());

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  const setIndexFilters = useCallback((partial: Partial<IndexFiltersState>) => {
    setState((prev) => ({
      ...prev,
      indexFilters: { ...prev.indexFilters, ...partial },
    }));
  }, []);

  const setIndexSort = useCallback((indexSort: IndexSortState) => {
    setState((prev) => ({ ...prev, indexSort }));
  }, []);

  const toggleFavorite = useCallback((franchiseId: string) => {
    setState((prev) => {
      const has = prev.favorites.includes(franchiseId);
      const favorites = has
        ? prev.favorites.filter((id) => id !== franchiseId)
        : [...prev.favorites, franchiseId];
      return { ...prev, favorites };
    });
  }, []);

  const setTeamNote = useCallback((franchiseId: string, note: string) => {
    setState((prev) => ({
      ...prev,
      teamNotes: { ...prev.teamNotes, [franchiseId]: note },
    }));
  }, []);

  const setLastViewedSlug = useCallback((slug: string) => {
    setState((prev) => {
      const recent = [slug, ...prev.recentlyViewedSlugs.filter((s) => s !== slug)].slice(
        0,
        RECENT_SLUGS_CAP,
      );
      return { ...prev, lastViewedSlug: slug, recentlyViewedSlugs: recent };
    });
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setComparePair = useCallback((a: string | undefined, b: string | undefined) => {
    setState((prev) => ({ ...prev, compareA: a, compareB: b }));
  }, []);

  const setConnSmytheUi = useCallback((partial: Partial<ConnSmytheUiState>) => {
    setState((prev) => ({
      ...prev,
      connSmythe: { ...prev.connSmythe, ...partial },
    }));
  }, []);

  const setPlayoffPredictor = useCallback((partial: Partial<PlayoffPredictorPersistedState>) => {
    setState((prev) => ({
      ...prev,
      playoffPredictor: { ...prev.playoffPredictor, ...partial },
    }));
  }, []);

  const exportUserLibraryJson = useCallback(() => {
    return serializeUserLibraryExport(buildUserLibraryExport(state.favorites, state.teamNotes));
  }, [state.favorites, state.teamNotes]);

  const importUserLibrary = useCallback((json: string, mode: UserLibraryImportMode) => {
    const parsed = parseUserLibraryImport(json);
    if (!parsed) {
      return { ok: false, error: 'Invalid JSON or wrong format (expected userLibraryVersion 1).' };
    }
    setState((prev) => {
      if (mode === 'replace') {
        return {
          ...prev,
          favorites: [...parsed.favorites],
          teamNotes: { ...parsed.teamNotes },
        };
      }
      return {
        ...prev,
        favorites: [...new Set([...prev.favorites, ...parsed.favorites])],
        teamNotes: { ...prev.teamNotes, ...parsed.teamNotes },
      };
    });
    return { ok: true };
  }, []);

  const value = useMemo<PersistenceApi>(
    () => ({
      state,
      setIndexFilters,
      setIndexSort,
      toggleFavorite,
      setTeamNote,
      setLastViewedSlug,
      setTheme,
      setComparePair,
      setConnSmytheUi,
      setPlayoffPredictor,
      exportUserLibraryJson,
      importUserLibrary,
    }),
    [
      state,
      setIndexFilters,
      setIndexSort,
      toggleFavorite,
      setTeamNote,
      setLastViewedSlug,
      setTheme,
      setComparePair,
      setConnSmytheUi,
      setPlayoffPredictor,
      exportUserLibraryJson,
      importUserLibrary,
    ],
  );

  return (
    <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>
  );
}

export function usePersistence(): PersistenceApi {
  const ctx = useContext(PersistenceContext);
  if (!ctx) {
    throw new Error('usePersistence must be used within PersistenceProvider');
  }
  return ctx;
}
