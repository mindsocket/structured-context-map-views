import { useCallback, useMemo, useRef, useState } from 'react';
import type { GraphLayoutConfig } from '../core/definition';
import { buildForceGraph } from '../core/force';
import { EdgeOverlay } from './EdgeOverlay';
import { NodeCard } from './NodeCard';
import type { LayoutProps } from './TreeLayout';

// Room each node needs: a card is about this wide, a shape is a marker with a label.
const CARD_SIZE = 220;
const SHAPE_SIZE = 90;

/** Nodes positioned by a force simulation, with straight connectors. */
export function GraphLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<GraphLayoutConfig>) {
  const shape = region.nodes.style === 'shape';
  const plot = useMemo(
    () => buildForceGraph(graph, region.id, region.layout, shape ? SHAPE_SIZE : CARD_SIZE),
    [graph, region.id, region.layout, shape],
  );
  const { show, labels } = region.edges;
  const links = useMemo(
    () => (show ? plot.links.map((link) => ({ ...link, id: link.field, label: labels ? link.field : undefined })) : []),
    [plot, show, labels],
  );

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const elements = useRef(new Map<string, HTMLElement>()).current;
  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.set(key, el);
      else elements.delete(key);
    },
    [elements],
  );

  return (
    <div
      ref={setContainer}
      className="mv:relative mv:min-h-full mv:min-w-full"
      style={{ width: plot.width, height: plot.height }}
    >
      {/* Before the nodes, so the opaque nodes cover the ends of the lines. */}
      <EdgeOverlay links={links} elements={elements} container={container} routing="straight" />
      {plot.points.map((point) => (
        <div
          key={point.key}
          data-occurrence={`${instanceId}${point.key}`}
          className={`mv:absolute mv:flex mv:items-center mv:gap-1 ${shape ? 'mv:-translate-x-3 mv:-translate-y-3' : 'mv:-translate-x-1/2 mv:-translate-y-1/2'}`}
          style={{ left: point.x, top: point.y }}
        >
          <div ref={register(point.key)}>
            <NodeCard node={point.node} repeat={false} nodes={region.nodes} onSelect={onNodeSelect} />
          </div>
          {shape && (
            <span className="mv:whitespace-nowrap mv:rounded mv:bg-surface/80 mv:px-0.5 mv:text-xs">
              {point.node.title}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
