/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type Config, PLUGIN_PREFIX, resolveConfigPath, resolvePluginDir, resourceDir } from 'structured-context/api';
import type { MapViewDefinition } from '../core/definition';
import { type DefinitionSource, readDefinitionFolders } from './read-definitions';

/**
 * Node-only: finds map view definitions the way structured-context finds plugin schemas.
 * Browser-only hosts receive the result from a server, like graph data.
 */

const DEFINITIONS_DIR = 'map-views';
const CONFIG_PLUGINS_DIR = 'plugins';

/**
 * Every map view definition available with `config`, found as docs/definitions.md describes.
 * Throws on the first invalid definition, including one outside its namespace or with a duplicate `$id`.
 *
 * `configDir` is the root of the main config file; it defaults to where structured-context finds it.
 */
export function loadMapViewDefinitions(config: Config, options: { configDir?: string } = {}): MapViewDefinition[] {
  const configDir = options.configDir ?? resolveConfigPath().root;
  const configDirs = [...new Set([configDir, ...config.spaces.flatMap((s) => (s.sourceDir ? [s.sourceDir] : []))])];

  const folders: { dir: string; source: DefinitionSource }[] = [
    ...pluginDirs(config, configDir, configDirs).flatMap(([plugin, dir]) => {
      const definitions = pluginDefinitionsDir(dir);
      return definitions ? [{ dir: definitions, source: { kind: 'plugin', plugin } as const }] : [];
    }),
    ...configDirs.flatMap((dir) => {
      const definitions = resourceDir(dir, DEFINITIONS_DIR);
      return definitions ? [{ dir: definitions, source: { kind: 'config' } as const }] : [];
    }),
  ];

  return readDefinitionFolders(folders);
}

/** Plugin short name → root directory, for plugins in a config root's plugins folder or named by the config. */
function pluginDirs(config: Config, configDir: string, configDirs: string[]): [string, string][] {
  const found = new Map<string, string>();
  const add = (name: string, fromDir: string) => {
    const short = name.startsWith(PLUGIN_PREFIX) ? name.slice(PLUGIN_PREFIX.length) : name;
    if (found.has(short)) return;
    const dir = resolvePluginDir(name, fromDir);
    if (dir) found.set(short, dir);
  };

  for (const dir of configDirs) {
    const plugins = resourceDir(dir, CONFIG_PLUGINS_DIR);
    if (!plugins) continue;
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
    const declared = JSON.parse(readFileSync(pkgPath, 'utf8')).sctx?.[DEFINITIONS_DIR];
    if (typeof declared === 'string') return resolve(pluginDir, declared);
  }
  return join(pluginDir, DEFINITIONS_DIR);
}
