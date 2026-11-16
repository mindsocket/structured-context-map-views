import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { GraphLayoutConfig } from '../../definition';
import { assignLanes, edgesWithin } from '../../graph';
import { occurrenceKey } from '../../occurrence';

/** A positioned node; `x` and `y` are pixels from the top left of the plot. */
export type ForcePoint = { key: string; node: SpaceNode; x: number; y: number };

/** An edge between positioned nodes. `lane` as in `XYLink`. */
export type ForceLink = { from: string; to: string; field: string; lane: number };

export type ForceGraph = { points: ForcePoint[]; links: ForceLink[]; width: number; height: number };

const TICKS = 300;
const PADDING = 24;

/**
 * Position every node with a force simulation: edges pull their ends together, nodes push apart
 * and keep `nodeSize` pixels of room. The result is the same for the same graph.
 */
export function buildForceGraph(
  graph: SpaceGraph,
  regionId: string,
  layout: GraphLayoutConfig,
  nodeSize: number,
): ForceGraph {
  const nodes = [...graph.nodes.values()].map((node) => ({ node, x: 0, y: 0 }));
  const byId = new Map(nodes.map((n) => [n.node.id, n]));
  const fields = new Set(layout.edgeFields);
  const edges = edgesWithin(graph).filter((e) => e.parent !== e.child && (fields.size === 0 || fields.has(e.field)));

  // A fixed random source keeps positions stable between renders.
  let seed = 1;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const simulation = forceSimulation(nodes)
    .randomSource(random)
    .force(
      'link',
      forceLink<(typeof nodes)[number], { source: string; target: string }>(
        edges.map((e) => ({ source: e.parent, target: e.child })),
      )
        .id((n) => n.node.id)
        .distance(nodeSize * 1.5),
    )
    .force('charge', forceManyBody().strength(-nodeSize * 2))
    .force('collide', forceCollide(nodeSize / 2))
    // Keeps unconnected nodes and separate clusters from drifting apart.
    .force('x', forceX().strength(0.05))
    .force('y', forceY().strength(0.05))
    .stop();
  simulation.tick(TICKS);

  const minX = Math.min(...nodes.map((n) => n.x), 0);
  const minY = Math.min(...nodes.map((n) => n.y), 0);
  const maxX = Math.max(...nodes.map((n) => n.x), 0);
  const maxY = Math.max(...nodes.map((n) => n.y), 0);
  const key = (id: SpaceNode['id']) => occurrenceKey(regionId, [id]);

  const links = edges
    .filter((e) => byId.has(e.parent) && byId.has(e.child))
    .map((e) => ({ from: key(e.parent), to: key(e.child), field: e.field, lane: 0 }));
  assignLanes(links);

  return {
    points: nodes.map((n) => ({ key: key(n.node.id), node: n.node, x: n.x - minX + PADDING, y: n.y - minY + PADDING })),
    links,
    width: maxX - minX + 2 * PADDING,
    height: maxY - minY + 2 * PADDING,
  };
}
