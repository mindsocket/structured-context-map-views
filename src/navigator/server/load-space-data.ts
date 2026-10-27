import { assembleSpaceGraph, type Config, createSpaceContext } from 'structured-context/api';
import type { SpaceData } from '../../map-views/core';

/** Load a space, narrowed by a filter (a view name or expression) when one is given. */
export async function loadSpaceData(spaceName: string, config: Config, filter?: string): Promise<SpaceData> {
  const context = createSpaceContext(spaceName, config);
  const graph = await assembleSpaceGraph(context, { filter });
  return {
    space: spaceName,
    schemaId: context.schema.$id,
    hierarchy: graph.hierarchy,
    nodes: [...graph.nodes.values()],
  };
}
