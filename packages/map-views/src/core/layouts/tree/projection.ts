import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { DagMode } from '../../definition';
import { type Connector, childEdges, isHierarchyEdge, occurrenceKey, parentEdges } from '../helpers';

/** One rendered appearance of a node in a tree. */
export type TreeOccurrence = {
  /** Path-based key, unique within the map view (see {@link occurrenceKey}). */
  key: string;
  node: SpaceNode;
  children: TreeOccurrence[];
  /**
   * Key of the node's primary occurrence when this is a repeat. A node with several parents
   * appears under each of them, but its subtree is only rendered at its first occurrence.
   */
  repeatOf?: string;
  /** The field the parent declares this node through (the edge's label); unset for roots. */
  field?: string;
};

export type Tree = {
  roots: TreeOccurrence[];
  /**
   * Hierarchy-typed nodes not reachable from a root, rendered as extra roots: nodes with no
   * hierarchy parent in the space, then entry points into otherwise unreachable cycles.
   */
  orphans: TreeOccurrence[];
  /** Key of each node's primary (first, fully rendered) occurrence. */
  primary: ReadonlyMap<string, string>;
  /**
   * In cross-edge mode, connectors from a node's other parents to its primary occurrence, which
   * replace repeat occurrences. Empty in repeat mode.
   */
  crossConnectors: Connector[];
};

/**
 * Lay a space out as a tree over its hierarchy.
 *
 * Roots are root-type nodes with no hierarchy parent. Traversal is depth-first in space order,
 * so a node's primary occurrence is under the parent reached first. Under its other parents a
 * node is either repeated without its subtree (`repeat`), or left out and linked by a cross-edge
 * (`cross-edge`). Either way traversal stops there, which also keeps cycles from recursing.
 */
export function buildTree(graph: SpaceGraph, regionId: string, dag: DagMode = 'repeat'): Tree {
  const { hierarchy } = graph;
  const levelTypes = new Set(hierarchy?.levels.map((level) => level.type));
  const rootType = hierarchy?.levels[0]?.type;
  const primary = new Map<string, string>();
  // Parent occurrence → child title, resolved to the child's primary occurrence afterwards.
  const pendingCross: { from: string; child: string; field: string }[] = [];

  const hierarchyParents = (title: SpaceNode['id']) =>
    parentEdges(graph, title).filter((edge) => isHierarchyEdge(edge, hierarchy));

  const visit = (node: SpaceNode, path: readonly string[]): TreeOccurrence => {
    const nodePath = [...path, node.id];
    const key = occurrenceKey(regionId, nodePath);
    primary.set(node.id, key);
    // A child can reference the same parent through more than one field; it occurs once, under the first.
    const childFields = new Map<SpaceNode['id'], string>();
    for (const edge of childEdges(graph, node.id)) {
      if (isHierarchyEdge(edge, hierarchy) && !childFields.has(edge.child)) childFields.set(edge.child, edge.field);
    }
    const children: TreeOccurrence[] = [];
    for (const [title, field] of childFields) {
      const child = graph.nodes.get(title)!;
      const repeatOf = primary.get(title);
      if (repeatOf === undefined) children.push({ ...visit(child, nodePath), field });
      else if (dag === 'repeat')
        children.push({
          key: occurrenceKey(regionId, [...nodePath, title]),
          node: child,
          children: [],
          repeatOf,
          field,
        });
      else pendingCross.push({ from: key, child: title, field });
    }
    return { key, node, children };
  };

  const levelNodes = [...graph.nodes.values()].filter((node) => levelTypes.has(node.resolvedType));
  const unparented = levelNodes.filter((node) => hierarchyParents(node.id).length === 0);
  const roots = unparented.filter((node) => node.resolvedType === rootType).map((node) => visit(node, []));
  const orphans = unparented.filter((node) => node.resolvedType !== rootType).map((node) => visit(node, []));
  // Nodes only reachable through a cycle have a parent but no path from a root. Rather than
  // drop them, enter each such cycle at its first node in space order.
  for (const node of levelNodes) {
    if (!primary.has(node.id)) orphans.push(visit(node, []));
  }

  const crossConnectors = pendingCross.map(({ from, child, field }) => ({
    from,
    to: primary.get(child)!,
    field,
    dashed: true,
  }));
  return { roots, orphans, primary, crossConnectors };
}

/** Parent → child pairs of occurrence keys: one per rendered parent-child connector, then cross-edge connectors. */
export function treeConnectors(tree: Tree): Connector[] {
  const connectors: Connector[] = [];
  const walk = (occurrence: TreeOccurrence) => {
    for (const child of occurrence.children) {
      connectors.push({ from: occurrence.key, to: child.key, field: child.field });
      walk(child);
    }
  };
  for (const root of [...tree.roots, ...tree.orphans]) walk(root);
  return [...connectors, ...tree.crossConnectors];
}
