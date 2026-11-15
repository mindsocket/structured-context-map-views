import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import type { NeighbourhoodLayoutConfig } from '../src/core/definition';
import { buildNeighbourhood } from '../src/core/neighbourhood';
import { makeParentRef, makeSpaceNode } from './builders';

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
const layout = (overrides: Partial<NeighbourhoodLayoutConfig> = {}): NeighbourhoodLayoutConfig => ({
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

  test('a listed field moves its neighbours to that role, before above and below', () => {
    const neighbourhood = buildNeighbourhood(graph, 'main', layout({ left: ['concepts'] }), 'x1' as never);
    expect(ids(neighbourhood.roles.left)).toEqual(['c1']);
    expect(ids(neighbourhood.roles.above)).toEqual(['s1', 's2']);
  });

  test('edges outside the listed above and below fields go around', () => {
    const neighbourhood = buildNeighbourhood(graph, 'main', layout({ above: ['sources'] }), 'x1' as never);
    expect(ids(neighbourhood.roles.around)).toEqual(['c1']);
  });

  test('links keep the edge direction and carry the field', () => {
    const { focus, links } = buildNeighbourhood(graph, 'main', layout(), 'x1' as never);
    expect(links).toHaveLength(3);
    expect(links.every((l) => l.to === focus!.key)).toBe(true);
    expect(links.map((l) => l.field).sort()).toEqual(['concepts', 'sources', 'sources']);
  });

  test('an unknown focus falls back to the first node', () => {
    expect(buildNeighbourhood(graph, 'main', layout(), 'nope' as never).focus?.node.id).toBe('s1' as never);
  });

  test('an empty graph has no focus', () => {
    expect(buildNeighbourhood(buildSpaceGraph([], undefined), 'main', layout()).focus).toBeUndefined();
  });
});
