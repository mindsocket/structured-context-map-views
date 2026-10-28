/**
 * Capture real spaces as test fixtures, in the shape the navigator's server sends them.
 *
 *   bun scripts/capture-fixtures.ts <space>=<config path> [...]
 *
 * Writes packages/map-views/tests/fixtures/<space>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig, setConfigPath } from 'structured-context/api';
import { loadSpace } from '../src/server/load-space';

const outDir = join(import.meta.dir, '../../../packages/map-views/tests/fixtures');
mkdirSync(outDir, { recursive: true });

for (const arg of process.argv.slice(2)) {
  const [space, configPath] = arg.split('=');
  if (!space || !configPath) throw new Error(`Expected <space>=<config path>, got "${arg}"`);
  setConfigPath(resolve(configPath));
  const data = await loadSpace(space, loadConfig());
  const file = join(outDir, `${space}.json`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${space}: ${data.graph.nodes.length} nodes → ${file}`);
}
