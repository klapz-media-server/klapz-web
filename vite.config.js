import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import artworkPlugin from './server/artworkPlugin.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_URL || 'http://127.0.0.1:32500';

  const proxy = {
    '/graphql': { target: apiTarget, changeOrigin: true },
    // Stream manifests, segments, files and subtitles handed out by startStream.
    '/streams': { target: apiTarget, changeOrigin: true },
  };

  return {
    // Public base path: `/` when served on its own, `/web/` when bundled with Klapz.
    base: env.VITE_PUBLIC_PATH || '/',
    plugins: [react(), artworkPlugin({ token: env.PLEX_TOKEN })],
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: { port: 5180, strictPort: true, proxy },
    preview: { port: 4173, proxy },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
