/**
 * Writes dist/artifact.html: the page that loads dist/artifact.js in a Claude artifact. The artifact
 * viewer only runs scripts from a few CDNs and blocks external stylesheets, so the page loads this
 * package and its dependencies from jsDelivr through an import map and carries its CSS inline. Run
 * after the library build. Versions are the ones this package was built and tested with.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const root = join(import.meta.dir, '..');
const require = createRequire(join(root, 'package.json'));
const version = (name: string): string => {
  let dir = dirname(require.resolve(name));
  while (!(dir.endsWith(`node_modules/${name}`) || dir === '/')) dir = dirname(dir);
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
};
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name: string; version: string };

const CDN = 'https://cdn.jsdelivr.net/npm';
const react = version('react');
const reactDom = version('react-dom');
if (react !== reactDom) throw new Error(`react ${react} and react-dom ${reactDom} differ; the page pins one React.`);
// The package's own files are served as they are and import their dependencies by bare name; the import
// map points those at jsDelivr's `+esm` builds, which rewrite their own imports.
const esm = (spec: string) => `${CDN}/${spec}/+esm`;
const imports: Record<string, string> = {
  'structured-context/browser': esm(`structured-context@${version('structured-context')}/dist/browser.js`),
  react: esm(`react@${react}`),
  'react/jsx-runtime': esm(`react@${react}/jsx-runtime`),
  'react-dom': esm(`react-dom@${react}`),
  'react-dom/client': esm(`react-dom@${react}/client`),
  'ajv/dist/2020': esm(`ajv@${version('ajv')}/dist/2020.js`),
  json5: esm(`json5@${version('json5')}`),
};

const css = [join(root, 'dist/styles.css'), join(root, 'src/artifact/page.css')]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const entry = `${CDN}/${pkg.name}@${pkg.version}/dist/artifact.js`;
const page = `<title>Map view</title>
<style>
${css.replaceAll('</style', '<\\/style')}
</style>
<div id="root"></div>
<script type="importmap">${JSON.stringify({ imports })}</script>
<script type="module" src="${entry}"></script>
`;
writeFileSync(join(root, 'dist/artifact.html'), page);
console.log(`dist/artifact.html: ${(page.length / 1024).toFixed(0)} KB, ${pkg.name}@${pkg.version}`);
