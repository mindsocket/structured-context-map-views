import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { loadConfig } from 'structured-context/api';
import { exportSnapshot } from '../src/node/snapshot';

const sample = join(import.meta.dir, '../../../samples/launch-playbook');

describe('exportSnapshot', () => {
  test('assembles graph, validation and the definitions for the space schema', async () => {
    const config = loadConfig({ startDir: sample });
    const result = await exportSnapshot('launch-playbook', config, sample);
    expect(result.space).toBe('launch-playbook');
    expect(result.graph.nodes.length).toBeGreaterThan(0);
    expect(result.validation).toHaveProperty('issues');
    expect(result.definitions.every((d) => d.schema === undefined || d.schema === result.schemaId)).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  test('passes validation options to validateSpace', async () => {
    // The sample has no rule issues to filter, so an invalid filter is what shows the option arrives.
    const config = loadConfig({ startDir: sample });
    await expect(exportSnapshot('launch-playbook', config, sample, { ruleFilter: ['nonsense'] })).rejects.toThrow(
      /Invalid rule filter/,
    );
  });
});
