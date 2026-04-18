import { describe, expect, it } from 'vitest';
import { parseUserLibraryImport, serializeUserLibraryExport, buildUserLibraryExport } from '../lib/userLibraryExport';

describe('userLibraryExport', () => {
  it('round-trips favorites and notes', () => {
    const built = buildUserLibraryExport(['a', 'b'], { a: 'note', b: '' });
    const json = serializeUserLibraryExport(built);
    const parsed = parseUserLibraryImport(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.favorites).toEqual(['a', 'b']);
    expect(parsed!.teamNotes).toEqual({ a: 'note', b: '' });
  });

  it('rejects wrong version', () => {
    expect(parseUserLibraryImport(JSON.stringify({ userLibraryVersion: 2 }))).toBeNull();
  });

  it('rejects invalid favorites', () => {
    expect(
      parseUserLibraryImport(
        JSON.stringify({ userLibraryVersion: 1, favorites: [1], teamNotes: {} }),
      ),
    ).toBeNull();
  });
});
