import type { Franchise, FranchiseColors, TeamIdentity } from '../types/models';

export function resolveFranchiseColors(
  franchise: Franchise,
  identity?: TeamIdentity,
): FranchiseColors {
  const e = identity?.eraColors;
  if (!e) return franchise.colors;
  return {
    primary: e.primary ?? franchise.colors.primary,
    secondary: e.secondary ?? franchise.colors.secondary,
    accent: e.accent ?? franchise.colors.accent,
    onPrimary: e.onPrimary ?? franchise.colors.onPrimary,
    onSecondary: e.onSecondary ?? franchise.colors.onSecondary,
  };
}
