import {
  assembleSpaceGraph,
  type Config,
  createSpaceContext,
  exportSpaceGraph,
  validateSpace,
} from 'structured-context/api';
import { type MapViewDefinition, mapViewsForSchema } from '../core/definition';
import { loadMapViewDefinitions } from './index';

/**
 * Everything a host without filesystem access needs to render a space: its graph, the validation
 * results that attach to nodes, and the map view definitions that apply to its schema. Plain JSON.
 */
export type SpaceExport = {
  space: string;
  schemaId: string | undefined;
  graph: ReturnType<typeof exportSpaceGraph>;
  validation: Awaited<ReturnType<typeof validateSpace>>;
  definitions: MapViewDefinition[];
};

/**
 * Node-only: assemble a space for a browser-only host. Validation runs no AI judge, so it costs
 * nothing; rules that need one are skipped.
 */
export async function exportSpace(spaceName: string, config: Config, configDir?: string): Promise<SpaceExport> {
  const context = createSpaceContext(spaceName, config);
  const graph = await assembleSpaceGraph(context, {});
  const schemaId = context.schema.$id;
  return {
    space: spaceName,
    schemaId,
    graph: exportSpaceGraph(graph.nodes.values(), context.schema.metadata),
    validation: await validateSpace(context),
    definitions: mapViewsForSchema(loadMapViewDefinitions(config, { configDir }), schemaId),
  };
}
