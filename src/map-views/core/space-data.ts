import type { Hierarchy, SpaceNode } from 'structured-context/api';

/** A space as handed to map views by a host. Plain data, so it can cross a server/browser boundary. */
export type SpaceData = {
  space: string;
  /** `$id` of the space's schema; map view definitions target schemas by this id. */
  schemaId: string | undefined;
  hierarchy: Hierarchy | undefined;
  nodes: SpaceNode[];
};
