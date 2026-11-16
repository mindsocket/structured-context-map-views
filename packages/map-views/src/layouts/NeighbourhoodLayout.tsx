import { useMemo, useState } from 'react';
import type { SpaceNode } from 'structured-context/api';
import type { NeighbourhoodLayoutConfig } from '../core/definition';
import { buildNeighbourhood, type Neighbour } from '../core/neighbourhood';
import { EdgeOverlay } from './EdgeOverlay';
import { type LayoutProps, overlayLinks, useOccurrenceElements } from './layout';
import { NodeCard } from './NodeCard';

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
}: LayoutProps<NeighbourhoodLayoutConfig>) {
  const [picked, setPicked] = useState<{ from: SpaceNode['id'] | undefined; id: SpaceNode['id'] }>();
  // A focus the host sets later wins over the reader's earlier pick.
  const focusId = picked && picked.from === focus ? picked.id : focus;
  const neighbourhood = useMemo(
    () => buildNeighbourhood(graph, region.id, region.layout, focusId),
    [graph, region.id, region.layout, focusId],
  );
  const links = useMemo(() => overlayLinks(neighbourhood.links, region.edges), [neighbourhood, region.edges]);

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
  const group = (items: Neighbour[], className: string) =>
    items.length > 0 && (
      <div className={`mv:flex mv:flex-wrap mv:justify-center mv:gap-3 ${className}`}>{items.map(cell)}</div>
    );
  const { above, below, left, right, around } = neighbourhood.roles;

  return (
    <div
      ref={setContainer}
      className="mv:relative mv:flex mv:w-max mv:min-w-full mv:flex-col mv:items-center mv:gap-16 mv:p-6"
    >
      {group(above, '')}
      <div className="mv:flex mv:items-center mv:gap-24">
        {group(left, 'mv:flex-col')}
        {cell(neighbourhood.focus)}
        {group(right, 'mv:flex-col')}
      </div>
      {group(below, '')}
      {group(around, 'mv:opacity-80')}
      <EdgeOverlay links={links} elements={elements} container={container} routing="straight" />
    </div>
  );
}
