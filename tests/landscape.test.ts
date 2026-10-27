import { describe, expect, test } from 'bun:test';
import { buildLandscape, type LandscapeLayoutConfig, type LandscapeOccurrence } from '../src/map-views/core';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

const graph = fixtureGraph(sample);
const layout = (group: LandscapeLayoutConfig['group']): LandscapeLayoutConfig => ({
  type: 'landscape',
  orientation: 'horizontal',
  group,
});
const level = (type: string) => ({ type, intermediate: 'hidden' as const });

function all(occurrences: LandscapeOccurrence[]): LandscapeOccurrence[] {
  return occurrences.flatMap((o) => [o, ...all(o.children)]);
}
const title = (o: LandscapeOccurrence) => (o.item.kind === 'node' ? o.item.node.title : o.item.value);

describe('sample landscape', () => {
  const byPhase = buildLandscape(graph, 'main', layout([level('Phases'), level('Activities'), level('Capabilities')]));

  test('top-level containers are the Phases, holding their Activities', () => {
    expect(byPhase.groups.map(title)).toHaveLength(4);
    const activities = byPhase.groups.flatMap((g) => g.children);
    expect(activities.every((o) => o.item.kind === 'node' && o.item.node.resolvedType === 'Activities')).toBe(true);
    expect(activities).toHaveLength(12);
  });

  test('nodes no container reaches are ungrouped, not dropped', () => {
    // Some Capabilities are only sub-capabilities, with no Activity of their own.
    const ungrouped = byPhase.ungrouped.map((o) => o.item.kind === 'node' && o.item.node);
    expect(ungrouped.length).toBeGreaterThan(0);
    expect(ungrouped.every((n) => n && n.resolvedType === 'Capabilities')).toBe(true);
    const placed = new Set(all([...byPhase.groups, ...byPhase.ungrouped]).map(title));
    const capabilities = [...graph.nodes.values()].filter((n) => n.resolvedType === 'Capabilities');
    expect(capabilities.every((n) => placed.has(n.title))).toBe(true);
  });

  test('a node in several containers repeats in full, with unique keys', () => {
    const occurrences = all(byPhase.groups);
    expect(new Set(occurrences.map((o) => o.key)).size).toBe(occurrences.length);
    const web = occurrences.filter((o) => title(o) === 'Project Website');
    expect(web.length).toBeGreaterThan(1);
    expect(web[0]!.repeatOf).toBeUndefined();
    expect(web.slice(1).every((o) => o.repeatOf === web[0]!.key)).toBe(true);
  });

  test('grouping follows edges against their direction (Outcomes over Activities)', () => {
    const byOutcome = buildLandscape(graph, 'main', layout([level('Outcomes'), level('Activities')]));
    expect(byOutcome.groups).toHaveLength(3);
    const placements = byOutcome.groups.flatMap((g) => g.children);
    // 12 Activity → Outcome links in the fixture, one placement each.
    expect(placements).toHaveLength(12);
    const activityTitles = new Set(placements.map(title));
    expect(activityTitles.size + byOutcome.ungrouped.length).toBe(12);
  });

  test('field levels split the next node level by value', () => {
    const byStatus = buildLandscape(graph, 'main', layout([{ field: 'status' }, level('Applications')]));
    expect(byStatus.groups.map(title).sort()).toEqual(['identified', 'stub']);
    expect(byStatus.groups.flatMap((g) => g.children)).toHaveLength(8);
  });

  test('via chains join through the skipped type and record the skipped nodes', () => {
    const chained = buildLandscape(
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
    const direct = buildLandscape(graph, 'main', layout([level('Activities'), level('Applications')]));
    expect(direct.groups.flatMap((g) => g.children)).toEqual([]);
    expect(direct.ungrouped).toHaveLength(8);
  });

  test('edge.field restricts which edges join two levels', () => {
    const none = buildLandscape(
      graph,
      'main',
      layout([level('Phases'), { ...level('Activities'), edge: { field: 'outcomes' } }]),
    );
    expect(none.groups.flatMap((g) => g.children)).toEqual([]);
    const phase = buildLandscape(
      graph,
      'main',
      layout([level('Phases'), { ...level('Activities'), edge: { field: 'phase' } }]),
    );
    expect(phase.groups.flatMap((g) => g.children)).toHaveLength(12);
  });

  test('field-group keys cannot collide with node titles', () => {
    const occurrences = all(
      buildLandscape(graph, 'main', layout([level('Activities'), { field: 'status' }, level('Capabilities')])).groups,
    );
    expect(new Set(occurrences.map((o) => o.key)).size).toBe(occurrences.length);
  });
});
