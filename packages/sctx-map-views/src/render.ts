import type { PluginContext } from 'structured-context/api';
import { mapViewsForSchema } from 'structured-context-map-views';
import { fillPage, readDefinitionFolders } from 'structured-context-map-views/node';
import pageTemplate from 'structured-context-map-views/page.html' with { type: 'text' };

const DEFINITIONS = 'map-views';

type Snapshot = Parameters<typeof fillPage>[1][number];

/** The `-d` options that reach validation, with the same names as the `validate` command's flags. */
function validateOptions(data: Record<string, unknown> | undefined) {
  const { semantic, depth, ruleFilter, includeGated } = data ?? {};
  return {
    semantic: semantic === 'true' ? true : (semantic as string | undefined),
    depth: depth === undefined ? undefined : Number(depth),
    ruleFilter: typeof ruleFilter === 'string' ? ruleFilter.split(',') : undefined,
    includeGated: includeGated === 'true' ? true : undefined,
  };
}

export async function renderHtml(context: PluginContext, data: Record<string, unknown> | undefined): Promise<string> {
  const { validate, exportGraph, resourceDirs } = context.callbacks ?? {};
  if (!validate || !exportGraph || !resourceDirs)
    throw new Error('This renderer needs a structured-context version that passes render callbacks.');

  const schemaId = context.schema.$id;
  const snapshot: Snapshot = {
    space: context.space.name,
    schemaId,
    graph: exportGraph(),
    validation: { issues: await validate(validateOptions(data)) },
    definitions: mapViewsForSchema(
      readDefinitionFolders(
        resourceDirs(DEFINITIONS).map(({ dir, plugin }) => ({
          dir,
          source: plugin ? { kind: 'plugin', plugin } : { kind: 'config' },
        })),
      ),
      schemaId,
    ),
  };
  return fillPage(pageTemplate, [snapshot], context.space.name);
}
