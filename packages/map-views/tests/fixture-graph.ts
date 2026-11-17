import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSpaceContext, exportSpaceGraph, type SpaceGraph, type SpaceNode } from 'structured-context/api';
import { spaceGraphFrom } from 'structured-context/browser';

/** Rebuild a captured fixture's graph, as a browser host does with a server's response. */
export const fixtureGraph = (fixture: unknown): SpaceGraph =>
  spaceGraphFrom((fixture as { graph: Parameters<typeof spaceGraphFrom>[0] }).graph);

/**
 * Build a graph from a fixture folder holding `schema.json` and `nodes.jsonl`: parsed nodes, one per
 * line, as `sctx dump <space>` prints them (resolved fields included). Nodes keep the file's order.
 */
export function jsonlFixtureGraph(dir: string): SpaceGraph {
  const path = (file: string) => join(import.meta.dir, 'fixtures', dir, file);
  const nodes = readFileSync(path('nodes.jsonl'), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as SpaceNode);
  const { metadata } = createSpaceContext(
    dir,
    { spaces: [{ name: dir, path: path('.'), schema: path('schema.json') }] },
    { configDir: path('.') },
  ).schema;
  return spaceGraphFrom(exportSpaceGraph(nodes, metadata));
}
