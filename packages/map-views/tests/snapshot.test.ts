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
    expect(result.graph.formatVersion).toBe(1);
    expect(result.validation).toHaveProperty('issues');
    expect(result.definitions.every((d) => d.schema === result.schemaId)).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  test('passes validation options to validateSpace', async () => {
    const config = loadConfig({ startDir: sample });
    const all = await exportSnapshot('launch-playbook', config, sample);
    const none = await exportSnapshot('launch-playbook', config, sample, { ruleFilter: ['id=no-such-rule'] });
    expect(none.validation.ruleViolations).toEqual([]);
    expect(all.validation.ruleViolations!.length).toBeGreaterThanOrEqual(none.validation.ruleViolations!.length);
  });
});
