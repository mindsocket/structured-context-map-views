import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sctxApi } from './src/server/sctx-api';

const librarySource = (path: string) => fileURLToPath(new URL(`../../packages/map-views/src/${path}`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), sctxApi()],
  resolve: {
    // The browser code runs the library from source, so edits show without rebuilding it.
    alias: [{ find: /^structured-context-map-views$/, replacement: librarySource('index.ts') }],
  },
  build: { outDir: 'dist' },
});
