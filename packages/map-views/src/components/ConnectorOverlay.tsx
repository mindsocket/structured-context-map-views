import { useLayoutEffect, useState } from 'react';
import type { EdgesConfig, Orientation } from '../core/definition';
import type { Connector } from '../core/layouts/helpers';

type Props = {
  connectors: readonly Connector[];
  /** The region's `edges` settings: whether connectors are drawn, and whether each shows its field. */
  edges: EdgesConfig;
  /** Rendered element of each occurrence, by occurrence key. */
  elements: ReadonlyMap<string, HTMLElement>;
  /**
   * Positioned element the overlay covers; coordinates are relative to it. Passed as an element,
   * not a ref: the overlay sits inside it, and React runs a child's layout effects before
   * attaching the parent's ref.
   */
  container: HTMLElement | null;
  /** Curves leaving along the tree's orientation, or straight lines between centres (drawn under the nodes). */
  routing: Orientation | 'straight';
};

type Drawn = { key: string; d: string; dashed: boolean; label?: string; at: readonly [number, number] };

/**
 * SVG layer drawing connectors between rendered occurrences.
 *
 * Measures occurrence elements after layout and redraws when the container or any occurrence
 * resizes, so it follows embedded panes that resize independently of the window, and reflows
 * such as late font loads. The SVG fills the container instead of being sized from it, so it
 * never holds the container open after the layout shrinks.
 */
export function ConnectorOverlay({ connectors, edges, elements, container, routing }: Props) {
  const [paths, setPaths] = useState<Drawn[]>([]);

  useLayoutEffect(() => {
    if (!container || !edges.show) return;

    const measure = () => {
      const origin = container.getBoundingClientRect();
      const paths: Drawn[] = [];
      for (const { from, to, field, lane = 0, dashed = false } of connectors) {
        const a = elements.get(from)?.getBoundingClientRect();
        const b = elements.get(to)?.getBoundingClientRect();
        if (!a || !b) continue;
        const [d, at] = routing === 'straight' ? line(a, b, origin, lane) : connector(a, b, origin, routing);
        paths.push({ key: `${from}→${to}${field ?? ''}`, d, dashed, label: edges.labels ? field : undefined, at });
      }
      setPaths(paths);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const element of elements.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [connectors, edges.show, edges.labels, elements, container, routing]);

  if (!edges.show) return null;

  return (
    <svg
      aria-hidden="true"
      className="mv:pointer-events-none mv:absolute mv:inset-0 mv:h-full mv:w-full mv:overflow-visible"
    >
      {paths.map(({ key, d, dashed }) => (
        <path
          key={key}
          d={d}
          className={`mv:fill-none ${dashed ? 'mv:stroke-accent/60' : 'mv:stroke-muted/50'}`}
          strokeWidth={1.5}
          strokeDasharray={dashed ? '4 3' : undefined}
        />
      ))}
      {paths.map(({ key, label, at }) =>
        label ? (
          <text
            key={`${key}:label`}
            x={at[0]}
            y={at[1]}
            textAnchor="middle"
            dominantBaseline="central"
            // The surface-coloured outline keeps the text legible over the line it labels.
            paintOrder="stroke"
            strokeWidth={4}
            className="mv:fill-muted mv:stroke-surface mv:text-[10px]"
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Cubic curve from the parent's trailing edge to the child's leading edge, and its midpoint. */
function connector(a: DOMRect, b: DOMRect, origin: DOMRect, orientation: Orientation): [string, [number, number]] {
  if (orientation === 'vertical') {
    const x1 = a.left + a.width / 2 - origin.left;
    const y1 = a.bottom - origin.top;
    const x2 = b.left + b.width / 2 - origin.left;
    const y2 = b.top - origin.top;
    const my = (y1 + y2) / 2;
    return [`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, [(x1 + x2) / 2, my]];
  }
  const x1 = a.right - origin.left;
  const y1 = a.top + a.height / 2 - origin.top;
  const x2 = b.left - origin.left;
  const y2 = b.top + b.height / 2 - origin.top;
  const mx = (x1 + x2) / 2;
  return [`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, [mx, (y1 + y2) / 2]];
}

/** Pixels between parallel straight connectors. */
const LANE_GAP = 6;

/**
 * Straight line between centres, shifted sideways by its lane; the layout draws nodes over the
 * overlay to hide the ends. The shift is relative to a fixed orientation of the pair, so connectors in
 * opposite directions between the same nodes still separate.
 */
function line(a: DOMRect, b: DOMRect, origin: DOMRect, lane: number): [string, [number, number]] {
  const x1 = a.left + a.width / 2 - origin.left;
  const y1 = a.top + a.height / 2 - origin.top;
  const x2 = b.left + b.width / 2 - origin.left;
  const y2 = b.top + b.height / 2 - origin.top;
  const flip = x1 < x2 || (x1 === x2 && y1 < y2) ? 1 : -1;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (-(y2 - y1) / length) * lane * LANE_GAP * flip;
  const dy = ((x2 - x1) / length) * lane * LANE_GAP * flip;
  return [`M${x1 + dx},${y1 + dy} L${x2 + dx},${y2 + dy}`, [(x1 + x2) / 2 + dx, (y1 + y2) / 2 + dy]];
}
