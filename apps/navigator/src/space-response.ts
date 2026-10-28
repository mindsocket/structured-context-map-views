import type { spaceGraphFrom } from 'structured-context/browser';

/**
 * A space as the dev server sends it: structured-context's graph format, plus the schema `$id` map view
 * definitions are matched by. The browser rebuilds the graph with `spaceGraphFrom`.
 */
export type SpaceResponse = {
  schemaId: string | undefined;
  graph: Parameters<typeof spaceGraphFrom>[0];
};
