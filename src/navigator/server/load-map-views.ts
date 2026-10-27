import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { type MapViewDefinition, parseMapViewDefinition } from '../../map-views/core';

/** Read every `*.json5` map view definition in a directory. */
export function loadMapViews(dir: string): MapViewDefinition[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json5'))
    .sort()
    .map((file) => parseMapViewDefinition(basename(file, '.json5'), readFileSync(join(dir, file), 'utf8')));
}
