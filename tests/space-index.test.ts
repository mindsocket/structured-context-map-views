import { expect, test } from 'bun:test';
import type { SpaceNode } from 'structured-context/api';
import { buildSpaceIndex, isHierarchyEdge, type SpaceData } from '../src/map-views/core';
import sample from './fixtures/launch-playbook.json';

const index = buildSpaceIndex(sample as unknown as SpaceData);

test('indexes every node by title', () => {
  expect(index.nodes.size).toBe(42);
});

test('keeps edge metadata and follows edges in both directions', () => {
  // Outcomes are linked from Activities by the `outcomes` relationship, declared on the parent.
  const outcomeEdges = index
    .childEdges('Publish First Release.md')
    .filter((edge) => index.nodes.get(edge.child)?.resolvedType === 'Outcomes');
  expect(outcomeEdges.map((edge) => edge.child).sort()).toEqual(['Reliable Releases.md', 'Wide Adoption.md']);
  expect(outcomeEdges.every((edge) => edge.kind === 'relationship' && edge.fieldOn === 'parent')).toBe(true);

  // Read in reverse: the Activities an Outcome belongs to.
  const activities = index.parentEdges('Wide Adoption.md').map((edge) => edge.parent);
  expect(activities).toContain('Publish First Release.md');
});

test('distinguishes hierarchy edges from relationship edges', () => {
  const kinds = new Set(index.edges.map((edge) => isHierarchyEdge(edge, index.hierarchy)));
  expect(kinds).toEqual(new Set([true, false]));
});

test('drops edges to parents outside the space', () => {
  const data = sample as unknown as SpaceData;
  const narrowed = buildSpaceIndex({ ...data, nodes: data.nodes.filter((n) => n.resolvedType !== 'Phases') });
  expect(narrowed.edges.some((edge) => narrowed.nodes.get(edge.parent) === undefined)).toBe(false);
});

test('links nodes by id when the id differs from the title', () => {
  // Folder-index spaces and path-keyed nodes: ids are file paths, titles are display names.
  const data = sample as unknown as SpaceData;
  const idOf = (id: string) => `notes/${id}` as unknown as SpaceNode['id'];
  const pathKeyed: SpaceData = {
    ...data,
    nodes: data.nodes.map((node) => ({
      ...node,
      id: idOf(node.id),
      resolvedParents: node.resolvedParents.map((parent) => ({ ...parent, id: idOf(parent.id) })),
    })),
  };
  const keyed = buildSpaceIndex(pathKeyed);
  expect(keyed.edges).toHaveLength(index.edges.length);
  expect(keyed.childEdges(idOf('Publish First Release.md')).length).toBeGreaterThan(0);
});
