import type { CSSProperties } from 'react';
import { useVisitorGeo } from '../hooks/useVisitorGeo';

/** One line that varies by visitor network location; core app content does not. */
export function VisitorRegionNote({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const geo = useVisitorGeo();

  if (geo.status === 'pending' || geo.status === 'unavailable') {
    return null;
  }

  return (
    <p
      className={`visitor-region-note muted ${className}`.trim()}
      style={{ fontSize: '0.92rem', lineHeight: 1.45, ...style }}
    >
      <strong>Hello from near {geo.label}.</strong> Rosters, records, and stories here are the same for every fan —
      only this greeting uses your general area from your internet connection (nothing is saved on our side).
    </p>
  );
}
