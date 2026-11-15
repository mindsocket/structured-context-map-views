import { describe, expect, test } from 'bun:test';
import type { GraphLayoutConfig } from '../src/core/definition';
import { buildForceGraph } from '../src/core/force';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

const graph = fixtureGraph(sample);
const layout = (edgeFields: string[] = []): GraphLayoutConfig => ({ type: 'graph', edgeFields });

describe('force graph', () => {
  const result = buildForceGraph(graph, 'main', layout(), 200);

  test('places every node once, inside the plot', () => {
    expect(result.points).toHaveLength(graph.nodes.size);
    expect(result.points.every((p) => p.x >= 0 && p.x <= result.width && p.y >= 0 && p.y <= result.height)).toBe(true);
  });

  test('gives the same positions for the same graph', () => {
    expect(buildForceGraph(graph, 'main', layout(), 200)).toEqual(result);
  });

  test('draws only the listed fields', () => {
    const fields = new Set(result.links.map((l) => l.field));
    expect(fields.size).toBeGreaterThan(1);
    const [only] = [...fields];
    expect(new Set(buildForceGraph(graph, 'main', layout([only!]), 200).links.map((l) => l.field))).toEqual(
      new Set([only!]),
    );
  });

  test('an empty graph has an empty plot', () => {
    const empty = buildForceGraph({ ...graph, nodes: new Map() }, 'main', layout(), 200);
    expect(empty.points).toEqual([]);
  });
});
