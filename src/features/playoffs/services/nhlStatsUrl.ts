function useLocalViteProxy(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/**
 * NHL Web schedule/scores (`api-web.nhle.com`), same-origin via dev proxy or Netlify function.
 */
export function nhleWebPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (useLocalViteProxy()) {
    return `/nhle-web${p}`;
  }
  return `/.netlify/functions/nhle-web${p}`;
}
