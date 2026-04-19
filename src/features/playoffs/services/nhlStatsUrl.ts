function useLocalViteProxy(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/**
 * Browser hits same-origin NHL proxy (avoids CORS).
 * - Dev / `vite preview` on localhost: `/nhl-stats/*` → Vite proxy → statsapi.
 * - Deployed (Netlify or any host): `/.netlify/functions/nhl-stats/*` → serverless proxy (Netlify edge redirects to NHL were returning 500).
 */
export function nhlApiPath(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (useLocalViteProxy()) {
    return `/nhl-stats/${p}`;
  }
  return `/.netlify/functions/nhl-stats/${p}`;
}

/** NHL Web schedule API (`api-web.nhle.com`) — used when Stats API schedule returns 5xx. */
export function nhleWebPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (useLocalViteProxy()) {
    return `/nhle-web${p}`;
  }
  return `/.netlify/functions/nhle-web${p}`;
}
