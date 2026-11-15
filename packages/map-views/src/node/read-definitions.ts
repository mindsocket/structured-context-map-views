import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { type MapViewDefinition, parseMapViewDefinition } from '../core/definition';
import { BUNDLED_DEFINITIONS } from './bundled-definitions';

const SCHEME = 'sctx-map-view://';
const PACKAGE_NAME = 'structured-context-map-views';

export type DefinitionSource = { kind: 'core' } | { kind: 'plugin'; plugin: string } | { kind: 'config' };

/**
 * Definitions in `folders` and this package's embedded ones, each checked against the namespace of its source.
 * Throws on the first invalid definition or a repeated id.
 */
export function readDefinitionFolders(folders: { dir: string; source: DefinitionSource }[]): MapViewDefinition[] {
  const foundAt = new Map<string, string>();
  const definitions: MapViewDefinition[] = [];
  const add = (label: string, text: string, source: DefinitionSource) => {
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

function assertIdNamespace(id: string, source: DefinitionSource, path: string): void {
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
