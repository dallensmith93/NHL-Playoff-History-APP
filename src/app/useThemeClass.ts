import { useEffect } from 'react';
import type { ThemePreference } from '../types/persistence';

export function useThemeClass(theme: ThemePreference) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (theme === 'dark') {
        root.dataset.theme = 'dark';
      } else if (theme === 'light') {
        root.dataset.theme = 'light';
      } else {
        root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}
