import type { Hierarchy, SpaceNode } from 'structured-context/api';
import type { ResolvedParentRef } from 'structured-context/types';
import type { SpaceData } from './space-data';

/** A directed parent → child edge, carrying the metadata of the reference it came from. */
export type Edge = Omit<ResolvedParentRef, 'id'> & {
  parent: string;
  child: string;
};

/**
 * Lookup structure over a space's nodes and edges, built in the browser from {@link SpaceData}.
 *
 * Unlike structured-context's `SpaceGraph`, every edge keeps its metadata (field, kind,
 * hierarchy, direction of the field), and edges can be followed in both directions.
 * Layouts need that to group by a specific relationship, or to read an edge in reverse.
 */
export type SpaceIndex = {
  readonly hierarchy: Hierarchy | undefined;
  /** All nodes, keyed by `id`, in space order. */
  readonly nodes: ReadonlyMap<string, SpaceNode>;
  /** Edges whose parent and child are both in the space. */
  readonly edges: readonly Edge[];
  /** Edges to a node's children, in space order of the children. */
  childEdges(id: string): readonly Edge[];
  /** Edges to a node's parents, in the order the node declares them. */
  parentEdges(id: string): readonly Edge[];
};

const NONE: readonly Edge[] = [];

export function buildSpaceIndex(data: SpaceData): SpaceIndex {
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  const edges: Edge[] = [];
  const byParent = new Map<string, Edge[]>();
  const byChild = new Map<string, Edge[]>();

  for (const node of data.nodes) {
    for (const { id: parent, ...meta } of node.resolvedParents) {
      // Parents can be missing when the space has been narrowed by a filter.
      if (!nodes.has(parent)) continue;
      const edge: Edge = { ...meta, parent, child: node.id };
      edges.push(edge);
      append(byParent, parent, edge);
      append(byChild, node.id, edge);
    }
  }

  return {
    hierarchy: data.hierarchy,
    nodes,
    edges,
    childEdges: (id) => byParent.get(id) ?? NONE,
    parentEdges: (id) => byChild.get(id) ?? NONE,
  };
}

/** Whether an edge belongs to the given hierarchy (as opposed to a relationship or another hierarchy). */
export function isHierarchyEdge(edge: Edge, hierarchy: Hierarchy | undefined): boolean {
  return hierarchy !== undefined && edge.kind === 'hierarchy' && edge.hierarchy === hierarchy.name;
}

function append<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
