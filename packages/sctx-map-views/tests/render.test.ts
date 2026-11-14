import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PluginContext } from 'structured-context/api';
import plugin from '../src/index';

const DEFINITION =
  "{ $id: 'sctx-map-view://mine', schema: 'sctx://test', regions: [{ id: 'main', layout: { type: 'tree' } }] }";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'sctx-map-views-'));
  mkdirSync(join(dir, 'map-views'));
  writeFileSync(join(dir, 'map-views', 'mine.json5'), DEFINITION);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function context(overrides: Partial<NonNullable<PluginContext['callbacks']>> = {}) {
  const validateCalls: unknown[] = [];
  const callbacks = {
    validate: async (options: unknown) => {
      validateCalls.push(options);
      return [];
    },
    exportGraph: () => ({ nodes: [], hierarchy: undefined, hierarchies: [] }),
    resourceDirs: () => [{ dir: join(dir, 'map-views') }],
    ...overrides,
  };
  return {
    context: { space: { name: 'demo' }, schema: { $id: 'sctx://test' }, callbacks } as unknown as PluginContext,
    validateCalls,
  };
}

const render = (ctx: PluginContext, data?: Record<string, unknown>) =>
  plugin.render!.render(ctx, {} as never, { format: 'html', data }) as Promise<string>;

const snapshotsOf = (page: string) =>
  JSON.parse(/id="sctx-snapshots">(.*?)<\/script>/s.exec(page)![1]!) as {
    space: string;
    definitions: { id: string }[];
  }[];

describe('map-views.html', () => {
  test('writes the space, its issues and the definitions of its schema into one page', async () => {
    const page = await render(context().context);
    const [snapshot] = snapshotsOf(page);
    expect(snapshot!.space).toBe('demo');
    expect(snapshot!.definitions.map((d) => d.id)).toEqual(['sctx-map-view://mine']);
  });

  test('passes validation options from -d', async () => {
    const { context: ctx, validateCalls } = context();
    await render(ctx, { semantic: 'true', depth: '2', ruleFilter: 'severity=error,type=goal' });
    expect(validateCalls).toEqual([
      { semantic: true, depth: 2, ruleFilter: ['severity=error', 'type=goal'], includeGated: undefined },
    ]);
  });

  test('fails when core passes no callbacks', async () => {
    const { context: ctx } = context();
    delete (ctx as { callbacks?: unknown }).callbacks;
    await expect(render(ctx)).rejects.toThrow(/callbacks/);
  });
});
