/**
 * Relative luminance (sRGB), WCAG-style.
 */
function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const [r0, g0, b0] = [h[0], h[1], h[2]] as [string, string, string];
    const r = Number.parseInt(r0 + r0, 16);
    const g = Number.parseInt(g0 + g0, 16);
    const b = Number.parseInt(b0 + b0, 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (h.length !== 6) return null;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const R = channelToLinear(rgb.r);
  const G = channelToLinear(rgb.g);
  const B = channelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Contrast ratio between two colors.
 */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(fgHex) + 0.05;
  const L2 = relativeLuminance(bgHex) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

export function pickReadableText(
  bgHex: string,
  preferredLight: string,
  preferredDark: string,
): string {
  const light = contrastRatio(preferredLight, bgHex);
  const dark = contrastRatio(preferredDark, bgHex);
  return light >= dark ? preferredLight : preferredDark;
}

/** Subtle overlay for stacking text on noisy gradients */
export function panelBackdrop(primary: string): string {
  const lum = relativeLuminance(primary);
  const alpha = lum > 0.45 ? 0.12 : 0.18;
  return `linear-gradient(rgba(0,0,0,${alpha}), rgba(0,0,0,${alpha}))`;
}
