import { expect, test } from 'bun:test';
import type { AuthoredDefinition, Region } from '../src/map-views/core';

// Compile-time checks: the types derived from the schemas (FromSchema) must stay precise.
// A broken $ref silently collapses a type to `never` or `unknown`; these fail `bun run typecheck` if so.

const region: Region = {
  id: 'main',
  layout: { type: 'tree', orientation: 'horizontal', dag: 'cross-edge' },
  nodes: { style: 'shape', fields: ['status'] },
  edges: { show: false },
};

// @ts-expect-error resolved regions have no parameter bindings
const bound: Region['layout']['orientation'] = { $param: 'o' };
// @ts-expect-error values outside the setting's enum are rejected
const diagonal: Region['layout']['orientation'] = 'diagonal';
// @ts-expect-error defaulted settings are filled in after resolution
const missing: Region['nodes'] = {};

const authored: AuthoredDefinition = {
  $id: 'sctx-map-view://t',
  schema: 'sctx://x',
  parameters: { o: { default: 'vertical' } },
  regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'o' } } }],
};

test('derived definition types compile', () => {
  expect([region, bound, diagonal, missing, authored]).toHaveLength(5);
});
