import type { Hierarchy, SpaceGraph } from 'structured-context/api';
import type { NodeId } from 'structured-context/types';

/** A directed parent → child edge of a space graph, carrying the metadata of the reference it came from. */
type Edge = SpaceGraph['parentEdges'] extends ReadonlyMap<string, readonly (infer E)[]> ? E : never;

const NONE: readonly Edge[] = [];

/**
 * Edges to a node's parents, in the order the node declares them. A graph narrowed by a filter keeps
 * edges to parents outside it; those are left out.
 */
export function parentEdges(graph: SpaceGraph, id: NodeId): readonly Edge[] {
  return (graph.parentEdges.get(id) ?? NONE).filter((edge) => graph.nodes.has(edge.parent));
}

/** Edges to a node's children, in graph order of the children. */
export function childEdges(graph: SpaceGraph, id: NodeId): readonly Edge[] {
  return graph.childEdges.get(id) ?? NONE;
}

/** Every edge whose parent and child are both in the graph. */
export function edgesWithin(graph: SpaceGraph): Edge[] {
  return [...graph.nodes.keys()].flatMap((id) => parentEdges(graph, id));
}

/** Whether an edge belongs to the given hierarchy (as opposed to a relationship or another hierarchy). */
export function isHierarchyEdge(edge: Edge, hierarchy: Hierarchy | undefined): boolean {
  return hierarchy !== undefined && edge.kind === 'hierarchy' && edge.hierarchy === hierarchy.name;
}

/**
 * A connector between two occurrences, by key, in the direction of the edge it draws.
 * `field` is the field the edge is declared in. `lane` separates connectors joining the same two
 * occurrences: 0 when there's one, otherwise centred around 0 (e.g. -0.5 and 0.5).
 * `dashed` marks a connector that is secondary to the layout's structure.
 */
export type Connector = { from: string; to: string; field?: string; lane?: number; dashed?: boolean };

/** Spread connectors joining the same pair of occurrences (in either direction) into lanes around 0. */
export function assignLanes(connectors: Connector[]) {
  const byPair = new Map<string, Connector[]>();
  for (const connector of connectors) {
    const pair = [connector.from, connector.to].sort().join('\n');
    byPair.set(pair, [...(byPair.get(pair) ?? []), connector]);
  }
  for (const group of byPair.values()) {
    group.forEach((connector, i) => {
      connector.lane = i - (group.length - 1) / 2;
    });
  }
}

/**
 * One step of an occurrence path: a node title, a `[field, value]` group, or `null` for the
 * ungrouped area. Encoded distinctly, so a field group can't collide with a node of the same name.
 */
export type PathSegment = string | readonly [field: string, value: string | null] | null;

/**
 * Path-based key for one occurrence of a node: region, then the steps from the outermost
 * container down to the node. Unique within a map view even when a node appears several times.
 * Hosts can render several map views at once, so layouts scope keys to the map view instance.
 */
export function occurrenceKey(regionId: string, path: readonly PathSegment[]): string {
  return JSON.stringify([regionId, ...path]);
}
