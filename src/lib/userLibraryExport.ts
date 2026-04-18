/**
 * Portable bundle for favorites + notes only (not full app state).
 * Version independently of `AppPersistedStateV1.version`.
 */
export const USER_LIBRARY_EXPORT_VERSION = 1;

export interface UserLibraryExportV1 {
  userLibraryVersion: 1;
  exportedAt: string;
  favorites: string[];
  teamNotes: Record<string, string>;
}

export function buildUserLibraryExport(favorites: string[], teamNotes: Record<string, string>): UserLibraryExportV1 {
  return {
    userLibraryVersion: 1,
    exportedAt: new Date().toISOString(),
    favorites: [...favorites],
    teamNotes: { ...teamNotes },
  };
}

export function serializeUserLibraryExport(data: UserLibraryExportV1): string {
  return JSON.stringify(data, null, 2);
}

export function parseUserLibraryImport(raw: string): UserLibraryExportV1 | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const o = v as Record<string, unknown>;
    if (o['userLibraryVersion'] !== 1) return null;
    const favorites = o['favorites'];
    const teamNotes = o['teamNotes'];
    if (!Array.isArray(favorites) || !favorites.every((x) => typeof x === 'string')) return null;
    if (!teamNotes || typeof teamNotes !== 'object' || Array.isArray(teamNotes)) return null;
    const notes: Record<string, string> = {};
    for (const [k, val] of Object.entries(teamNotes)) {
      if (typeof val === 'string') notes[k] = val;
    }
    return {
      userLibraryVersion: 1,
      exportedAt: typeof o['exportedAt'] === 'string' ? o['exportedAt'] : '',
      favorites: favorites as string[],
      teamNotes: notes,
    };
  } catch {
    return null;
  }
}
