import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Library build, so hosts consume plain ES modules and declarations instead of compiling this
 * package's TypeScript and JSX themselves. Two entry points: the package root and `/node`.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        node: 'src/node/index.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      // Hosts provide React and structured-context, so each host keeps a single copy of both.
      // The other dependencies are installed with the package.
      external: [/^node:/, /^react(\/|$)/, /^react-dom(\/|$)/, /^ajv(\/|$)/, 'json5', /^structured-context(\/|$)/],
    },
  },
});
