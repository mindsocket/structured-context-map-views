import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { AxisConfig, XYLayoutConfig } from './definition';
import { edgesWithin, isHierarchyEdge } from './graph';
import { occurrenceKey } from './occurrence';

/** A plotted node. `x` and `y` run from 0 to 1 across the plot, left to right and bottom to top. */
export type XYPoint = { key: string; node: SpaceNode; x: number; y: number };

/** Why a node of a plotted type couldn't be placed, per axis. */
export type Unplaced = { key: string; node: SpaceNode; reasons: string[] };

/**
 * An edge between plotted nodes. `lane` separates edges joining the same two nodes: 0 when
 * there's one, otherwise centred around 0 (e.g. -0.5 and 0.5), for layouts to draw side by side.
 */
export type XYLink = { from: string; to: string; field: string; hierarchy: boolean; lane: number };

export type XYPlot = {
  points: XYPoint[];
  unplaced: Unplaced[];
  /** Edges between plotted nodes. */
  links: XYLink[];
  /** Each axis's [min, max]; `direction` says which end is drawn where. */
  domains: { x: readonly [number, number]; y: readonly [number, number] };
};

/**
 * Position nodes by two numeric fields. Every node of a plotted type appears once: on the plot
 * when both its values are numbers inside the axes' domains, otherwise in `unplaced` with the
 * reason. Positions are normalised; layouts decide the plot's size.
 */
export function buildXYPlot(graph: SpaceGraph, regionId: string, layout: XYLayoutConfig): XYPlot {
  const { x, y } = layout;
  const nodes = [...graph.nodes.values()];
  const types = new Set(
    layout.types.length > 0
      ? layout.types
      : nodes
          .filter((n) => isNumber(n.schemaData[x.field]) || isNumber(n.schemaData[y.field]))
          .map((n) => n.resolvedType),
  );
  const plotted = nodes.filter((n) => types.has(n.resolvedType));

  const domains = {
    x: domainOf(x, plotted),
    y: domainOf(y, plotted),
  };

  const points: XYPoint[] = [];
  const unplaced: Unplaced[] = [];
  for (const node of plotted) {
    const key = occurrenceKey(regionId, [node.id]);
    const px = position(node, x, domains.x);
    const py = position(node, y, domains.y);
    if (typeof px === 'number' && typeof py === 'number') points.push({ key, node, x: px, y: py });
    else unplaced.push({ key, node, reasons: [px, py].filter((r): r is string => typeof r === 'string') });
  }

  const keys = new Map<string, string>(points.map((p) => [p.node.id, p.key]));
  const fields = new Set(layout.edgeFields);
  const links = edgesWithin(graph)
    .filter((e) => keys.has(e.parent) && keys.has(e.child) && (fields.size === 0 || fields.has(e.field)))
    .map((e) => ({
      from: keys.get(e.parent)!,
      to: keys.get(e.child)!,
      field: e.field,
      hierarchy: isHierarchyEdge(e, graph.hierarchy),
      lane: 0,
    }));
  assignLanes(links);

  return { points, unplaced, links, domains };
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The axis's fixed domain, or the range of plotted values (widened when they're all equal). */
function domainOf(axis: AxisConfig, nodes: readonly SpaceNode[]): readonly [number, number] {
  if (Array.isArray(axis.domain)) return [axis.domain[0]!, axis.domain[1]!];
  const values = nodes.map((n) => n.schemaData[axis.field]).filter(isNumber);
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

/** The node's normalised position on the axis, or why it has none. */
function position(node: SpaceNode, axis: AxisConfig, [min, max]: readonly [number, number]): number | string {
  const value = node.schemaData[axis.field];
  if (value === undefined || value === null) return `no ${axis.field}`;
  if (!isNumber(value)) return `${axis.field} is not a number`;
  if (value < min || value > max) return `${axis.field} ${value} is outside ${min}–${max}`;
  const t = (value - min) / (max - min);
  return axis.direction === 'descending' ? 1 - t : t;
}

/** Spread links joining the same pair of nodes (in either direction) into lanes around 0. */
function assignLanes(links: XYLink[]) {
  const byPair = new Map<string, XYLink[]>();
  for (const link of links) {
    const pair = [link.from, link.to].sort().join('\n');
    byPair.set(pair, [...(byPair.get(pair) ?? []), link]);
  }
  for (const group of byPair.values()) {
    group.forEach((link, i) => {
      link.lane = i - (group.length - 1) / 2;
    });
  }
}
