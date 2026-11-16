import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import type { LayoutConfig } from '../src/core/definition';
import { buildNeighbourhood } from '../src/core/layouts/neighbourhood/projection';
import { makeHierarchy, makeLevel, makeParentRef, makeSpaceNode } from './builders';

const rel = (id: string, field: string) => makeParentRef(id, { kind: 'relationship', field });
// A synthesis cites two sources and a concept; a second synthesis cites the first source.
const graph = buildSpaceGraph(
  [
    makeSpaceNode('s1', 'source'),
    makeSpaceNode('s2', 'source'),
    makeSpaceNode('c1', 'concept'),
    makeSpaceNode('x1', 'synthesis', {}, undefined, [
      rel('s1', 'sources'),
      rel('s2', 'sources'),
      rel('c1', 'concepts'),
    ]),
    makeSpaceNode('x2', 'synthesis', {}, undefined, [rel('s1', 'sources')]),
  ],
  undefined,
);
const layout = (overrides: Partial<LayoutConfig<'neighbourhood'>> = {}): LayoutConfig<'neighbourhood'> => ({
  type: 'neighbourhood',
  above: [],
  below: [],
  left: [],
  right: [],
  ...overrides,
});
const ids = (items: { node: { id: string } }[]) => items.map((i) => i.node.id);

describe('neighbourhood', () => {
  test('puts parents above and children below by default', () => {
    const neighbourhood = buildNeighbourhood(graph, 'main', layout(), 's1' as never);
    expect(ids(neighbourhood.roles.above)).toEqual([]);
    expect(ids(neighbourhood.roles.below)).toEqual(['x1', 'x2']);
    const x1 = buildNeighbourhood(graph, 'main', layout(), 'x1' as never);
    expect(ids(x1.roles.above)).toEqual(['s1', 's2', 'c1']);
  });

  test('a listed field moves its neighbours to that role', () => {
    const neighbourhood = buildNeighbourhood(graph, 'main', layout({ left: ['concepts'] }), 'x1' as never);
    expect(ids(neighbourhood.roles.left)).toEqual(['c1']);
    expect(ids(neighbourhood.roles.above)).toEqual(['s1', 's2']);
  });

  test('with a hierarchy, hierarchy edges run down and relationship edges sit to the left', () => {
    const tree = buildSpaceGraph(
      [
        makeSpaceNode('p1', 'phase'),
        makeSpaceNode('o1', 'outcome'),
        makeSpaceNode('a1', 'activity', {}, undefined, [makeParentRef('p1'), rel('o1', 'outcomes')]),
        makeSpaceNode('c1', 'capability', {}, undefined, [makeParentRef('a1')]),
        makeSpaceNode('t1', 'tool', {}, undefined, [rel('a1', 'usedBy')]),
      ],
      makeHierarchy([makeLevel('phase'), makeLevel('activity'), makeLevel('capability')]),
    );
    const { roles } = buildNeighbourhood(tree, 'main', layout(), 'a1' as never);
    expect(ids(roles.above)).toEqual(['p1']);
    expect(ids(roles.below)).toEqual(['c1']);
    expect(ids(roles.left)).toEqual(['o1', 't1']);
    expect(ids(roles.right)).toEqual([]);
  });

  test('connectors keep the edge direction and carry the field', () => {
    const { focus, connectors } = buildNeighbourhood(graph, 'main', layout(), 'x1' as never);
    expect(connectors).toHaveLength(3);
    expect(connectors.every((l) => l.to === focus!.key)).toBe(true);
    expect(connectors.map((l) => l.field).sort()).toEqual(['concepts', 'sources', 'sources']);
  });

  test('siblings share a hierarchy parent with the focus or, for a root, are the other roots of its type', () => {
    const tree = buildSpaceGraph(
      [
        makeSpaceNode('p1', 'phase'),
        makeSpaceNode('p2', 'phase'),
        makeSpaceNode('a1', 'activity', {}, undefined, [makeParentRef('p1')]),
        makeSpaceNode('a2', 'activity', {}, undefined, [makeParentRef('p1')]),
        makeSpaceNode('a3', 'activity', {}, undefined, [makeParentRef('p2')]),
        makeSpaceNode('a4', 'activity'),
      ],
      makeHierarchy([makeLevel('phase'), makeLevel('activity')]),
    );
    expect(ids(buildNeighbourhood(tree, 'main', layout(), 'p1' as never).siblings)).toEqual(['p2']);
    expect(ids(buildNeighbourhood(tree, 'main', layout(), 'a1' as never).siblings)).toEqual(['a2']);
  });

  test('an unknown focus falls back to the first node', () => {
    expect(buildNeighbourhood(graph, 'main', layout(), 'nope' as never).focus?.node.id).toBe('s1' as never);
  });

  test('an empty graph has no focus', () => {
    expect(buildNeighbourhood(buildSpaceGraph([], undefined), 'main', layout()).focus).toBeUndefined();
  });
});
