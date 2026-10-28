/**
 * Capture real spaces as test fixtures, in the shape a host's server sends them: the schema `$id` plus
 * structured-context's graph format.
 *
 *   bun run capture-fixtures <space>=<config path> [...]
 *
 * Writes tests/fixtures/<space>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  assembleSpaceGraph,
  createSpaceContext,
  exportSpaceGraph,
  loadConfig,
  setConfigPath,
} from 'structured-context/api';

const outDir = join(import.meta.dir, '../tests/fixtures');
mkdirSync(outDir, { recursive: true });

for (const arg of process.argv.slice(2)) {
  const [space, configPath] = arg.split('=');
  if (!space || !configPath) throw new Error(`Expected <space>=<config path>, got "${arg}"`);
  setConfigPath(resolve(configPath));
  const context = createSpaceContext(space, loadConfig());
  const graph = await assembleSpaceGraph(context);
  const data = { schemaId: context.schema.$id, graph: exportSpaceGraph(graph.nodes.values(), context.schema.metadata) };
  const file = join(outDir, `${space}.json`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${space}: ${data.graph.nodes.length} nodes → ${file}`);
}
