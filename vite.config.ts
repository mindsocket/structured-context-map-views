import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sctxApi } from './src/navigator/server/sctx-api';

export default defineConfig({
  plugins: [react(), tailwindcss(), sctxApi()],
  build: { outDir: 'dist/app' },
});
