import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { loadConfig } from 'structured-context/api';
import { exportSpace } from '../src/node/export';

const sample = join(import.meta.dir, '../../../samples/launch-playbook');

describe('exportSpace', () => {
  test('assembles graph, validation and the definitions for the space schema', async () => {
    const config = loadConfig({ startDir: sample });
    const result = await exportSpace('launch-playbook', config, sample);
    expect(result.space).toBe('launch-playbook');
    expect(result.graph.formatVersion).toBe(1);
    expect(result.validation).toHaveProperty('nodeErrors');
    expect(result.definitions.every((d) => d.schema === result.schemaId)).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
