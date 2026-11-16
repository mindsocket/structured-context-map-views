import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { NeighbourhoodLayoutConfig } from '../../definition';
import { assignLanes, type Connector, childEdges, isHierarchyEdge, occurrenceKey, parentEdges } from '../helpers';

type NeighbourhoodRole = 'left' | 'right' | 'above' | 'below' | 'around';

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

const ORDER: readonly NeighbourhoodRole[] = ['left', 'right', 'above', 'below', 'around'];

/**
 * The focus and its neighbours placed by role. Without a usable `focusId`, the focus is the
 * first hierarchy root, else the first node.
 */
export function buildNeighbourhood(
  graph: SpaceGraph,
  regionId: string,
  layout: NeighbourhoodLayoutConfig,
  focusId?: SpaceNode['id'],
): Neighbourhood {
  const roles: Neighbourhood['roles'] = { left: [], right: [], above: [], below: [], around: [] };
  const node = (focusId && graph.nodes.get(focusId)) || graph.hierarchyRoots[0] || graph.nodes.values().next().value;
  if (!node) return { focus: undefined, roles, siblings: [], connectors: [] };
  const focus = { key: occurrenceKey(regionId, [node.id]), node };

  const roleOf = (direction: 'parent' | 'child', field: string): NeighbourhoodRole => {
    const listed = (fields: readonly string[]) => fields.includes(field);
    const open = (fields: readonly string[]) => fields.length === 0 || listed(fields);
    if (listed(layout.left)) return 'left';
    if (listed(layout.right)) return 'right';
    if (direction === 'parent' && open(layout.above)) return 'above';
    if (direction === 'child' && open(layout.below)) return 'below';
    return 'around';
  };

  const best = new Map<SpaceNode['id'], NeighbourhoodRole>();
  const connectors: Connector[] = [];
  const neighbour = (id: SpaceNode['id'], direction: 'parent' | 'child', field: string) => {
    if (id === node.id || !graph.nodes.has(id)) return;
    const role = roleOf(direction, field);
    const current = best.get(id);
    if (!current || ORDER.indexOf(role) < ORDER.indexOf(current)) best.set(id, role);
    const key = occurrenceKey(regionId, [node.id, id]);
    connectors.push(direction === 'parent' ? { from: key, to: focus.key, field } : { from: focus.key, to: key, field });
  };
  for (const edge of parentEdges(graph, node.id)) neighbour(edge.parent, 'parent', edge.field);
  for (const edge of childEdges(graph, node.id)) neighbour(edge.child, 'child', edge.field);

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
