/** Writes dist/page.html, the page template with its JS and CSS inlined. Run after the library build. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE_SLOTS } from '../src/node/page';

const root = join(import.meta.dir, '..');

const result = await Bun.build({
  entrypoints: [join(root, 'src/page/main.tsx')],
  target: 'browser',
  format: 'esm',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
if (!result.success) throw new AggregateError(result.logs, 'Bundling the page host failed');
if (result.outputs.length !== 1) throw new Error(`Expected one bundle, got ${result.outputs.length}.`);
// A script element ends at the first `</script`, wherever it appears
const js = (await result.outputs[0]!.text()).replaceAll('</script', '<\\/script');

const css = [join(root, 'dist/styles.css'), join(root, 'src/viewer/viewer.css')]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')
  .replaceAll('</style', '<\\/style');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${PAGE_SLOTS.title}</title>
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="sctx-snapshots">${PAGE_SLOTS.snapshots}</script>
<script type="module">${js}</script>
</body>
</html>
`;
writeFileSync(join(root, 'dist/page.html'), page);
console.log(`dist/page.html: ${(page.length / 1024).toFixed(0)} KB`);
