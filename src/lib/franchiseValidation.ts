import type { Franchise } from '../types/models';
import { parseSeasonStartYear, seasonInRange } from './format';

export type ValidationSeverity = 'error' | 'warn' | 'info';

export interface FranchiseValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export function validateFranchise(
  franchise: Franchise,
  knownFranchiseIds: Set<string>,
): FranchiseValidationIssue[] {
  const issues: FranchiseValidationIssue[] = [];
  const ids = franchise.lineage.identities;

  if (ids.length === 0) {
    issues.push({
      severity: 'warn',
      code: 'identity.missing',
      message: 'No identity eras defined — lineage timeline cannot explain renames or relocations.',
    });
  }

  for (let i = 0; i < ids.length; i++) {
    const cur = ids[i];
    const prev = ids[i - 1];
    if (!cur) continue;
    if (prev) {
      const b = parseSeasonStartYear(cur.fromSeason);
      const a = parseSeasonStartYear(prev.fromSeason);
      if (b < a) {
        issues.push({
          severity: 'error',
          code: 'identity.order',
          message: `Identity "${cur.fullName}" starts before prior era "${prev.fullName}" — check chronological order.`,
        });
      }
      if (prev.toSeason) {
        const endPrev = parseSeasonStartYear(prev.toSeason);
        const startCur = parseSeasonStartYear(cur.fromSeason);
        if (startCur > endPrev + 1) {
          issues.push({
            severity: 'warn',
            code: 'identity.gap',
            message: `Possible gap between "${prev.fullName}" (${prev.toSeason}) and "${cur.fullName}".`,
          });
        }
        if (startCur < endPrev) {
          issues.push({
            severity: 'warn',
            code: 'identity.overlap',
            message: `Possible overlap: "${cur.fullName}" starts before "${prev.fullName}" ends.`,
          });
        }
      }
    }
    if (i > 0 && !cur.transitionFromPrior) {
      issues.push({
        severity: 'info',
        code: 'identity.transition_unset',
        message: `Consider setting transitionFromPrior on "${cur.fullName}" (rename vs relocation vs rebrand).`,
      });
    }
  }

  const firstId = ids[0];
  if (firstId && franchise.firstSeason !== firstId.fromSeason) {
    issues.push({
      severity: 'warn',
      code: 'franchise.firstSeason_mismatch',
      message: `firstSeason (${franchise.firstSeason}) ≠ first identity fromSeason (${firstId.fromSeason}).`,
    });
  }

  if (!franchise.isActive && franchise.lastSeason && ids.length > 0) {
    const lastId = ids[ids.length - 1];
    if (lastId?.toSeason && lastId.toSeason !== franchise.lastSeason) {
      issues.push({
        severity: 'warn',
        code: 'franchise.lastSeason_mismatch',
        message: `lastSeason (${franchise.lastSeason}) ≠ final identity toSeason (${lastId.toSeason}).`,
      });
    }
  }

  const boundsFrom = franchise.firstSeason;
  const boundsTo = franchise.lastSeason;

  const outOfBounds = (season: string) => {
    if (!boundsTo) return !seasonInRange(season, boundsFrom);
    return !seasonInRange(season, boundsFrom, boundsTo);
  };

  for (const p of franchise.playoffAppearances) {
    if (outOfBounds(p.season)) {
      issues.push({
        severity: 'warn',
        code: 'playoff.out_of_bounds',
        message: `Playoff row ${p.season} is outside franchise first/last season bounds.`,
      });
      break;
    }
  }

  for (const pred of franchise.lineage.predecessorFranchiseIds ?? []) {
    if (!knownFranchiseIds.has(pred)) {
      issues.push({
        severity: 'error',
        code: 'lineage.predecessor_unknown',
        message: `predecessorFranchiseIds references unknown id "${pred}".`,
      });
    }
  }
  const succ = franchise.lineage.successorFranchiseId;
  if (succ && !knownFranchiseIds.has(succ)) {
    issues.push({
      severity: 'error',
      code: 'lineage.successor_unknown',
      message: `successorFranchiseId references unknown id "${succ}".`,
    });
  }
  const cont = franchise.lineage.continuesFranchiseId;
  if (cont && !knownFranchiseIds.has(cont)) {
    issues.push({
      severity: 'error',
      code: 'lineage.continues_unknown',
      message: `continuesFranchiseId references unknown id "${cont}".`,
    });
  }

  if (franchise.isPlaceholder && franchise.playoffAppearances.length > 0) {
    issues.push({
      severity: 'info',
      code: 'placeholder.has_playoffs',
      message:
        'Franchise is still flagged incomplete but has playoff rows — confirm data or mark as complete.',
    });
  }

  const playoffSeasons = franchise.playoffAppearances.map((p) => p.season);
  const dup = playoffSeasons.filter((s, i) => playoffSeasons.indexOf(s) !== i);
  if (dup.length > 0) {
    issues.push({
      severity: 'info',
      code: 'playoff.duplicate_seasons',
      message:
        'Duplicate playoff seasons in array (not always wrong — deduped for totals). Example: ' +
        [...new Set(dup)][0],
    });
  }

  return issues;
}
