/**
 * Write the map view definition schemas as JSON, for `$schema` references and editors.
 * The TypeScript sources in src/map-views/core/schemas are the source of truth.
 *
 *   bun run generate:schemas
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MAP_VIEW_SCHEMAS } from '../src/map-views/core/schemas';

export const GENERATED_DIR = join(import.meta.dir, '../schemas/generated');

/** `sctx-map-view://layouts/tree.json` → `<GENERATED_DIR>/layouts/tree.json`. */
export function generatedPath(id: string): string {
  return join(GENERATED_DIR, id.replace(/^sctx-map-view:\/\//, ''));
}

export function serialise(schema: object): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

if (import.meta.main) {
  for (const schema of MAP_VIEW_SCHEMAS) {
    const path = generatedPath(schema.$id);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serialise(schema));
    console.log(`Generated ${path}`);
  }
}
