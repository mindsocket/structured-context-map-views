import { expect, test } from 'bun:test';
import { buildSpaceGraph, type SpaceNode } from 'structured-context/api';
import { isHierarchyEdge } from '../src/core';
import { childEdges, edgesWithin, parentEdges } from '../src/core/graph';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

const graph = fixtureGraph(sample);
const id = (s: string) => s as SpaceNode['id'];

test('keeps edge metadata and follows edges in both directions', () => {
  // Outcomes are linked from Activities by the `outcomes` relationship, declared on the parent.
  const outcomeEdges = childEdges(graph, id('Publish First Release.md')).filter(
    (edge) => graph.nodes.get(edge.child)?.resolvedType === 'Outcomes',
  );
  expect(outcomeEdges.map((edge) => String(edge.child)).sort()).toEqual(['Reliable Releases.md', 'Wide Adoption.md']);
  expect(outcomeEdges.every((edge) => edge.kind === 'relationship' && edge.fieldOn === 'parent')).toBe(true);

  // Read in reverse: the Activities an Outcome belongs to.
  expect(parentEdges(graph, id('Wide Adoption.md')).map((edge) => String(edge.parent))).toContain(
    'Publish First Release.md',
  );
});

test('distinguishes hierarchy edges from relationship edges', () => {
  const kinds = new Set(edgesWithin(graph).map((edge) => isHierarchyEdge(edge, graph.hierarchy)));
  expect(kinds).toEqual(new Set([true, false]));
});

test('leaves out edges to parents outside a narrowed graph', () => {
  const narrowed = buildSpaceGraph(
    [...graph.nodes.values()].filter((n) => n.resolvedType !== 'Phases'),
    graph.hierarchy,
  );
  // The graph itself keeps them; the helpers don't.
  expect([...narrowed.parentEdges.values()].flat().some((e) => !narrowed.nodes.has(e.parent))).toBe(true);
  expect(edgesWithin(narrowed).some((e) => !narrowed.nodes.has(e.parent))).toBe(false);
  for (const nodeId of narrowed.nodes.keys()) {
    expect(parentEdges(narrowed, nodeId).every((e) => narrowed.nodes.has(e.parent))).toBe(true);
  }
});
