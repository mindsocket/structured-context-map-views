import type { SpaceGraph } from 'structured-context/api';
import { spaceGraphFrom } from 'structured-context/browser';
import type { SpaceResponse } from '../src/navigator/space-response';

/** Rebuild a captured fixture's graph, as the navigator does in the browser. */
export const fixtureGraph = (fixture: unknown): SpaceGraph => spaceGraphFrom((fixture as SpaceResponse).graph);
