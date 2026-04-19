import dns from 'node:dns';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vite's dev proxy uses Node to resolve upstream hostnames. A broken ISP / captive portal /
 * VPN DNS can yield `getaddrinfo ENOTFOUND statsapi.web.nhl.com` even though the browser works.
 * Default to public resolvers; opt out with `VITE_NHL_DNS_SERVERS=off` or set custom servers
 * (comma-separated), e.g. `VITE_NHL_DNS_SERVERS=1.1.1.1,8.8.8.8`.
 */
if (process.env.VITE_NHL_DNS_SERVERS !== 'off') {
  const custom = (process.env.VITE_NHL_DNS_SERVERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  dns.setServers(custom.length > 0 ? custom : ['8.8.8.8', '1.1.1.1']);
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/nhl-stats': {
        target: 'https://statsapi.web.nhl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nhl-stats/, '/api/v1'),
        secure: false,
      },
      '/nhle-web': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nhle-web/, ''),
        secure: true,
      },
    },
  },
  preview: {
    proxy: {
      '/nhl-stats': {
        target: 'https://statsapi.web.nhl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nhl-stats/, '/api/v1'),
        secure: false,
      },
      '/nhle-web': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nhle-web/, ''),
        secure: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
