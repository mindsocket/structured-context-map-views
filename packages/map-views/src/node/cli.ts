#!/usr/bin/env bun
import { dirname, resolve } from 'node:path';
import { loadConfig, resolveConfigPath, SpaceNotFoundError } from 'structured-context/api';
import { exportSpace } from './export';

const USAGE = `Usage: structured-context-map-views export <space> [--config <file>]

Prints a space's graph, validation results and applicable map view definitions as one JSON document.`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command !== 'export') {
    console.error(command ? `Unknown command "${command}".\n\n${USAGE}` : USAGE);
    return command === '--help' || command === '-h' ? 0 : 2;
  }
  let configFile: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--config') configFile = rest[++i];
    else positional.push(rest[i]!);
  }
  const [space] = positional;
  if (!space || positional.length > 1 || (rest.includes('--config') && !configFile)) {
    console.error(USAGE);
    return 2;
  }
  try {
    if (configFile) process.env.SCTX_CONFIG = resolve(configFile);
    const config = loadConfig();
    const configDir = dirname(resolve(resolveConfigPath().path));
    console.log(JSON.stringify(await exportSpace(space, config, configDir)));
    return 0;
  } catch (err) {
    console.error(
      err instanceof SpaceNotFoundError ? err.message : `Error: ${err instanceof Error ? err.message : err}`,
    );
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
