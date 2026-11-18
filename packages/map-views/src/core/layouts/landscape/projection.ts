import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { LayoutConfig } from '../../definition';
import { childEdges, occurrenceKey, type PathSegment, parentEdges } from '../helpers';

/** One rendered container or node in a landscape. */
export type LandscapeOccurrence = {
  /** Path-based key, unique within the map view (see {@link occurrenceKey}). */
  key: string;
  /** Index of the grouping level this occurrence belongs to, within its strip. */
  level: number;
  /** A node, or a field value common to the nodes inside (`null`: the field is empty). */
  item: { kind: 'node'; node: SpaceNode } | { kind: 'value'; field: string; value: string | null };
  /** Nodes on the `via` chain that joined this node to the node level above, one entry per skipped type. */
  via: ViaStep[];
  /** Key of the node's first occurrence when this is a repeat. Repeats are rendered in full. */
  repeatOf?: string;
  children: LandscapeOccurrence[];
};

type ViaStep = { type: string; nodes: SpaceNode[] };

/** A group of a dimension: a node of the dimension's type, or a value of its field. It holds nothing itself. */
export type LandscapeGroup = Pick<LandscapeOccurrence, 'key' | 'item'>;

type LandscapeStrip = {
  /** The strip's own dimension, dividing it further. */
  dimension?: LandscapeGroup[];
  /**
   * A cell for every group of the layout's dimension paired with every group of the strip's own, the
   * layout's varying slowest. A strip with no dimension has one cell.
   */
  cells: LandscapeCell[];
  /**
   * Nodes of the strip's levels that no cell or container reached (e.g. an Activity with no
   * Outcome when grouping by Outcomes), each with its own contents. Empty when the strip hides them.
   */
  ungrouped: LandscapeOccurrence[];
};

/** What the strip's grouping levels place among the nodes that belong to one group of each dimension. */
type LandscapeCell = {
  /** Path-based key of the strip and its group or pair of groups. */
  key: string;
  /** Indexes of its groups in the layout's dimension and in the strip's own; 0 where there is none. */
  at: [layout: number, strip: number];
  children: LandscapeOccurrence[];
};

/**
 * The layout as strips divided into cells. A dimension's groups are worked out once, so every cell
 * exists, empty or not. Which axis a dimension runs along is the component's choice. A plain
 * landscape is one strip with one cell and no dimension: the cell holds its top-level containers.
 */
export type Landscape = {
  /** The layout's dimension: its groups divide every strip alike, so the strips line up. */
  dimension?: LandscapeGroup[];
  /** The strips, in order. */
  strips: LandscapeStrip[];
};

type Candidate = { node: SpaceNode; via: ViaStep[] };
type ValueFilter = { field: string; value: string | null };
type NodeFilter = { node: SpaceNode; edge?: string };
/** Keeps the nodes with a field value, or the nodes joined to a node (across edges from `edge`, if set). */
type Filter = ValueFilter | NodeFilter;

/**
 * Lay a space out as strips of nested containers following each strip's grouping levels.
 *
 * Adjacent node levels are joined by any edge between their types, in either direction, or only
 * edges from `edge.field`. A `via` chain joins them through the skipped types. A field level
 * splits the next node level by that field's values. A node reached from several containers
 * appears in each, in full: the levels are finite, so repeating contents can't recurse.
 *
 * A dimension divides a strip into cells. A strip's first level is joined to a dimension's node the
 * way a level is joined to the node level above, so `via` applies there too.
 */
