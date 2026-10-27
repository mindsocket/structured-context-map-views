/**
 * Capture SpaceData snapshots of real spaces as test fixtures.
 *
 *   bun scripts/capture-fixtures.ts <space>=<config path> [...]
 *
 * Writes tests/fixtures/<space>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadConfig, setConfigPath } from 'structured-context/api';
import { loadSpaceData } from '../src/navigator/server/load-space-data';

const outDir = join(import.meta.dir, '../tests/fixtures');
mkdirSync(outDir, { recursive: true });

for (const arg of process.argv.slice(2)) {
  const [space, configPath] = arg.split('=');
  if (!space || !configPath) throw new Error(`Expected <space>=<config path>, got "${arg}"`);
  setConfigPath(resolve(configPath));
  const data = await loadSpaceData(space, loadConfig());
  const file = join(outDir, `${space}.json`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${space}: ${data.nodes.length} nodes → ${file}`);
}
