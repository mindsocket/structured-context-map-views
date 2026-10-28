import type { SpaceGraph } from 'structured-context/api';
import { spaceGraphFrom } from 'structured-context/browser';

/** Rebuild a captured fixture's graph, as a browser host does with a server's response. */
export const fixtureGraph = (fixture: unknown): SpaceGraph =>
  spaceGraphFrom((fixture as { graph: Parameters<typeof spaceGraphFrom>[0] }).graph);
