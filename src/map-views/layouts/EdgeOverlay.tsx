import { useLayoutEffect, useState } from 'react';
import type { Orientation } from '../core';

/**
 * A connector between two occurrences. `cross` links (e.g. extra parents) are drawn dashed.
 * `id` tells apart several links between the same occurrences; straight links between the same
 * pair are drawn side by side, `lane` apart (0: on the line between centres).
 */
export type Link = { from: string; to: string; kind?: 'tree' | 'cross'; id?: string; lane?: number };

type Props = {
  links: readonly Link[];
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

type Drawn = { key: string; d: string; cross: boolean };

/**
 * SVG layer drawing connectors between rendered occurrences.
 *
 * Measures occurrence elements after layout and redraws when the container or any occurrence
 * resizes, so it follows embedded panes that resize independently of the window, and reflows
 * such as late font loads. The SVG fills the container instead of being sized from it, so it
 * never holds the container open after the layout shrinks.
 */
export function EdgeOverlay({ links, elements, container, routing }: Props) {
  const [paths, setPaths] = useState<Drawn[]>([]);

  useLayoutEffect(() => {
    if (!container) return;

    const measure = () => {
      const origin = container.getBoundingClientRect();
      const paths: Drawn[] = [];
      for (const { from, to, kind, id, lane = 0 } of links) {
        const a = elements.get(from)?.getBoundingClientRect();
        const b = elements.get(to)?.getBoundingClientRect();
        if (!a || !b) continue;
        paths.push({
          key: `${from}→${to}${id ?? ''}`,
          d: routing === 'straight' ? line(a, b, origin, lane) : connector(a, b, origin, routing),
          cross: kind === 'cross',
        });
      }
      setPaths(paths);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const element of elements.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [links, elements, container, routing]);

  return (
    <svg
      aria-hidden="true"
      className="mv:pointer-events-none mv:absolute mv:inset-0 mv:h-full mv:w-full mv:overflow-visible"
    >
      {paths.map(({ key, d, cross }) => (
        <path
          key={key}
          d={d}
          className={`mv:fill-none ${cross ? 'mv:stroke-accent/60' : 'mv:stroke-muted/50'}`}
          strokeWidth={1.5}
          strokeDasharray={cross ? '4 3' : undefined}
        />
      ))}
    </svg>
  );
}

/** Cubic curve from the parent's trailing edge to the child's leading edge. */
function connector(a: DOMRect, b: DOMRect, origin: DOMRect, orientation: Orientation): string {
  if (orientation === 'vertical') {
    const x1 = a.left + a.width / 2 - origin.left;
    const y1 = a.bottom - origin.top;
    const x2 = b.left + b.width / 2 - origin.left;
    const y2 = b.top - origin.top;
    const my = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
  }
  const x1 = a.right - origin.left;
  const y1 = a.top + a.height / 2 - origin.top;
  const x2 = b.left - origin.left;
  const y2 = b.top + b.height / 2 - origin.top;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

/** Pixels between parallel straight links. */
const LANE_GAP = 6;

/**
 * Straight line between centres, shifted sideways by its lane; the layout draws nodes over the
 * overlay to hide the ends. The shift is relative to a fixed orientation of the pair, so links in
 * opposite directions between the same nodes still separate.
 */
function line(a: DOMRect, b: DOMRect, origin: DOMRect, lane: number): string {
  const x1 = a.left + a.width / 2 - origin.left;
  const y1 = a.top + a.height / 2 - origin.top;
  const x2 = b.left + b.width / 2 - origin.left;
  const y2 = b.top + b.height / 2 - origin.top;
  const flip = x1 < x2 || (x1 === x2 && y1 < y2) ? 1 : -1;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (-(y2 - y1) / length) * lane * LANE_GAP * flip;
  const dy = ((x2 - x1) / length) * lane * LANE_GAP * flip;
  return `M${x1 + dx},${y1 + dy} L${x2 + dx},${y2 + dy}`;
}
