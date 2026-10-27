import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import { makeHierarchy, makeLevel, makeParentRef, makeSpaceNode } from 'structured-context/testing';
import { buildTree, type TreeOccurrence, treeLinks } from '../src/map-views/core';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

function occurrences(roots: TreeOccurrence[]): TreeOccurrence[] {
  return roots.flatMap((o) => [o, ...occurrences(o.children)]);
}

describe('sample tree', () => {
  const tree = buildTree(fixtureGraph(sample), 'main');
  const all = occurrences([...tree.roots, ...tree.orphans]);

  test('roots are the Phases', () => {
    expect(tree.roots.map((o) => o.node.resolvedType)).toEqual(['Phases', 'Phases', 'Phases', 'Phases']);
  });

  test('occurrence keys are unique even though nodes repeat', () => {
    expect(new Set(all.map((o) => o.key)).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(new Set(all.map((o) => o.node.title)).size);
  });

  test('a node with several parents is rendered in full once and repeated elsewhere', () => {
    const webPresence = all.filter((o) => o.node.title === 'Project Website');
    const [primary, ...repeats] = webPresence;
    expect(webPresence.length).toBeGreaterThan(1);
    expect(primary!.repeatOf).toBeUndefined();
    expect(repeats.every((o) => o.repeatOf === primary!.key && o.children.length === 0)).toBe(true);
    expect(tree.primary.get('Project Website.md')).toBe(primary!.key);
  });

  test('only hierarchy edges shape the tree', () => {
    expect(all.some((o) => o.node.resolvedType === 'Outcomes')).toBe(false);
  });

  test('links pair each rendered child with its parent occurrence', () => {
    const links = treeLinks(tree);
    expect(links.length).toBe(all.length - tree.roots.length - tree.orphans.length);
    expect(tree.crossLinks).toEqual([]);
  });

  test('cross-edge mode replaces repeats with cross-links to the primary occurrence', () => {
    const cross = buildTree(fixtureGraph(sample), 'main', 'cross-edge');
    const crossAll = occurrences([...cross.roots, ...cross.orphans]);
    const repeats = all.filter((o) => o.repeatOf !== undefined);
    expect(crossAll.some((o) => o.repeatOf !== undefined)).toBe(false);
    expect(crossAll.length).toBe(all.length - repeats.length);
    expect(cross.crossLinks.length).toBe(repeats.length);
    const keys = new Set(crossAll.map((o) => o.key));
    expect(cross.crossLinks.every((l) => keys.has(l.from) && keys.has(l.to) && l.kind === 'cross')).toBe(true);
    expect(cross.crossLinks.map((l) => l.to)).toContain(cross.primary.get('Project Website.md')!);
  });
});

describe('edge cases', () => {
  const hierarchy = makeHierarchy([makeLevel('goal'), makeLevel('opportunity')]);
  const graph = (nodes: Parameters<typeof buildSpaceGraph>[0]) => buildSpaceGraph(nodes, hierarchy);

  test('hierarchy-typed nodes without a parent become orphans', () => {
    const tree = buildTree(graph([makeSpaceNode('G', 'goal'), makeSpaceNode('O', 'opportunity')]), 'r');
    expect(tree.roots.map((o) => o.node.title)).toEqual(['G']);
    expect(tree.orphans.map((o) => o.node.title)).toEqual(['O']);
  });

  test('a cycle terminates as a repeat', () => {
    const edge = (title: string) =>
      makeParentRef(title, { kind: 'hierarchy', hierarchy: hierarchy.name, selfRef: true });
    const nodes = [
      makeSpaceNode('G', 'goal'),
      makeSpaceNode('A', 'opportunity', {}, undefined, [edge('G'), edge('B')]),
      makeSpaceNode('B', 'opportunity', {}, undefined, [edge('A')]),
    ];
    const tree = buildTree(graph(nodes), 'r');
    const titles = occurrences(tree.roots).map((o) => `${o.node.title}${o.repeatOf ? '*' : ''}`);
    expect(titles).toEqual(['G', 'A', 'B', 'A*']);
  });

  test('a cycle unreachable from any root is still rendered', () => {
    const edge = (title: string) =>
      makeParentRef(title, { kind: 'hierarchy', hierarchy: hierarchy.name, selfRef: true });
    const nodes = [
      makeSpaceNode('A', 'opportunity', {}, undefined, [edge('B')]),
      makeSpaceNode('B', 'opportunity', {}, undefined, [edge('A')]),
    ];
    const tree = buildTree(graph(nodes), 'r');
    expect(occurrences(tree.orphans).map((o) => `${o.node.title}${o.repeatOf ? '*' : ''}`)).toEqual(['A', 'B', 'A*']);
  });

  test('a child referencing the same parent twice occurs once', () => {
    const ref = (field: string) => makeParentRef('G', { kind: 'hierarchy', hierarchy: hierarchy.name, field });
    const nodes = [
      makeSpaceNode('G', 'goal'),
      makeSpaceNode('O', 'opportunity', {}, undefined, [ref('parent'), ref('also')]),
    ];
    const tree = buildTree(graph(nodes), 'r');
    expect(tree.roots[0]!.children.map((o) => o.node.title)).toEqual(['O']);
  });
});
