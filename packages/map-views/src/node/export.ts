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

/** The `validateSpace` options `export` passes through unchanged. */
export type ExportValidateOptions = Pick<
  NonNullable<Parameters<typeof validateSpace>[1]>,
  'depth' | 'includeGated' | 'semantic' | 'ruleFilter'
>;

/**
 * Node-only: assemble a space for a browser-only host. Validation is structured-context's own
 * `validateSpace`; rules that need an AI judge run only when `semantic` is passed.
 */
export async function exportSpace(
  spaceName: string,
  config: Config,
  configDir?: string,
  validateOptions: ExportValidateOptions = {},
): Promise<SpaceExport> {
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
