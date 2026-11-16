import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { useMemo } from 'react';
import type { SpaceGraph } from 'structured-context/api';
import type { LayoutConfig } from '../core/definition';
import { assignLanes, type Connector, edgesWithin, isHierarchyEdge, occurrenceKey } from '../core/layouts/helpers';
import { ConnectorOverlay } from './ConnectorOverlay';
import { type LayoutProps, useOccurrenceElements } from './layout';
import { NodeCard } from './NodeCard';

// Room each node needs. A card is a wide box; a shape is a marker with a label beside it.
const CARD_ROOM = { width: 230, height: 110 };
const SHAPE_ROOM = { width: 170, height: 40 };
const TICKS = 300;
const PADDING = 24;
// Nodes across per node down in a level's band.
const BAND_ASPECT = 4;
// Rows left clear between bands, for the connectors.
const BAND_GAP = 1.5;
const LOOSE_PER_ROW = 4;

/**
 * The space graph as a network, positioned by a force simulation. The hierarchy gives it shape:
 * hierarchy edges hold their nodes close and each level settles below the one above, while
 * relationship edges pull weakly and are drawn dashed.
 */
export function GraphLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<LayoutConfig<'graph'>>) {
  const shape = region.nodes.style === 'shape';
  const plot = useMemo(
    () => settle(graph, region.id, region.layout.edgeFields, shape ? SHAPE_ROOM : CARD_ROOM),
    [graph, region.id, region.layout.edgeFields, shape],
  );

  const { container, setContainer, elements, register } = useOccurrenceElements();

  return (
    <div
      ref={setContainer}
      className="mv:relative mv:min-h-full mv:min-w-full"
      style={{ width: plot.width, height: plot.height }}
    >
      {/* Before the nodes, so the opaque nodes cover the ends of the lines. */}
      <ConnectorOverlay
        connectors={plot.connectors}
        edges={region.edges}
        elements={elements}
        container={container}
        routing="straight"
      />
      {plot.points.map(({ key, node, x, y }) => (
        <div
          key={key}
          data-occurrence={`${instanceId}${key}`}
          className={`mv:absolute mv:flex mv:items-center mv:gap-1 ${shape ? 'mv:-translate-x-3 mv:-translate-y-3' : 'mv:-translate-x-1/2 mv:-translate-y-1/2'}`}
          style={{ left: x, top: y }}
        >
          <div ref={register(key)}>
            <NodeCard node={node} repeat={false} nodes={region.nodes} onSelect={onNodeSelect} />
          </div>
          {shape && (
            <span className="mv:whitespace-nowrap mv:rounded mv:bg-surface/80 mv:px-0.5 mv:text-xs">{node.title}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Run the simulation to rest. d3-force seeds its own random source, so the same graph settles
 * the same way on every render.
 *
 * The simulation treats each node as a circle one row high; x is stretched afterwards to the
 * node's width, which packs wide nodes as boxes without a rectangular collision force.
 */
function settle(graph: SpaceGraph, regionId: string, edgeFields: readonly string[], room: typeof CARD_ROOM) {
  const row = room.height;
  const edges = edgesWithin(graph)
    // An edge from a node to itself has nothing to connect.
    .filter((e) => e.parent !== e.child && (edgeFields.length === 0 || edgeFields.includes(e.field)))
    .map((e) => ({
      source: occurrenceKey(regionId, [e.parent]),
      target: occurrenceKey(regionId, [e.child]),
      field: e.field,
      hierarchy: isHierarchyEdge(e, graph.hierarchy),
    }));
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]));

  const levelTypes = graph.hierarchy?.levels.map((level) => level.type) ?? [];
  const all = [...graph.nodes.values()].map((node) => ({
    key: occurrenceKey(regionId, [node.id]),
    node,
    // -1: not in the hierarchy.
    level: levelTypes.indexOf(node.resolvedType),
    x: 0,
    y: 0,
  }));
  const points = all.filter((p) => connected.has(p.key));
  const loose = all.filter((p) => !connected.has(p.key));

  // Each hierarchy level gets a band deep enough to hold its nodes a few rows high, below the
  // band of the level above.
  let bandTop = 0;
  const bandCentre = levelTypes.map((_, level) => {
    const count = points.filter((p) => p.level === level).length;
    const depth = Math.max(1, Math.ceil(Math.sqrt(count / BAND_ASPECT))) * row;
    const centre = bandTop + depth / 2;
    bandTop += depth + row * BAND_GAP;
    return centre;
  });

  forceSimulation(points)
    .force(
      'link',
      forceLink<(typeof points)[number], (typeof edges)[number]>(edges.map((e) => ({ ...e })))
        .id((point) => point.key)
        .distance(row * (BAND_GAP + 1))
        .strength((e) => (e.hierarchy ? 0.2 : 0.05)),
    )
    .force(
      'charge',
      forceManyBody()
        .strength(-row / 2)
        .distanceMax(row * 4),
    )
    .force('collide', forceCollide(row / 2))
    // Hierarchy nodes are drawn to the middle, which keeps the hierarchy together; any other node
    // is free to drift to the sides.
    .force(
      'x',
      forceX<(typeof points)[number]>().strength((p) => (p.level < 0 ? 0.01 : 0.15)),
    )
    // A hierarchy node is held in its level's band; any other node goes where its edges pull it.
    .force(
      'y',
      forceY<(typeof points)[number]>((p) => bandCentre[p.level] ?? 0).strength((p) => (p.level < 0 ? 0 : 0.6)),
    )
    .stop()
    .tick(TICKS);

  const stretch = room.width / row;
  const left = Math.min(0, ...points.map((p) => p.x));
  const top = Math.min(0, ...points.map((p) => p.y));
  for (const point of points) {
    point.x = (point.x - left) * stretch + room.width / 2 + PADDING;
    point.y = point.y - top + row / 2 + PADDING;
  }
  const width = Math.max(room.width * LOOSE_PER_ROW, ...points.map((p) => p.x + room.width / 2)) + PADDING;
  const bottom = Math.max(0, ...points.map((p) => p.y + row / 2));

  // Nodes with no edge shown have nothing to position them: they sit in a grid underneath.
  const perRow = Math.max(1, Math.floor((width - PADDING * 2) / room.width));
  loose.forEach((point, i) => {
    point.x = PADDING + room.width / 2 + (i % perRow) * room.width;
    point.y = bottom + row * 1.5 + Math.floor(i / perRow) * row;
  });

  const connectors: Connector[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
    field: e.field,
    dashed: !e.hierarchy,
  }));
  assignLanes(connectors);
  return {
    points: all,
    connectors,
    width,
    height: Math.max(bottom, ...loose.map((p) => p.y + row / 2)) + PADDING,
  };
}
