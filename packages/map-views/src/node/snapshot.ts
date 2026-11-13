import {
  assembleSpaceGraph,
  type Config,
  createSpaceContext,
  exportSpaceGraph,
  validateSpace,
} from 'structured-context/api';
import { mapViewsForSchema } from '../core/definition';
import type { SpaceSnapshot } from '../core/snapshot';
import { loadMapViewDefinitions } from './index';

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
  const validation = await validateSpace(context, validateOptions);
  return {
    space: spaceName,
    schemaId,
    graph: exportSpaceGraph(graph.nodes.values(), context.schema.metadata),
    validation: { issues: validation.issues },
    definitions: mapViewsForSchema(loadMapViewDefinitions(config, { configDir }), schemaId),
  };
}
