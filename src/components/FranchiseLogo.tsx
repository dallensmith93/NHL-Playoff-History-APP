import { useState, type CSSProperties } from 'react';
import type { Franchise } from '../types/models';

function initials(f: Franchise): string {
  const parts = f.currentDisplayName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    return `${a ?? ''}${b ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

export type FranchiseLogoSize = 'xs' | 'sm' | 'md' | 'lg';

const sizePx: Record<FranchiseLogoSize, number> = { xs: 32, sm: 40, md: 56, lg: 96 };

export function FranchiseLogo({
  franchise,
  size = 'md',
  className = '',
}: {
  franchise: Franchise;
  size?: FranchiseLogoSize;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const px = sizePx[size];
  const showImg = franchise.logoUrl && !broken;

  return (
    <div
      className={`franchise-logo franchise-logo--${size} ${className}`.trim()}
      style={
        {
          width: px,
          height: px,
          '--logo-accent': franchise.colors.primary,
        } as CSSProperties
      }
    >
      {showImg ? (
        <img
          src={franchise.logoUrl}
          alt={`${franchise.currentDisplayName} logo`}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="franchise-logo-fallback">{initials(franchise)}</span>
      )}
    </div>
  );
}
