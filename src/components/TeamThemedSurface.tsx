import type { CSSProperties, ReactNode } from 'react';
import type { FranchiseColors } from '../types/models';

export function TeamThemedSurface({
  colors,
  children,
}: {
  colors: FranchiseColors;
  children: ReactNode;
}) {
  const style = {
    '--th-primary': colors.primary,
    '--th-secondary': colors.secondary,
    '--th-title': colors.onPrimary,
    '--th-sub': colors.onSecondary,
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
