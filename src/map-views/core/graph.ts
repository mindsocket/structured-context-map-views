import type { Hierarchy, SpaceGraph, SpaceNode } from 'structured-context/api';

type NodeId = SpaceNode['id'];

/** A directed parent → child edge of a space graph, carrying the metadata of the reference it came from. */
export type Edge = SpaceGraph['parentEdges'] extends ReadonlyMap<string, readonly (infer E)[]> ? E : never;

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
