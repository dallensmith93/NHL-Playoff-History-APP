import type { IdentityTransition } from '../types/models';

const LABELS: Record<IdentityTransition, string> = {
  founding: 'Founding identity',
  continuation: 'Continuation',
  rename: 'Rename',
  relocation: 'Relocation',
  rebrand: 'Rebrand',
  merger: 'Merger',
  ceased: 'Franchise ceased',
};

export function formatIdentityTransition(t?: IdentityTransition): string {
  if (!t) return 'Unspecified transition';
  return LABELS[t];
}
