import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Library build of the embeddable map-views modules, so hosts consume plain ES modules and
 * declarations instead of compiling this package's TypeScript and JSX themselves.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/map-views',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        core: 'src/map-views/core/index.ts',
        layouts: 'src/map-views/layouts/index.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      // Hosts provide these, so each host keeps a single React instance.
      external: [/^react(\/|$)/, /^react-dom(\/|$)/, 'json5', /^structured-context(\/|$)/],
    },
  },
});
