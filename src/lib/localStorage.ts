import type { AppPersistedStateV1 } from '../types/persistence';
import { defaultPersistedStateV1 } from '../types/persistence';

export const STORAGE_ROOT_KEY = 'nhl-franchise-history';
export const STORAGE_VERSION = 1;

export function storageKey(suffix: string): string {
  return `${STORAGE_ROOT_KEY}:v${STORAGE_VERSION}:${suffix}`;
}

const FULL_STATE_KEY = storageKey('app-state');

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function migrateRaw(raw: unknown): AppPersistedStateV1 {
  if (!isRecord(raw)) return { ...defaultPersistedStateV1 };
  const v = raw['version'];
  if (v !== 1) return { ...defaultPersistedStateV1 };

  const merged: AppPersistedStateV1 = {
    ...defaultPersistedStateV1,
    ...(raw as unknown as AppPersistedStateV1),
    indexFilters: {
      ...defaultPersistedStateV1.indexFilters,
      ...(isRecord(raw['indexFilters'])
        ? (raw['indexFilters'] as unknown as AppPersistedStateV1['indexFilters'])
        : {}),
    },
    indexSort: {
      ...defaultPersistedStateV1.indexSort,
      ...(isRecord(raw['indexSort'])
        ? (raw['indexSort'] as unknown as AppPersistedStateV1['indexSort'])
        : {}),
    },
    connSmythe: {
      ...defaultPersistedStateV1.connSmythe,
      ...(isRecord(raw['connSmythe'])
        ? (raw['connSmythe'] as unknown as AppPersistedStateV1['connSmythe'])
        : {}),
    },
    playoffPredictor: (() => {
      const ppRaw = isRecord(raw['playoffPredictor'])
        ? (raw['playoffPredictor'] as Record<string, unknown>)
        : {};
      const {
        lastQuickResultJson: _dropQuick,
        lastMonteCarloSummaryJson: _dropMc,
        ...ppRest
      } = ppRaw;
      return {
        ...defaultPersistedStateV1.playoffPredictor,
        ...(ppRest as unknown as AppPersistedStateV1['playoffPredictor']),
      };
    })(),
    teamNotes: isRecord(raw['teamNotes'])
      ? (raw['teamNotes'] as Record<string, string>)
      : {},
    favorites: Array.isArray(raw['favorites'])
      ? (raw['favorites'] as string[])
      : [],
    recentlyViewedSlugs: Array.isArray(raw['recentlyViewedSlugs'])
      ? (raw['recentlyViewedSlugs'] as string[]).filter((s): s is string => typeof s === 'string')
      : defaultPersistedStateV1.recentlyViewedSlugs,
  };
  return merged;
}

export function loadPersistedState(): AppPersistedStateV1 {
  try {
    const raw = localStorage.getItem(FULL_STATE_KEY);
    if (!raw) return { ...defaultPersistedStateV1 };
    return migrateRaw(JSON.parse(raw) as unknown);
  } catch {
    return { ...defaultPersistedStateV1 };
  }
}

export function savePersistedState(state: AppPersistedStateV1): void {
  try {
    localStorage.setItem(FULL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota or privacy mode */
  }
}
