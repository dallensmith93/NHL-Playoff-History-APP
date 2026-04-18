import type { Franchise, TeamIdentity } from '../types/models';

/**
 * The identity row that represents present-day branding (active) or the final chapter (inactive).
 */
export function getCurrentIdentity(franchise: Franchise): TeamIdentity | undefined {
  const ids = franchise.lineage.identities;
  if (ids.length === 0) return undefined;
  if (franchise.isActive) {
    const open = ids.find((i) => !i.toSeason);
    if (open) return open;
  }
  return ids[ids.length - 1];
}

export function identityCount(franchise: Franchise): number {
  return franchise.lineage.identities.length;
}

export function hasMultipleIdentities(franchise: Franchise): boolean {
  return franchise.lineage.identities.length > 1;
}
