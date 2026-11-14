/** Bundles the plugin into dist/index.js: the map views library and the page template are inlined, structured-context is not. */

import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const result = await Bun.build({
  entrypoints: [join(root, 'src/index.ts')],
  outdir: join(root, 'dist'),
  target: 'node',
  format: 'esm',
  external: ['structured-context', 'structured-context/*'],
});
if (!result.success) throw new AggregateError(result.logs, 'Bundling the plugin failed');
