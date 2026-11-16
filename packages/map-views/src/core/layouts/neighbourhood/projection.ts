import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { LayoutConfig } from '../../definition';
import {
  assignLanes,
  type Connector,
  childEdges,
  type Edge,
  isHierarchyEdge,
  occurrenceKey,
  parentEdges,
} from '../helpers';

type NeighbourhoodRole = 'above' | 'below' | 'left' | 'right';

/** One occurrence in a neighbourhood. A neighbour is placed once, however many fields join it to the focus. */
export type Neighbour = { key: string; node: SpaceNode };

export type Neighbourhood = {
  /** `undefined` when the graph has no nodes. */
  focus: Neighbour | undefined;
  roles: Record<NeighbourhoodRole, Neighbour[]>;
  /**
   * The nodes that share a hierarchy parent with the focus or, for a hierarchy root, the other
   * roots of its type. No edge joins them to the focus, so they have no connector.
   */
  siblings: Neighbour[];
  connectors: Connector[];
};

const ORDER: readonly NeighbourhoodRole[] = ['above', 'below', 'left', 'right'];

/**
 * The focus and its neighbours placed by role. Without a usable `focusId`, the focus is the
 * first hierarchy root, else the first node.
 */
export function buildNeighbourhood(
  graph: SpaceGraph,
  regionId: string,
  layout: LayoutConfig<'neighbourhood'>,
  focusId?: SpaceNode['id'],
): Neighbourhood {
  const roles: Neighbourhood['roles'] = { above: [], below: [], left: [], right: [] };
  const node = (focusId && graph.nodes.get(focusId)) || graph.hierarchyRoots[0] || graph.nodes.values().next().value;
  if (!node) return { focus: undefined, roles, siblings: [], connectors: [] };
  const focus = { key: occurrenceKey(regionId, [node.id]), node };

  // A field a role lists goes there. Otherwise the hierarchy runs down the page and relationships
  // sit to the left; with no hierarchy, every edge runs down the page.
  const roleOf = (edge: Edge, direction: 'parent' | 'child'): NeighbourhoodRole => {
    const listed = ORDER.find((role) => layout[role].includes(edge.field));
    if (listed) return listed;
    if (graph.hierarchy && !isHierarchyEdge(edge, graph.hierarchy)) return 'left';
    return direction === 'parent' ? 'above' : 'below';
  };

  const best = new Map<SpaceNode['id'], NeighbourhoodRole>();
  const connectors: Connector[] = [];
  const neighbour = (edge: Edge, direction: 'parent' | 'child') => {
    const id = edge[direction];
    const { field } = edge;
    if (id === node.id || !graph.nodes.has(id)) return;
    const role = roleOf(edge, direction);
    const current = best.get(id);
    if (!current || ORDER.indexOf(role) < ORDER.indexOf(current)) best.set(id, role);
    const key = occurrenceKey(regionId, [node.id, id]);
    connectors.push(direction === 'parent' ? { from: key, to: focus.key, field } : { from: focus.key, to: key, field });
  };
  for (const edge of parentEdges(graph, node.id)) neighbour(edge, 'parent');
  for (const edge of childEdges(graph, node.id)) neighbour(edge, 'child');

  const occurrence = (other: SpaceNode) => ({ key: occurrenceKey(regionId, [node.id, other.id]), node: other });
  for (const [id, role] of best) roles[role].push(occurrence(graph.nodes.get(id)!));
  const hierarchyParents = parentEdges(graph, node.id).filter((edge) => isHierarchyEdge(edge, graph.hierarchy));
  const sameLevel = graph.hierarchyRoots.includes(node)
    ? graph.hierarchyRoots.filter((root) => root.resolvedType === node.resolvedType)
    : hierarchyParents
        .flatMap((edge) => childEdges(graph, edge.parent))
        .filter((edge) => isHierarchyEdge(edge, graph.hierarchy))
        .map((edge) => graph.nodes.get(edge.child)!);
  const siblings = [...new Set(sameLevel)].filter((other) => other !== node && !best.has(other.id)).map(occurrence);
  assignLanes(connectors);
  return { focus, roles, siblings, connectors };
}
