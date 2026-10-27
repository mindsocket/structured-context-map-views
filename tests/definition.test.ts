import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  mapViewsForSchema,
  parseMapViewDefinition,
  resolveParameterValues,
  resolveRegions,
  selectionFilter,
} from '../src/map-views/core';
import { SCHEMA_URL } from '../src/map-views/core/schemas/schema-url';

const minimal = `{ schema: 'sctx://x', regions: [{ id: 'main', layout: { type: 'tree' } }] }`;

const withParameters = `{
  schema: 'sctx://x',
  parameters: {
    orientation: { $ref: 'settings.json#/$defs/orientation', default: 'horizontal' },
    dag: { $ref: 'layouts/tree.json#/$defs/dag', default: 'repeat', title: 'Repeats' },
    fields: { type: 'array', items: { enum: ['status', 'priority'] }, default: ['status'] },
    edges: { type: 'boolean', default: true },
  },
  regions: [{
    id: 'main',
    layout: { type: 'tree', orientation: { $param: 'orientation' }, dag: { $param: 'dag' } },
    nodes: { fields: { $param: 'fields' } },
    edges: { show: { $param: 'edges' } },
  }],
}`;

describe('parseMapViewDefinition', () => {
  test('fills in defaults when resolved', () => {
    const def = parseMapViewDefinition('t', minimal);
    expect(def.title).toBe('t');
    expect(resolveRegions(def)).toEqual([
      {
        id: 'main',
        layout: { type: 'tree', orientation: 'vertical', dag: 'repeat' },
        nodes: { style: 'card', fields: [] },
        edges: { show: true },
      },
    ]);
  });

  test('derives controls from parameter schemas, including through $ref', () => {
    const def = parseMapViewDefinition('t', withParameters);
    expect(def.parameters.map((p) => [p.name, p.title, p.control])).toEqual([
      ['orientation', 'Orientation', { kind: 'select', options: ['vertical', 'horizontal'] }],
      ['dag', 'Repeats', { kind: 'select', options: ['repeat', 'cross-edge'] }],
      ['fields', 'fields', { kind: 'multiselect', options: ['status', 'priority'] }],
      ['edges', 'edges', { kind: 'toggle' }],
    ]);
  });

  test('resolves parameter $refs written as absolute URLs', () => {
    const def = parseMapViewDefinition(
      't',
      `{ schema: 'x', parameters: { o: { $ref: '${SCHEMA_URL}/settings.json#/$defs/orientation', default: 'vertical' } },
         regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'o' } } }] }`,
    );
    expect(def.parameters[0]!.control).toEqual({ kind: 'select', options: ['vertical', 'horizontal'] });
  });

  test('narrows a referenced setting with allOf', () => {
    const def = parseMapViewDefinition(
      't',
      `{ schema: 'x', parameters: { o: { allOf: [{ $ref: 'settings.json#/$defs/orientation' }, { enum: ['horizontal'] }], default: 'horizontal' } },
         regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'o' } } }] }`,
    );
    expect(def.parameters[0]!.control).toEqual({ kind: 'select', options: ['horizontal'] });
  });

  test('narrows referenced array items with allOf', () => {
    const def = parseMapViewDefinition(
      't',
      `{ schema: 'x', parameters: { f: { $ref: 'settings.json#/$defs/fieldList', allOf: [{ items: { enum: ['a', 'b'] } }], default: ['a'] } },
         regions: [{ id: 'a', layout: { type: 'tree' }, nodes: { fields: { $param: 'f' } } }] }`,
    );
    expect(def.parameters[0]!.control).toEqual({ kind: 'multiselect', options: ['a', 'b'] });
  });

  test('error messages leave out the parameter-binding alternative for plain values', () => {
    expect(() =>
      parseMapViewDefinition(
        't',
        `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'tree' }, nodes: { style: 'bogus' } }] }`,
      ),
    ).toThrow(
      /^Map view "t": \/regions\/0\/nodes\/style must be equal to one of the allowed values \("card", "shape"\)$/,
    );
  });

  test('applies parameter values, falling back to defaults for unknown values', () => {
    const def = parseMapViewDefinition('t', withParameters);
    expect(resolveParameterValues(def)).toEqual({
      orientation: 'horizontal',
      dag: 'repeat',
      fields: ['status'],
      edges: true,
    });
    const [region] = resolveRegions(def, { orientation: 'vertical', dag: 'bogus', edges: false });
    expect(region!.layout).toEqual({ type: 'tree', orientation: 'vertical', dag: 'repeat' });
    expect(region!.nodes.fields).toEqual(['status']);
    expect(region!.edges.show).toBe(false);
  });

  test.each([
    ['{', /invalid JSON5/],
    ['{ regions: [] }', /must have required property 'schema'/],
    [`{ schema: 'x', regions: [{ id: 'a', layout: { type: 'grid' } }] }`, /layout has unknown type "grid"/],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'landscape', group: [{ type: 'A' }, { field: 's' }] } }] }`,
      /the last grouping level must be a node type/,
    ],
    [
      `{ schema: 'x', parameters: { g: { enum: ['A', 'B'], default: 'A' } }, regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'g' } } }] }`,
      /value "A" isn't valid where it's used/,
    ],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'tree', colour: 'red' } }] }`,
      /must NOT have additional properties \("colour"\)/,
    ],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'tree' } }, { id: 'a', layout: { type: 'tree' } }] }`,
      /duplicate region id/,
    ],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'o' } } }] }`,
      /"o" is not a declared parameter/,
    ],
    [
      `{ schema: 'x', parameters: { o: { enum: ['up'], default: 'down' } }, regions: [{ id: 'a', layout: { type: 'tree' } }] }`,
      /default "down" doesn't match/,
    ],
    [
      `{ schema: 'x', parameters: { o: { type: 'string', default: 'a' } }, regions: [{ id: 'a', layout: { type: 'tree' } }] }`,
      /no control can be generated/,
    ],
    [
      `{ schema: 'x', parameters: { o: { enum: ['vertical', 'diagonal'], default: 'vertical' } }, regions: [{ id: 'a', layout: { type: 'tree', orientation: { $param: 'o' } } }] }`,
      /value "diagonal" isn't valid where it's used/,
    ],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'xy', x: { field: 'e', domain: [1, 0] }, y: { field: 'v' } } }] }`,
      /x domain must be \[min, max\] with min < max/,
    ],
    [
      `{ schema: 'x', regions: [{ id: 'a', layout: { type: 'xy', x: { field: 'e' } } }] }`,
      /must have required property 'y'/,
    ],
  ])('rejects %s', (source, message) => {
    expect(() => parseMapViewDefinition('t', source)).toThrow(message);
  });

  test("exposes the first region's filter for hosts to apply", () => {
    expect(selectionFilter(parseMapViewDefinition('t', minimal))).toBeUndefined();
    const filtered = parseMapViewDefinition(
      't',
      `{ schema: 'x', regions: [{ id: 'a', select: { filter: 'my-view' }, layout: { type: 'tree' } }] }`,
    );
    expect(selectionFilter(filtered)).toBe('my-view');
  });

  test('matches definitions to a schema', () => {
    const def = parseMapViewDefinition(
      't',
      `{ schema: 'sctx://x', regions: [{ id: 'main', layout: { type: 'tree' } }] }`,
    );
    expect(mapViewsForSchema([def], 'sctx://x')).toEqual([def]);
    expect(mapViewsForSchema([def], 'sctx://y')).toEqual([]);
    expect(mapViewsForSchema([def], undefined)).toEqual([]);
  });

  test('parsed definitions survive a JSON round trip', () => {
    const def = parseMapViewDefinition('t', withParameters);
    expect(JSON.parse(JSON.stringify(def))).toEqual(def);
  });
});

test('the bundled map view definitions are valid', () => {
  const dir = join(import.meta.dir, '../map-views');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json5'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) parseMapViewDefinition(basename(file, '.json5'), readFileSync(join(dir, file), 'utf8'));
});
