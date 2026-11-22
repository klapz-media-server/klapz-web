import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import artworkPlugin from './server/artworkPlugin.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Public base path: `/` when served on its own, `/web/` when bundled with Klapz.
    base: env.VITE_PUBLIC_PATH || '/',
    plugins: [react(), artworkPlugin({ token: env.PLEX_TOKEN })],
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    server: { port: 5180, strictPort: true },
    preview: { port: 4173 },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
