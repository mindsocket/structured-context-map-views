#!/usr/bin/env bun
import { dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig, resolveConfigPath, SctxError, setConfigPath } from 'structured-context/api';
import packageJson from '../../package.json' with { type: 'json' };
import { type ExportValidateOptions, exportSpace } from './export';

const program = new Command();

program
  .name('structured-context-map-views')
  .description('Map view tools for structured-context spaces')
  .version(packageJson.version)
  .option('--config <path>', 'Path to config file (overrides config discovery)');

program
  .command('export')
  .description("Print a space's graph, validation results and map view definitions as one JSON document")
  .argument('<space-name>', 'Space name')
  .option('--depth <n>', 'Validate only hierarchy nodes within N levels from the top', (v) => parseInt(v, 10))
  .option('--include-gated', 'Evaluate rules even on nodes gated by an upstream failure')
  .option(
    '--rule-filter <dimension=values>',
    'Evaluate only matching rules; dimensions: category, severity, type, id (repeatable, e.g. severity=error)',
    (v: string, prev: string[] = []) => [...prev, v],
  )
  .option('--semantic [provider]', 'Evaluate semantic rules, with the configured model provider or the one named')
  .action(async (spaceName: string, options: ExportValidateOptions) => {
    setConfigPath(program.opts().config);
    try {
      const config = loadConfig();
      const configDir = dirname(resolve(resolveConfigPath().path));
      const result = await exportSpace(spaceName, config, configDir, options);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } catch (err) {
      if (!(err instanceof SctxError)) throw err;
      console.error(`${err.code}: ${err.message}`);
      process.exitCode = 1;
    }
  });

await program.parseAsync();
