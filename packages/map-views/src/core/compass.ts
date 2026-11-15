import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { CompassLayoutConfig } from './definition';
import { childEdges, parentEdges } from './graph';
import { assignLanes } from './lanes';
import { occurrenceKey } from './occurrence';

export type CompassRole = 'left' | 'right' | 'above' | 'below' | 'around';

/** A neighbour of the focus, placed once however many fields join them. */
export type CompassNeighbour = { key: string; node: SpaceNode };

/** An edge between the focus and a neighbour, in the edge's own direction. `lane` as in `XYLink`. */
export type CompassLink = { from: string; to: string; field: string; lane: number };

export type Compass = {
  /** `undefined` when the graph has no nodes. */
  focus: { key: string; node: SpaceNode } | undefined;
  roles: Record<CompassRole, CompassNeighbour[]>;
  links: CompassLink[];
};

const ORDER: readonly CompassRole[] = ['left', 'right', 'above', 'below', 'around'];

/**
 * The focus and its neighbours placed by role. Without a usable `focusId`, the focus is the
 * first hierarchy root, else the first node.
 */
export function buildCompass(
  graph: SpaceGraph,
  regionId: string,
  layout: CompassLayoutConfig,
  focusId?: SpaceNode['id'],
): Compass {
  const roles: Compass['roles'] = { left: [], right: [], above: [], below: [], around: [] };
  const node = (focusId && graph.nodes.get(focusId)) || graph.hierarchyRoots[0] || graph.nodes.values().next().value;
  if (!node) return { focus: undefined, roles, links: [] };
  const focus = { key: occurrenceKey(regionId, [node.id]), node };

  const roleOf = (direction: 'parent' | 'child', field: string): CompassRole => {
    const listed = (fields: readonly string[]) => fields.includes(field);
    const open = (fields: readonly string[]) => fields.length === 0 || listed(fields);
    if (listed(layout.left)) return 'left';
    if (listed(layout.right)) return 'right';
    if (direction === 'parent' && open(layout.above)) return 'above';
    if (direction === 'child' && open(layout.below)) return 'below';
    return 'around';
  };

  const best = new Map<SpaceNode['id'], CompassRole>();
  const links: CompassLink[] = [];
  const neighbour = (id: SpaceNode['id'], direction: 'parent' | 'child', field: string) => {
    if (id === node.id || !graph.nodes.has(id)) return;
    const role = roleOf(direction, field);
    const current = best.get(id);
    if (!current || ORDER.indexOf(role) < ORDER.indexOf(current)) best.set(id, role);
    const key = occurrenceKey(regionId, [node.id, id]);
    links.push(
      direction === 'parent'
        ? { from: key, to: focus.key, field, lane: 0 }
        : { from: focus.key, to: key, field, lane: 0 },
    );
  };
  for (const edge of parentEdges(graph, node.id)) neighbour(edge.parent, 'parent', edge.field);
  for (const edge of childEdges(graph, node.id)) neighbour(edge.child, 'child', edge.field);

  for (const [id, role] of best) {
    roles[role].push({ key: occurrenceKey(regionId, [node.id, id]), node: graph.nodes.get(id)! });
  }
  assignLanes(links);
  return { focus, roles, links };
}
