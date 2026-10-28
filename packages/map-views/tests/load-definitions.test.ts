import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Config } from 'structured-context/api';
import { loadMapViewDefinitions } from '../src/node';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'map-views-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
const definition = (id: string) =>
  `{ $id: '${id}', schema: 'sctx://x', regions: [{ id: 'main', layout: { type: 'tree' } }] }`;
const noSpaces: Config = { spaces: [] };
const ids = (config: Config, configDir = join(root, 'config')) =>
  loadMapViewDefinitions(config, { configDir }).map((d) => d.id);

describe('loadMapViewDefinitions', () => {
  test('finds bundled, plugin and config folder definitions', () => {
    write('config/plugins/sctx-conventional/map-views/a.json5', definition('sctx-map-view://conventional/a'));
    write('config/plugins/sctx-declared/package.json', JSON.stringify({ sctx: { mapViews: 'views' } }));
    write('config/plugins/sctx-declared/views/b.json5', definition('sctx-map-view://declared/b'));
    write('config/map-views/c.json5', definition('sctx-map-view://c'));
    expect(ids(noSpaces)).toEqual([
      'sctx-map-view://core/strategy-tree',
      'sctx-map-view://conventional/a',
      'sctx-map-view://declared/b',
      'sctx-map-view://c',
    ]);
  });

  test('includes plugins named by a space and the folders of included configs', () => {
    write('included/node_modules/sctx-named/map-views/a.json5', definition('sctx-map-view://named/a'));
    write('included/map-views/b.json5', definition('sctx-map-view://b'));
    const config: Config = {
      spaces: [
        {
          name: 's',
          path: '.',
          sourceDir: join(root, 'included'),
          plugins: { named: {} },
        },
      ],
    };
    expect(ids(config)).toEqual(['sctx-map-view://core/strategy-tree', 'sctx-map-view://named/a', 'sctx-map-view://b']);
  });

  test.each([
    ['config/map-views/a.json5', 'sctx-map-view://core/a', /Use the form "sctx-map-view:\/\/<name>"/],
    ['config/plugins/sctx-p/map-views/a.json5', 'sctx-map-view://a', /Use the form "sctx-map-view:\/\/p\/<name>"/],
    ['config/plugins/sctx-p/map-views/a.json5', 'sctx-map-view://q/a', /Use the form "sctx-map-view:\/\/p\/<name>"/],
    ['config/plugins/sctx-core/map-views/a.json5', 'sctx-map-view://core/a', /namespace violation/],
  ])('rejects %s with $id %s', (path, id, message) => {
    write(path, definition(id));
    expect(() => ids(noSpaces)).toThrow(message);
  });

  test('rejects two definitions with the same id', () => {
    write('config/map-views/a.json5', definition('sctx-map-view://a'));
    write('included/map-views/a.json5', definition('sctx-map-view://a'));
    const config: Config = { spaces: [{ name: 's', path: '.', sourceDir: join(root, 'included') }] };
    expect(() => ids(config)).toThrow(/"sctx-map-view:\/\/a" is defined by both/);
  });
});
