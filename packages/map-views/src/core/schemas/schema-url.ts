/**
 * Where the format schemas are published. `latest` follows the newest format; a release that changes it
 * freezes a copy under its own version folder (`bun run generate:schemas --release`).
 */
export const SCHEMA_BASE_URL =
  'https://raw.githubusercontent.com/mindsocket/structured-context-map-views/main/schemas/generated';

/** Base of the `$id`s the sources use: the `latest` folder. */
export const SCHEMA_URL = `${SCHEMA_BASE_URL}/latest` as const;
