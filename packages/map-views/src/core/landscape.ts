import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { GroupLevel, LandscapeLayoutConfig } from './definition';
import { childEdges, parentEdges } from './graph';
import { occurrenceKey, type PathSegment } from './occurrence';

/** One rendered container or node in a landscape. */
export type LandscapeOccurrence = {
  /** Path-based key, unique within the map view (see {@link occurrenceKey}). */
  key: string;
  /** Index of the grouping level this occurrence belongs to. */
  level: number;
  /** A node, or a field value shared by the nodes inside (`null`: the field is empty). */
  item: { kind: 'node'; node: SpaceNode } | { kind: 'value'; field: string; value: string | null };
  /** Nodes on the `via` chain that joined this node to the node level above, one entry per skipped type. */
  via: ViaStep[];
  /** Key of the node's first occurrence when this is a repeat. Repeats are rendered in full. */
  repeatOf?: string;
  children: LandscapeOccurrence[];
};

export type ViaStep = { type: string; nodes: SpaceNode[] };

export type Landscape = {
  groups: LandscapeOccurrence[];
  /**
   * Nodes of a grouped level that no container above reaches (e.g. an Activity with no
   * Outcome when grouping by Outcomes), each with its own contents.
   */
  ungrouped: LandscapeOccurrence[];
};

type Candidate = { node: SpaceNode; via: ViaStep[] };
type FieldFilter = { field: string; value: string | null };

/**
 * Lay a space out as nested containers following the layout's grouping levels.
 *
 * Adjacent node levels are joined by any edge between their types, in either direction, or only
 * edges from `edge.field`. A `via` chain joins them through the skipped types. A field level
 * splits the next node level by that field's values. A node reached from several containers
 * appears in each, in full: the levels are finite, so repeating contents can't recurse.
 */
export function buildLandscape(graph: SpaceGraph, regionId: string, layout: LandscapeLayoutConfig): Landscape {
  const levels = layout.group;
  const order = new Map([...graph.nodes.keys()].map((title, i) => [title, i]));
  const first = new Map<string, string>();

  const occurrenceFor = (candidate: Candidate, levelIdx: number, path: readonly PathSegment[]): LandscapeOccurrence => {
    const { node } = candidate;
    const nodePath = [...path, node.id];
    const key = occurrenceKey(regionId, nodePath);
    const repeatOf = first.get(node.id);
    if (repeatOf === undefined) first.set(node.id, key);
    return {
      key,
      level: levelIdx,
      item: { kind: 'node', node },
      via: candidate.via,
      ...(repeatOf !== undefined && { repeatOf }),
      children: place(levelIdx + 1, node, [], nodePath),
    };
  };

  /** Occurrences for level `levelIdx` inside `anchor`, the nearest enclosing node. */
  const place = (
    levelIdx: number,
    anchor: SpaceNode | undefined,
    filters: readonly FieldFilter[],
    path: readonly PathSegment[],
  ): LandscapeOccurrence[] => {
    const level = levels[levelIdx];
    if (level === undefined) return [];
    if (isTypeLevel(level)) {
      return candidates(level, anchor, filters).map((c) => occurrenceFor(c, levelIdx, path));
    }

    const nodeLevel = levels.slice(levelIdx).find(isTypeLevel)!;
    const values = distinctValues(
      candidates(nodeLevel, anchor, filters).map((c) => c.node),
      level.field,
    );
    return values.map((value) => {
      const valuePath = [...path, [level.field, value] as const];
      return {
        key: occurrenceKey(regionId, valuePath),
        level: levelIdx,
        item: { kind: 'value', field: level.field, value },
        via: [],
        children: place(levelIdx + 1, anchor, [...filters, { field: level.field, value }], valuePath),
      };
    });
  };

  /** Nodes of a type level joined to `anchor` (all of the type at the top) and matching the filters. */
  const candidates = (
    level: TypeLevel,
    anchor: SpaceNode | undefined,
    filters: readonly FieldFilter[],
  ): Candidate[] => {
    const reached: Candidate[] =
      anchor === undefined
        ? ofType(level.type).map((node) => ({ node, via: [] }))
        : walkChain(anchor, level.via ?? [], level.type, level.edge?.field);
    return reached.filter(({ node }) => filters.every((f) => hasValue(node, f)));
  };

  const ofType = (type: string) => [...graph.nodes.values()].filter((node) => node.resolvedType === type);

  /** Neighbours of a node with the given type, across edges in either direction, in space order. */
  const neighbours = (title: SpaceNode['id'], type: string, field: string | undefined): SpaceNode[] => {
    const titles = new Set([
      ...childEdges(graph, title)
        .filter((e) => field === undefined || e.field === field)
        .map((e) => e.child),
      ...parentEdges(graph, title)
        .filter((e) => field === undefined || e.field === field)
        .map((e) => e.parent),
    ]);
    return [...titles]
      .map((t) => graph.nodes.get(t)!)
      .filter((node) => node.resolvedType === type)
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  };

  /**
   * Follow edges from `anchor` through each `via` type to `target`, keeping the skipped nodes on
   * the way to each target node. Several chains to one target merge into one candidate.
   */
  const walkChain = (anchor: SpaceNode, via: readonly string[], target: string, field: string | undefined) => {
    let frontier = [{ node: anchor, trail: [] as SpaceNode[] }];
    for (const type of via) {
      frontier = frontier.flatMap(({ node, trail }) =>
        neighbours(node.id, type, undefined).map((next) => ({ node: next, trail: [...trail, next] })),
      );
    }
    const byTitle = new Map<string, Candidate>();
    for (const { node, trail } of frontier) {
      for (const next of neighbours(node.id, target, field)) {
        const candidate = byTitle.get(next.id) ?? { node: next, via: via.map((type) => ({ type, nodes: [] })) };
        trail.forEach((skipped, i) => {
          const step = candidate.via[i]!;
          if (!step.nodes.includes(skipped)) step.nodes.push(skipped);
        });
        byTitle.set(next.id, candidate);
      }
    }
    return [...byTitle.values()].sort((a, b) => order.get(a.node.id)! - order.get(b.node.id)!);
  };

  const groups = place(0, undefined, [], []);

  // Nodes of an inner level that no container reached get their own contents, like tree orphans.
  const ungrouped: LandscapeOccurrence[] = [];
  levels.forEach((level, levelIdx) => {
    if (levelIdx === 0 || !isTypeLevel(level)) return;
    for (const node of ofType(level.type)) {
      if (!first.has(node.id)) ungrouped.push(occurrenceFor({ node, via: [] }, levelIdx, [null]));
    }
  });

  return { groups, ungrouped };
}

type TypeLevel = Extract<GroupLevel, { type: string }>;

function isTypeLevel(level: GroupLevel): level is TypeLevel {
  return 'type' in level;
}

/** A field's values as group labels: strings, an entry per array item, `null` when empty. */
function valuesOf(node: SpaceNode, field: string): (string | null)[] {
  const raw = node.schemaData[field];
  const list = (Array.isArray(raw) ? raw : [raw]).filter((v) => v !== undefined && v !== null && v !== '');
  return list.length === 0 ? [null] : list.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)));
}

/** Distinct values in first-seen order, with the empty group last. */
function distinctValues(nodes: SpaceNode[], field: string): (string | null)[] {
  const values = new Set(nodes.flatMap((node) => valuesOf(node, field)));
  const present = [...values].filter((v): v is string => v !== null);
  return values.has(null) ? [...present, null] : present;
}

function hasValue(node: SpaceNode, { field, value }: FieldFilter): boolean {
  return valuesOf(node, field).includes(value);
}
