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
export type SpaceSnapshot = {
  space: string;
  schemaId: string | undefined;
  graph: ReturnType<typeof exportSpaceGraph>;
  validation: Awaited<ReturnType<typeof validateSpace>>;
  definitions: MapViewDefinition[];
};

/** The `validateSpace` options `export` passes through unchanged. */
export type ExportValidateOptions = Pick<
  NonNullable<Parameters<typeof validateSpace>[1]>,
  'depth' | 'includeGated' | 'semantic' | 'ruleFilter'
>;

/**
 * Node-only: snapshot a space for a browser-only host. Validation is structured-context's own
 * `validateSpace`, which also decides whether a judge runs.
 */
export async function exportSnapshot(
  spaceName: string,
  config: Config,
  configDir?: string,
  validateOptions: ExportValidateOptions = {},
): Promise<SpaceSnapshot> {
  const context = createSpaceContext(spaceName, config);
  const graph = await assembleSpaceGraph(context, {});
  const schemaId = context.schema.$id;
  return {
    space: spaceName,
    schemaId,
    graph: exportSpaceGraph(graph.nodes.values(), context.schema.metadata),
    validation: await validateSpace(context, validateOptions),
    definitions: mapViewsForSchema(loadMapViewDefinitions(config, { configDir }), schemaId),
  };
}
