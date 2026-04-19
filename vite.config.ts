import dns from 'node:dns';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Dev proxy uses Node for DNS. Broken ISP/VPN DNS can cause `ENOTFOUND` for proxied hosts.
 * Opt out with `VITE_NHL_DNS_SERVERS=off` or set comma-separated resolvers.
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
      '/nhle-web': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/nhle-web/, ''),
        secure: true,
      },
    },
  },
  preview: {
    proxy: {
      '/nhle-web': {
        target: 'https://api-web.nhle.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/nhle-web/, ''),
        secure: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
