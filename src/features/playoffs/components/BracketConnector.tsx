/**
 * SVG connectors between bracket columns (percentage coords, stretch vertically).
 */
export type BracketConnectorKind = 'r1-r2-east' | 'r2-cf-east' | 'cf-final-east' | 'r1-r2-west' | 'r2-cf-west' | 'cf-final-west';

const STROKE = 'currentColor';

export function BracketConnector({ kind }: { kind: BracketConnectorKind }) {
  const mirror = kind.endsWith('west');

  const pathsFor = (): string[] => {
    if (kind === 'r1-r2-east' || kind === 'r1-r2-west') {
      return [
        mirror
          ? 'M 100 12.5 L 70 12.5 L 70 25 L 0 25'
          : 'M 0 12.5 L 30 12.5 L 30 25 L 100 25',
        mirror
          ? 'M 100 37.5 L 70 37.5 L 70 25'
          : 'M 0 37.5 L 30 37.5 L 30 25',
        mirror
          ? 'M 100 62.5 L 70 62.5 L 70 75 L 0 75'
          : 'M 0 62.5 L 30 62.5 L 30 75 L 100 75',
        mirror
          ? 'M 100 87.5 L 70 87.5 L 70 75'
          : 'M 0 87.5 L 30 87.5 L 30 75',
      ];
    }
    if (kind === 'r2-cf-east' || kind === 'r2-cf-west') {
      return [
        mirror
          ? 'M 100 25 L 65 25 L 65 50 L 0 50'
          : 'M 0 25 L 35 25 L 35 50 L 100 50',
        mirror
          ? 'M 100 75 L 65 75 L 65 50'
          : 'M 0 75 L 35 75 L 35 50',
      ];
    }
    // cf-final: half-line into center column
    return mirror
      ? ['M 100 50 L 0 50']
      : ['M 0 50 L 100 50'];
  };

  return (
    <div className="playoff-bracket-connector" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="playoff-bracket-connector-svg">
        {pathsFor().map((d, i) => (
          <path key={i} d={d} fill="none" stroke={STROKE} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}
