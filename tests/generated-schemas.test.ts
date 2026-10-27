import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { generatedPath, serialise } from '../scripts/generate-schemas';
import { MAP_VIEW_SCHEMAS } from '../src/map-views/core';

test.each(MAP_VIEW_SCHEMAS.map((s) => [s.$id, s] as const))(
  'generated %s is up to date (bun run generate:schemas)',
  (id, schema) => {
    expect(readFileSync(generatedPath(id), 'utf8')).toBe(serialise(schema));
  },
);
