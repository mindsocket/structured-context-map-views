/**
 * Bundles the plugin into dist/index.js: the map views library, the page template and structured-context's
 * issue kinds (`/types`, which holds plain data) are inlined, so the plugin needs no structured-context at runtime.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
if (!existsSync(join(root, '../map-views/dist/html.js')))
  throw new Error('Build the library first: bun run --cwd ../map-views build:library');
const result = await Bun.build({
  entrypoints: [join(root, 'src/index.ts')],
  outdir: join(root, 'dist'),
  target: 'node',
  format: 'esm',
  // A stray import of these fails `test:package` instead of bundling structured-context in.
  external: ['structured-context/api', 'structured-context/browser'],
});
if (!result.success) throw new AggregateError(result.logs, 'Bundling the plugin failed');
