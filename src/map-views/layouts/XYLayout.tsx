import { useCallback, useMemo, useRef, useState } from 'react';
import { type AxisConfig, buildXYPlot, type XYLayoutConfig } from '../core';
import { EdgeOverlay } from './EdgeOverlay';
import { NodeCard } from './NodeCard';
import type { LayoutProps } from './TreeLayout';

/**
 * Nodes positioned by two numeric fields, with straight connectors between them. Positions are
 * percentages of the plot area, which fills the container (scrolling below a minimum size). Nodes that can't be
 * placed are listed under the plot with the reason.
 * PROTOTYPE: labels may overlap where nodes sit close together; no collision handling.
 */
export function XYLayout({ index, region, instanceId, onNodeSelect }: LayoutProps<XYLayoutConfig>) {
  const { layout } = region;
  const plot = useMemo(() => buildXYPlot(index, region.id, layout), [index, region.id, layout]);
  // Relationship edges (flows, pipelines) are dashed, to tell them from the value chain.
  const links = useMemo(
    () =>
      region.edges.show
        ? plot.links.map(({ from, to, field, hierarchy, lane }) => ({
            from,
            to,
            id: field,
            lane,
            kind: hierarchy ? ('tree' as const) : ('cross' as const),
          }))
        : [],
    [plot, region.edges.show],
  );
  const shape = region.nodes.style === 'shape';

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
    <div className="mv:box-border mv:flex mv:h-full mv:min-h-[28rem] mv:min-w-[36rem] mv:flex-col mv:gap-4 mv:p-4">
      <div className="mv:grid mv:min-h-0 mv:flex-1 mv:grid-cols-[auto_1fr] mv:grid-rows-[1fr_auto] mv:gap-1">
        <AxisTitle axis={layout.y} domain={plot.domains.y} vertical />
        <div ref={setContainer} className="mv:relative mv:border-b mv:border-l mv:border-edge">
          {/* Before the nodes, so the opaque nodes cover the ends of the lines. */}
          <EdgeOverlay links={links} elements={elements} container={container} routing="straight" />
          {/* Inset, so nodes at the ends of a domain stay inside the plot. */}
          <div className="mv:absolute mv:inset-8">
            {plot.points.map((point) => (
              <div
                key={point.key}
                data-occurrence={`${instanceId}${point.key}`}
                className={`mv:absolute mv:flex mv:items-center mv:gap-1 ${shape ? 'mv:-translate-x-3 mv:translate-y-3' : 'mv:-translate-x-1/2 mv:translate-y-1/2'}`}
                style={{ left: `${point.x * 100}%`, bottom: `${point.y * 100}%` }}
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
        </div>
        <div />
        <AxisTitle axis={layout.x} domain={plot.domains.x} />
      </div>

      {plot.unplaced.length > 0 && (
        <section className="mv:flex mv:flex-col mv:gap-2">
          <span className="mv:text-xs mv:font-semibold mv:text-muted">Not plotted</span>
          <ul className="mv:m-0 mv:flex mv:list-none mv:flex-wrap mv:gap-3 mv:p-0">
            {plot.unplaced.map(({ key, node, reasons }) => (
              <li key={key} data-occurrence={`${instanceId}${key}`} className="mv:flex mv:items-center mv:gap-1">
                <NodeCard node={node} repeat={false} nodes={region.nodes} onSelect={onNodeSelect} />
                <span className="mv:text-xs">
                  {shape && `${node.title} `}
                  <span className="mv:text-muted">({reasons.join('; ')})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Axis title with the values at each end, in drawing order. */
function AxisTitle({
  axis,
  domain: [min, max],
  vertical = false,
}: {
  axis: AxisConfig;
  domain: readonly [number, number];
  vertical?: boolean;
}) {
  const [start, end] = axis.direction === 'descending' ? [max, min] : [min, max];
  return (
    <div
      className={`mv:flex mv:items-center mv:justify-between mv:gap-2 mv:text-xs mv:text-muted ${vertical ? 'mv:flex-col-reverse mv:py-8' : 'mv:px-8'}`}
    >
      <span>{format(start)}</span>
      <span className={`mv:font-semibold ${vertical ? 'mv:[writing-mode:vertical-rl] mv:rotate-180' : ''}`}>
        {axis.label ?? axis.field}
      </span>
      <span>{format(end)}</span>
    </div>
  );
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(3).replace(/\.?0+$/, '');
}
