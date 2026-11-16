import { useMemo, useState } from 'react';
import type { SpaceNode } from 'structured-context/api';
import type { LayoutConfig } from '../core/definition';
import { buildNeighbourhood, type Neighbour } from '../core/layouts/neighbourhood/projection';
import { ConnectorOverlay } from './ConnectorOverlay';
import { type LayoutProps, useOccurrenceElements } from './layout';
import { NodeCard } from './NodeCard';

// The most nodes across in the zones above and below, and down in the zones at the sides.
const ACROSS = 3;
const SIDE_ROWS = 6;

/**
 * One node with its neighbours around it. Selecting a neighbour moves the focus to it; selecting
 * the focus is a regular node selection.
 */
export function NeighbourhoodLayout({
  graph,
  region,
  instanceId,
  onNodeSelect,
  focus,
  onFocusChange,
}: LayoutProps<LayoutConfig<'neighbourhood'>>) {
  const [picked, setPicked] = useState<{ from: SpaceNode['id'] | undefined; id: SpaceNode['id'] }>();
  // A focus the host sets later wins over the reader's earlier pick.
  const focusId = picked && picked.from === focus ? picked.id : focus;
  const neighbourhood = useMemo(
    () => buildNeighbourhood(graph, region.id, region.layout, focusId),
    [graph, region.id, region.layout, focusId],
  );

  const { container, setContainer, elements, register } = useOccurrenceElements();

  if (!neighbourhood.focus) return null;
  const current = neighbourhood.focus.node;
  const select = (node: SpaceNode) => {
    if (node.id === current.id) return onNodeSelect?.(node);
    setPicked({ from: focus, id: node.id });
    onFocusChange?.(node.id);
  };
  const cell = (item: { key: string; node: SpaceNode }) => (
    <div
      key={item.key}
      ref={register(item.key)}
      className="mv:relative mv:z-10"
      data-occurrence={`${instanceId}${item.key}`}
    >
      <NodeCard node={item.node} repeat={false} nodes={region.nodes} onSelect={select} />
    </div>
  );
  // A zone wraps into a few rows or columns, so a large one doesn't push the focus off screen.
  const zone = (items: Neighbour[], columns: number, className = '') =>
    items.length > 0 && (
      <div
        className={`mv:grid mv:items-center mv:gap-3 ${className}`}
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, columns)}, max-content)` }}
      >
        {items.map(cell)}
      </div>
    );
  const side = (items: Neighbour[]) => Math.ceil(items.length / SIDE_ROWS);
  const { above, below, left, right } = neighbourhood.roles;
  const { siblings } = neighbourhood;

  return (
    <div
      ref={setContainer}
      className="mv:relative mv:grid mv:w-max mv:min-w-full mv:grid-cols-[auto_auto_auto] mv:items-center mv:justify-center mv:gap-x-24 mv:gap-y-16 mv:p-6"
    >
      <div className="mv:col-start-2 mv:justify-self-center">{zone(above, ACROSS)}</div>
      <div className="mv:col-start-1 mv:justify-self-end">{zone(left, side(left))}</div>
      <div className="mv:col-start-2 mv:justify-self-center mv:rounded-md mv:ring-2 mv:ring-accent">
        {cell(neighbourhood.focus)}
      </div>
      <div className="mv:flex mv:items-center mv:gap-24">
        {zone(right, side(right))}
        {zone(siblings, side(siblings), 'mv:opacity-70')}
      </div>
      <div className="mv:col-start-2 mv:justify-self-center">{zone(below, ACROSS)}</div>
      <ConnectorOverlay
        connectors={neighbourhood.connectors}
        edges={region.edges}
        elements={elements}
        container={container}
        routing="straight"
      />
    </div>
  );
}
