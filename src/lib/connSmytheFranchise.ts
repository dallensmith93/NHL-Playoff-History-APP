import type { ConnSmytheWinner, Franchise } from '../types/models';

/**
 * Resolve the app franchise row for a Conn Smythe winner: explicit `franchiseId` first, then fuzzy `teamName` match.
 */
export function resolveFranchiseForConnWinner(
  winner: ConnSmytheWinner,
  franchises: Franchise[],
  byId: Map<string, Franchise>,
): Franchise | undefined {
  if (winner.franchiseId) {
    const direct = byId.get(winner.franchiseId);
    if (direct) return direct;
  }
  const norm = winner.teamName.trim().toLowerCase();
  return franchises.find((f) => {
    const d = f.currentDisplayName.toLowerCase();
    const n = f.franchiseName.toLowerCase();
    return (
      d === norm ||
      n === norm ||
      norm === `${f.lineage.identities[f.lineage.identities.length - 1]?.city.toLowerCase() ?? ''} ${f.lineage.identities[f.lineage.identities.length - 1]?.teamName.toLowerCase() ?? ''}`.trim() ||
      norm.includes(d) ||
      d.includes(norm)
    );
  });
}
