import type { spaceGraphFrom } from 'structured-context/browser';
import type { ValidationInput } from '../core/annotations';
import type { MapViewDefinition } from '../core/definition';

/** A space as the artifact's db holds it: the `export` command's document with its parts as JSON strings. */
export type LoadedSpace = {
  name: string;
  schemaId: string | undefined;
  graph: Parameters<typeof spaceGraphFrom>[0];
  validation: ValidationInput;
  definitions: MapViewDefinition[];
};

const SPACES = 'spaces';
const TIMEOUT_MS = 10_000;

type Db = {
  collection(path: string): { get(): Promise<{ docs: { id: string; data(): Record<string, unknown> | undefined }[] }> };
};

/** Every space written to the artifact's `spaces` collection. Rejects with a message fit to show the viewer. */
export async function loadSpaces(): Promise<LoadedSpace[]> {
  const claude = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  const db = (claude ? await claude.use('db') : null) as Db | null;
  if (!db) throw new Error('This page needs the artifact database, which is not available to this viewer.');

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Reading the artifact database timed out.')), TIMEOUT_MS);
  });
  const snapshot = await Promise.race([db.collection(SPACES).get(), timeout]).finally(() => clearTimeout(timer));
  const spaces = snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    return data ? [toSpace(doc.id, data)] : [];
  });
  if (spaces.length === 0)
    throw new Error(`Nothing to show yet: no space has been written to "${SPACES}" in the artifact database.`);
  return spaces;
}

function toSpace(name: string, data: Record<string, unknown>): LoadedSpace {
  const json = (field: string) => {
    const value = data[field];
    if (typeof value !== 'string') throw new Error(`Space "${name}": missing "${field}" in the artifact database.`);
    return JSON.parse(value);
  };
  return {
    name,
    schemaId: typeof data.schemaId === 'string' ? data.schemaId : undefined,
    graph: json('graph'),
    validation: json('validation'),
    definitions: json('definitions'),
  };
}
