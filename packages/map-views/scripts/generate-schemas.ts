/**
 * Write the map view definition schemas as JSON, for `$schema` references and editors.
 * The TypeScript sources in src/core/schemas are the source of truth.
 *
 *   bun run generate:schemas              writes generated/latest/
 *   bun run generate:schemas --release    also freezes generated/<version>/ when the format changed
 *
 * Version folders are named after the release that first ships a format, and never change once written.
 * Their `$id`s and `$ref`s point at their own folder; `latest` keeps the `latest` URLs.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pkg from '../package.json';
import { MAP_VIEW_SCHEMAS } from '../src/core/schemas';
import { SCHEMA_BASE_URL, SCHEMA_URL } from '../src/core/schemas/schema-url';

export const GENERATED_DIR = join(import.meta.dir, '../../../schemas/generated');
const VERSION_FOLDER = /^\d+\.\d+\.\d+$/;

/** `<SCHEMA_URL>/layouts/tree.json` → `<GENERATED_DIR>/<folder>/layouts/tree.json`. */
export function generatedPath(id: string, folder = 'latest'): string {
  if (!id.startsWith(`${SCHEMA_URL}/`)) throw new Error(`Schema $id outside ${SCHEMA_URL}: ${id}`);
  return join(GENERATED_DIR, folder, id.slice(SCHEMA_URL.length + 1));
}

/** The schema as written to `folder`: its URLs repointed from `latest` to that folder. */
export function serialise(schema: object, folder = 'latest'): string {
  const json = `${JSON.stringify(schema, null, 2)}\n`;
  return json.replaceAll(`${SCHEMA_URL}/`, `${SCHEMA_BASE_URL}/${folder}/`);
}

function compareVersions(a: string, b: string): number {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) {
    const diff = (pa?.[i] ?? 0) - (pb?.[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Whether the current schemas differ from those frozen in the newest version folder, or there is none. */
function changedSinceNewestRelease(): boolean {
  const newest = existsSync(GENERATED_DIR)
    ? readdirSync(GENERATED_DIR)
        .filter((name) => VERSION_FOLDER.test(name))
        .sort(compareVersions)
        .at(-1)
    : undefined;
  if (!newest) return true;
  return MAP_VIEW_SCHEMAS.some((schema) => {
    const path = generatedPath(schema.$id, newest);
    return !existsSync(path) || readFileSync(path, 'utf8') !== serialise(schema, newest);
  });
}

function write(folder: string) {
  for (const schema of MAP_VIEW_SCHEMAS) {
    const path = generatedPath(schema.$id, folder);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serialise(schema, folder));
    console.log(`Generated ${path}`);
  }
}

if (import.meta.main) {
  write('latest');
  if (process.argv.includes('--release') && changedSinceNewestRelease()) {
    if (existsSync(join(GENERATED_DIR, pkg.version)))
      throw new Error(`Schema folder ${pkg.version} already exists; released versions are immutable.`);
    write(pkg.version);
  }
}
