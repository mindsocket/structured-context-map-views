import { assembleSpaceGraph, type Config, createSpaceContext, exportSpaceGraph } from 'structured-context/api';
import type { SpaceResponse } from '../space-response';

/** Load a space, narrowed by a filter (a view name or expression) when one is given. */
export async function loadSpace(spaceName: string, config: Config, filter?: string): Promise<SpaceResponse> {
  const context = createSpaceContext(spaceName, config);
  const graph = await assembleSpaceGraph(context, { filter });
  return {
    schemaId: context.schema.$id,
    graph: exportSpaceGraph(graph.nodes.values(), context.schema.metadata),
  };
}
