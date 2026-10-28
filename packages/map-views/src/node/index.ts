/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { type Config, PLUGIN_PREFIX, resolveConfigPath, resolvePluginDir } from 'structured-context/api';
import { type MapViewDefinition, parseMapViewDefinition } from '../core';
import { BUNDLED_DEFINITIONS } from './bundled-definitions';

/**
 * Node-only: finds map view definitions the way structured-context finds plugin schemas.
 * Browser-only hosts receive the result from a server, like graph data.
 */

const SCHEME = 'sctx-map-view://';
const DEFINITIONS_DIR = 'map-views';
const CONFIG_PLUGINS_DIR = 'plugins';
const PACKAGE_NAME = 'structured-context-map-views';

type Source = { kind: 'core' } | { kind: 'plugin'; plugin: string } | { kind: 'config' };

export type LoadMapViewDefinitionsOptions = {
  /** Directory of the main config file. Defaults to where structured-context finds it. */
  configDir?: string;
};

/**
 * Every map view definition available with `config`, from:
 * - this package's embedded definitions (`sctx-map-view://core/<name>`), for structured-context's bundled schemas;
 * - each plugin found from a config folder or named by a space (`sctx-map-view://<plugin>/<name>`): the
 *   folder named by `"sctx": { "mapViews": "…" }` in its package.json, else its `map-views/` folder;
 * - a `map-views/` folder next to each config file (`sctx-map-view://<name>`).
 *
 * Each definition's `$id` must be in the namespace of where it was found, and ids must be unique.
 * Throws on the first invalid definition.
 */
export function loadMapViewDefinitions(
  config: Config,
  options: LoadMapViewDefinitionsOptions = {},
): MapViewDefinition[] {
  const configDir = options.configDir ?? dirname(resolve(resolveConfigPath().path));
  const configDirs = [...new Set([configDir, ...config.spaces.flatMap((s) => (s.sourceDir ? [s.sourceDir] : []))])];

  const folders: { dir: string; source: Source }[] = [
    ...pluginDirs(config, configDir, configDirs).flatMap(([plugin, dir]) => {
      const definitions = pluginDefinitionsDir(dir);
      return definitions ? [{ dir: definitions, source: { kind: 'plugin', plugin } as const }] : [];
    }),
    ...configDirs.map((dir) => ({ dir: join(dir, DEFINITIONS_DIR), source: { kind: 'config' } as const })),
  ];

  const foundAt = new Map<string, string>();
  const definitions: MapViewDefinition[] = [];
  const add = (label: string, text: string, source: Source) => {
    const definition = parseMapViewDefinition(label, text);
    assertIdNamespace(definition.id, source, label);
    const existing = foundAt.get(definition.id);
    if (existing) throw new Error(`Map view id "${definition.id}" is defined by both ${existing} and ${label}.`);
    foundAt.set(definition.id, label);
    definitions.push(definition);
  };

  for (const [file, text] of Object.entries(BUNDLED_DEFINITIONS))
    add(`${PACKAGE_NAME}/${file}`, text, { kind: 'core' });
  for (const { dir, source } of folders) {
    if (!isDirectory(dir)) continue;
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith('.json5'))
      .sort()) {
      const path = join(dir, file);
      add(path, readFileSync(path, 'utf8'), source);
    }
  }
  return definitions;
}

/** Plugin short name → root directory, for plugins in a config folder's `plugins/` or named by the config. */
function pluginDirs(config: Config, configDir: string, configDirs: string[]): [string, string][] {
  const found = new Map<string, string>();
  const add = (name: string, fromDir: string) => {
    const short = name.startsWith(PLUGIN_PREFIX) ? name.slice(PLUGIN_PREFIX.length) : name;
    if (found.has(short)) return;
    const dir = resolvePluginDir(name, fromDir);
    if (dir) found.set(short, dir);
  };

  for (const dir of configDirs) {
    const plugins = join(dir, CONFIG_PLUGINS_DIR);
    if (!isDirectory(plugins)) continue;
    for (const entry of readdirSync(plugins)
      .filter((e) => e.startsWith(PLUGIN_PREFIX))
      .sort())
      add(entry, dir);
  }
  const topLevel = (config as { plugins?: Record<string, unknown> }).plugins ?? {};
  for (const name of Object.keys(topLevel)) add(name, configDir);
  for (const space of config.spaces) {
    const fromDir = space.sourceDir ?? configDir;
    // A schema named through a plugin, e.g. "sctx-wardley-mapping/wardley_map.json".
    const schemaPlugin = /^([^./][^/]*)\/./.exec(space.schema ?? '')?.[1];
    if (schemaPlugin) add(schemaPlugin, fromDir);
    for (const name of Object.keys(space.plugins ?? {})) add(name, fromDir);
  }
  return [...found];
}

function pluginDefinitionsDir(pluginDir: string): string | undefined {
  const pkgPath = join(pluginDir, 'package.json');
  if (existsSync(pkgPath)) {
    const declared = JSON.parse(readFileSync(pkgPath, 'utf8')).sctx?.mapViews;
    if (typeof declared === 'string') return resolve(pluginDir, declared);
  }
  return join(pluginDir, DEFINITIONS_DIR);
}

function assertIdNamespace(id: string, source: Source, path: string): void {
  const segments = id.slice(SCHEME.length).split('/');
  const expected =
    source.kind === 'core'
      ? `${SCHEME}core/<name>`
      : source.kind === 'plugin'
        ? `${SCHEME}${source.plugin}/<name>`
        : `${SCHEME}<name>`;
  const ok =
    source.kind === 'config'
      ? segments.length === 1
      : segments.length === 2 && segments[0] === (source.kind === 'core' ? 'core' : source.plugin);
  if (!ok || (source.kind === 'plugin' && source.plugin === 'core')) {
    throw new Error(`Map view namespace violation: ${path} has $id "${id}". Use the form "${expected}".`);
  }
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
