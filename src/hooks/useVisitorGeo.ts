import { useEffect, useState } from 'react';

const CACHE_KEY = 'nhl-app-visitor-geo-v1';
const CACHE_MS = 60 * 60 * 1000;

type CacheShape = { t: number; country: string; region: string; city?: string };

export type VisitorGeoState =
  | { status: 'pending' }
  | { status: 'ok'; label: string; country: string; region: string }
  | { status: 'unavailable' };

function formatLabel(c: { country: string; region?: string; city?: string }): string {
  const locality = [c.city, c.region].filter((x) => x && String(x).trim()).join(', ');
  if (!locality) return c.country;
  return `${locality} · ${c.country}`;
}

function readCache(): { status: 'ok'; label: string; country: string; region: string } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CacheShape;
    if (Date.now() - c.t > CACHE_MS || !c.country) return null;
    return {
      status: 'ok',
      country: c.country,
      region: c.region ?? '',
      label: formatLabel({ country: c.country, region: c.region, city: c.city }),
    };
  } catch {
    return null;
  }
}

/**
 * Rough area from the visitor’s connection (via a third-party lookup). Differs by IP / network;
 * NHL content in the app is the same for everyone.
 */
export function useVisitorGeo(): VisitorGeoState {
  const [state, setState] = useState<VisitorGeoState>(() => readCache() ?? { status: 'pending' });

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setState(cached);
      return;
    }

    const ctrl = new AbortController();
    const tid = window.setTimeout(() => ctrl.abort(), 8000);

    fetch('https://ipwho.is/', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { success?: boolean; country?: string; region?: string; city?: string }) => {
        if (!j.success || !j.country) {
          setState({ status: 'unavailable' });
          return;
        }
        const entry: CacheShape = {
          t: Date.now(),
          country: j.country,
          region: j.region ?? '',
          city: j.city,
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        } catch {
          /* ignore quota */
        }
        setState({
          status: 'ok',
          country: j.country,
          region: entry.region,
          label: formatLabel(entry),
        });
      })
      .catch(() => setState({ status: 'unavailable' }))
      .finally(() => clearTimeout(tid));

    return () => {
      clearTimeout(tid);
      ctrl.abort();
    };
  }, []);

  return state;
}