export function buildLandscape(graph: SpaceGraph, regionId: string, layout: LayoutConfig<'landscape'>): Landscape {
  const order = new Map([...graph.nodes.keys()].map((title, i) => [title, i]));
  // The first occurrence of each node, across strips, for marking repeats.
  const first = new Map<string, string>();

  const occurrenceFor = (
    strip: StripContext,
    candidate: Candidate,
    levelIdx: number,
    path: readonly PathSegment[],
  ): LandscapeOccurrence => {
    const { node } = candidate;
    const nodePath = [...path, node.id];
    const key = occurrenceKey(regionId, nodePath);
    const repeatOf = first.get(node.id);
    if (repeatOf === undefined) first.set(node.id, key);
    strip.placed.add(node.id);
    return {
      key,
      level: levelIdx,
      item: { kind: 'node', node },
      via: candidate.via,
      ...(repeatOf !== undefined && { repeatOf }),
      children: place(strip, levelIdx + 1, node, [], nodePath),
    };
  };

  /** Occurrences for level `levelIdx` of a strip inside `anchor`, the nearest enclosing node. */
  const place = (
    strip: StripContext,
    levelIdx: number,
    anchor: SpaceNode | undefined,
    filters: readonly Filter[],
    path: readonly PathSegment[],
  ): LandscapeOccurrence[] => {
    const level = strip.levels[levelIdx];
    if (level === undefined) return [];
    if (isTypeLevel(level)) {
      return candidates(level, anchor, filters).map((c) => occurrenceFor(strip, c, levelIdx, path));
    }

    const nodeLevel = strip.levels.slice(levelIdx).find(isTypeLevel)!;
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
        children: place(strip, levelIdx + 1, anchor, [...filters, { field: level.field, value }], valuePath),
      };
    });
  };

  /**
   * Nodes of a type level joined to `anchor` and matching the filters. With no anchor they are all
   * of the type at the top, or, under dimension nodes, those joined to every one of them.
   */
  const candidates = (level: TypeLevel, anchor: SpaceNode | undefined, filters: readonly Filter[]): Candidate[] => {
    const nodeFilters = filters.filter((f): f is NodeFilter => 'node' in f);
    let reached: Candidate[];
    if (anchor !== undefined) {
      reached = walkChain(anchor, level.via ?? [], level.type, level.edge?.field);
    } else if (nodeFilters.length === 0) {
      reached = ofType(level.type).map((node) => ({ node, via: [] }));
    } else {
      // PROTOTYPE: a dimension's `edge` applies to the last hop of a `via` chain, like a level's own,
      // and the skipped nodes shown for `intermediate: breadcrumb` come from the layout dimension only.
      const [head, ...rest] = nodeFilters.map((f) =>
        walkChain(f.node, level.via ?? [], level.type, f.edge ?? level.edge?.field),
      );
      reached = head!.filter((c) => rest.every((others) => others.some((o) => o.node.id === c.node.id)));
    }
    const values = filters.filter((f): f is ValueFilter => 'field' in f);
    return reached.filter(({ node }) => values.every((f) => valuesOf(node, f.field).includes(f.value)));
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

  /**
   * A dimension's groups, worked out once. A type dimension lists every node of its type, so it can
   * show a group that holds nothing. A field dimension takes the values the nodes of `drawn` (the
   * types of the first node level of each strip it divides) have, so a value no node has is not a group.
   * A node with no value, or joined to no node of the dimension, is in none of its groups; it
   * is shown as ungrouped, the same for both kinds.
   * PROTOTYPE: groups come in space order. A field's declared domain, or an `order` field, would give
   * the order authors expect and let a field dimension show empty groups too.
   */
  const dimensionGroups = (
    dimension: Dimension,
    drawn: readonly string[],
    prefix: readonly PathSegment[],
  ): { group: LandscapeGroup; filter: Filter; segment: PathSegment }[] => {
    if ('type' in dimension) {
      return ofType(dimension.type).map((node) => ({
        group: { key: occurrenceKey(regionId, [...prefix, node.id]), item: { kind: 'node', node } },
        filter: { node, edge: dimension.edge?.field },
        segment: node.id,
      }));
    }
    const { field } = dimension;
    const nodes = drawn.flatMap(ofType);
    return distinctValues(nodes, field)
      .filter((v) => v !== null)
      .map((value) => ({
        group: { key: occurrenceKey(regionId, [...prefix, [field, value]]), item: { kind: 'value', field, value } },
        filter: { field, value },
        segment: [field, value],
      }));
  };

  const firstNodeType = (strip: Strip) => strip.group.find(isTypeLevel)!.type;

  /** Nodes of the strip's levels that no container or cell reached get their own contents, like tree orphans. */
  const orphans = (strip: StripContext, hasDimension: boolean, path: readonly PathSegment[]) => {
    const ungrouped: LandscapeOccurrence[] = [];
    strip.levels.forEach((level, levelIdx) => {
      // The first level has no container above it unless a dimension divides the strip.
      if ((levelIdx === 0 && !hasDimension) || !isTypeLevel(level)) return;
      for (const node of ofType(level.type)) {
        if (!strip.placed.has(node.id)) {
          ungrouped.push(occurrenceFor(strip, { node, via: [] }, levelIdx, [...path, null]));
        }
      }
    });
    return ungrouped;
  };

  const layoutGroups = layout.dimension
    ? dimensionGroups(layout.dimension, [...new Set(layout.strips.map(firstNodeType))], [])
    : undefined;
  const strips = layout.strips.map((strip, s): LandscapeStrip => {
    const context: StripContext = { levels: strip.group, placed: new Set() };
    // Keys name the strip only where several could share a path; a lone strip keeps the shorter key.
    const stripPath: PathSegment[] = layout.strips.length > 1 ? [s] : [];
    const own = strip.dimension ? dimensionGroups(strip.dimension, [firstNodeType(strip)], stripPath) : undefined;
    const cells = (layoutGroups ?? [undefined]).flatMap((a, i) =>
      (own ?? [undefined]).map((b, j): LandscapeCell => {
        const along = [a, b].filter((d) => d !== undefined);
        const path = [...stripPath, ...along.map((d) => d.segment)];
        return {
          key: occurrenceKey(regionId, path),
          at: [i, j],
          children: place(
            context,
            0,
            undefined,
            along.map((d) => d.filter),
            path,
          ),
        };
      }),
    );
    return {
      ...(own && { dimension: own.map((d) => d.group) }),
      cells,
      ungrouped: strip.showUngrouped
        ? orphans(context, layoutGroups !== undefined || own !== undefined, stripPath)
        : [],
    };
  });

  return { ...(layoutGroups && { dimension: layoutGroups.map((d) => d.group) }), strips };
}

/** A strip being placed: its levels, and the nodes it has drawn so far. */
type StripContext = { levels: readonly GroupLevel[]; placed: Set<string> };
type Strip = LayoutConfig<'landscape'>['strips'][number];
type GroupLevel = Strip['group'][number];
type TypeLevel = Extract<GroupLevel, { type: string }>;
type Dimension = NonNullable<LayoutConfig<'landscape'>['dimension']>;

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
