import { describe, expect, test } from 'bun:test';
import type { LayoutConfig } from '../src/core/definition';
import { buildLandscape, type LandscapeOccurrence } from '../src/core/layouts/landscape/projection';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

const graph = fixtureGraph(sample);
/** A plain landscape: its containers are the one cell of its one strip. */
function plainLandscape(...args: Parameters<typeof buildLandscape>) {
  const { dimension, strips } = buildLandscape(...args);
  expect(dimension).toBeUndefined();
  expect(strips).toHaveLength(1);
  return { groups: strips[0]!.cells[0]!.children, ungrouped: strips[0]!.ungrouped };
}
const layout = (group: LayoutConfig<'landscape'>['strips'][number]['group']): LayoutConfig<'landscape'> => ({
  type: 'landscape',
  orientation: 'horizontal',
  strips: [{ group, showUngrouped: true }],
});
const level = (type: string) => ({ type, intermediate: 'hidden' as const });

function all(occurrences: LandscapeOccurrence[]): LandscapeOccurrence[] {
  return occurrences.flatMap((o) => [o, ...all(o.children)]);
}
const title = (o: LandscapeOccurrence) => (o.item.kind === 'node' ? o.item.node.title : o.item.value);

describe('sample landscape', () => {
  const byPhase = plainLandscape(graph, 'main', layout([level('Phases'), level('Activities'), level('Capabilities')]));

  test('top-level containers are the Phases, holding their Activities', () => {
    expect(byPhase.groups.map(title)).toHaveLength(4);
    const activities = byPhase.groups.flatMap((g) => g.children);
    expect(activities.every((o) => o.item.kind === 'node' && o.item.node.resolvedType === 'Activities')).toBe(true);
    expect(activities).toHaveLength(12);
  });

  test('field levels split the next node level by value', () => {
    const byStatus = plainLandscape(graph, 'main', layout([{ field: 'status' }, level('Applications')]));
    expect(byStatus.groups.map(title).sort()).toEqual(['identified', 'stub']);
    expect(byStatus.groups.flatMap((g) => g.children)).toHaveLength(8);
  });

  test('via chains join through the skipped type and record the skipped nodes', () => {
    const chained = plainLandscape(
      graph,
      'main',
      layout([level('Activities'), { type: 'Applications', via: ['Capabilities'], intermediate: 'breadcrumb' }]),
    );
    const apps = chained.groups.flatMap((g) => g.children);
    expect(apps.length).toBeGreaterThan(0);
    for (const app of apps) {
      expect(app.via).toHaveLength(1);
      expect(app.via[0]!.type).toBe('Capabilities');
      expect(app.via[0]!.nodes.length).toBeGreaterThan(0);
    }
    // Without the chain, Activities and Applications share no edge.
    const direct = plainLandscape(graph, 'main', layout([level('Activities'), level('Applications')]));
    expect(direct.groups.flatMap((g) => g.children)).toEqual([]);
    expect(direct.ungrouped).toHaveLength(8);
  });

  test('edge.field restricts which edges join two levels', () => {
    const none = plainLandscape(
      graph,
      'main',
      layout([level('Phases'), { ...level('Activities'), edge: { field: 'outcomes' } }]),
    );
    expect(none.groups.flatMap((g) => g.children)).toEqual([]);
    const phase = plainLandscape(
      graph,
      'main',
      layout([level('Phases'), { ...level('Activities'), edge: { field: 'phase' } }]),
    );
    expect(phase.groups.flatMap((g) => g.children)).toHaveLength(12);
  });

  test('field-group keys cannot collide with node titles', () => {
    const occurrences = all(
      plainLandscape(graph, 'main', layout([level('Activities'), { field: 'status' }, level('Capabilities')])).groups,
    );
    expect(new Set(occurrences.map((o) => o.key)).size).toBe(occurrences.length);
  });
});
