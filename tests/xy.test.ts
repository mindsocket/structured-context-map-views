import { describe, expect, test } from 'bun:test';
import { buildSpaceIndex, buildXYPlot, type SpaceData, type XYLayoutConfig } from '../src/map-views/core';
import teaShop from './fixtures/tea-shop.json';

const index = buildSpaceIndex(teaShop as unknown as SpaceData);
const layout = (overrides: Partial<XYLayoutConfig> = {}): XYLayoutConfig => ({
  type: 'xy',
  x: { field: 'evolution', domain: [0, 1], direction: 'ascending' },
  y: { field: 'visibility', domain: [0, 1], direction: 'ascending' },
  types: ['anchor', 'component'],
  edgeFields: [],
  ...overrides,
});
const titles = (items: { node: { title: string } }[]) => items.map((i) => i.node.title);

describe('tea-shop XY plot', () => {
  test('positions nodes by their fields within a fixed domain', () => {
    const plot = buildXYPlot(index, 'main', layout());
    const kettle = plot.points.find((p) => p.node.title === 'Kettle')!;
    expect(kettle.x).toBeCloseTo(0.35);
    expect(kettle.y).toBeCloseTo(0.43);
    expect(plot.points).toHaveLength(14);
    expect(plot.unplaced).toEqual([]);
  });

  test('descending axes run the other way', () => {
    const plot = buildXYPlot(
      index,
      'main',
      layout({ y: { field: 'visibility', domain: [0, 1], direction: 'descending' } }),
    );
    expect(plot.points.find((p) => p.node.title === 'Kettle')!.y).toBeCloseTo(0.57);
  });

  test('a data domain spans the plotted values', () => {
    const plot = buildXYPlot(
      index,
      'main',
      layout({ x: { field: 'evolution', domain: 'data', direction: 'ascending' } }),
    );
    expect(plot.domains.x).toEqual([0.35, 0.92]);
    const xs = plot.points.map((p) => p.x);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(1);
  });

  test('nodes of plotted types without usable values are listed with the reason, not dropped', () => {
    const plot = buildXYPlot(
      index,
      'main',
      layout({
        types: ['component', 'annotation'],
        x: { field: 'evolution', domain: [0.5, 1], direction: 'ascending' },
      }),
    );
    expect(titles(plot.unplaced)).toEqual(['Kettle', 'Annotation 1']);
    expect(plot.unplaced[0]!.reasons).toEqual(['evolution 0.35 is outside 0.5–1']);
    expect(plot.unplaced[1]!.reasons).toEqual(['no evolution', 'no visibility']);
  });

  test('with no types given, plots every type that has a value on either axis', () => {
    const plot = buildXYPlot(index, 'main', layout({ types: [] }));
    const types = new Set([...plot.points, ...plot.unplaced].map((p) => p.node.resolvedType));
    expect([...types].sort()).toEqual(['accelerator', 'anchor', 'attitude', 'component', 'note']);
  });

  test('draws edges between plotted nodes, optionally only from some fields', () => {
    const all = buildXYPlot(index, 'main', layout());
    // Occurrence keys end in a node id, `<file>#<name>` for nodes parsed from a map file.
    const name = (key: string) => (JSON.parse(key).at(-1) as string).split('#').at(-1);
    const named = (plot: typeof all) => plot.links.map(({ from, to }) => `${name(from)}→${name(to)}`).sort();
    // Anchors' edges to the map node are left out: the map node isn't plotted.
    expect(named(all)).toContain('Kettle→Campfire Kettle');
    const flows = buildXYPlot(index, 'main', layout({ edgeFields: ['flowsTo'] }));
    expect(named(flows)).toEqual(['Online Ordering→Payments']);
    const depends = named(buildXYPlot(index, 'main', layout({ edgeFields: ['dependsOn'] })));
    expect(depends).toHaveLength(12);
    expect(depends).toContain('Kettle→Power');
    expect(depends).not.toContain('Kettle→Campfire Kettle');
  });

  test('edges joining the same nodes get separate lanes and say what they are', () => {
    const plot = buildXYPlot(index, 'main', layout({ edgeFields: ['dependsOn', 'flowsTo'] }));
    const ordering = plot.links.filter((l) => l.from.includes('Online Ordering') && l.to.includes('Payments'));
    expect(ordering.map(({ field, hierarchy, lane }) => ({ field, hierarchy, lane }))).toEqual([
      { field: 'dependsOn', hierarchy: true, lane: -0.5 },
      { field: 'flowsTo', hierarchy: false, lane: 0.5 },
    ]);
    expect(plot.links.filter((l) => l.lane === 0)).toHaveLength(12 - 1);
  });
});
