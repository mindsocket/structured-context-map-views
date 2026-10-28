import { useCallback, useMemo, useRef, useState } from 'react';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import {
  buildTree,
  type LayoutConfig,
  type Orientation,
  type Region,
  type TreeLayoutConfig,
  type TreeOccurrence,
  treeLinks,
} from '../core';
import { EdgeOverlay } from './EdgeOverlay';
import { NodeCard } from './NodeCard';

export type LayoutProps<L extends LayoutConfig = LayoutConfig> = {
  graph: SpaceGraph;
  /** The region with parameter values applied, narrowed to the layout's own settings. */
  region: Region & { layout: L };
  /** Scopes occurrence ids when several map views render in one document. */
  instanceId: string;
  onNodeSelect?: (node: SpaceNode) => void;
};

/**
 * Tree over the schema's hierarchy. Flexbox does the branching; the SVG overlay draws connectors.
 */
export function TreeLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<TreeLayoutConfig>) {
  const { orientation, dag } = region.layout;
  const tree = useMemo(() => buildTree(graph, region.id, dag), [graph, region.id, dag]);
  const links = useMemo(() => (region.edges.show ? treeLinks(tree) : []), [tree, region.edges.show]);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // Filled by ref callbacks during commit, read by the overlay's layout effect afterwards.
  const elements = useRef(new Map<string, HTMLElement>()).current;
  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.set(key, el);
      else elements.delete(key);
    },
    [elements],
  );

  const branch = (occurrence: TreeOccurrence) => (
    <li
      key={occurrence.key}
      className={`mv:flex mv:items-center ${orientation === 'vertical' ? 'mv:flex-col' : 'mv:flex-row'}`}
    >
      <div ref={register(occurrence.key)} data-occurrence={`${instanceId}${occurrence.key}`}>
        <NodeCard
          node={occurrence.node}
          repeat={occurrence.repeatOf !== undefined}
          nodes={region.nodes}
          onSelect={onNodeSelect}
        />
      </div>
      {occurrence.children.length > 0 && (
        <Branches orientation={orientation} nested>
          {occurrence.children.map(branch)}
        </Branches>
      )}
    </li>
  );

  return (
    <div ref={setContainer} className="mv:relative mv:w-max mv:min-w-full mv:p-4">
      <Branches orientation={orientation}>{[...tree.roots, ...tree.orphans].map(branch)}</Branches>
      <EdgeOverlay links={links} elements={elements} container={container} routing={orientation} />
    </div>
  );
}

function Branches({
  orientation,
  nested = false,
  children,
}: {
  orientation: Orientation;
  nested?: boolean;
  children: React.ReactNode;
}) {
  // Siblings run across the main axis; nested branches leave a gap for connectors.
  const layout =
    orientation === 'vertical'
      ? `mv:flex-row mv:items-start mv:justify-center mv:gap-3 ${nested ? 'mv:pt-10' : ''}`
      : `mv:flex-col mv:items-start mv:justify-center mv:gap-2 ${nested ? 'mv:pl-14' : ''}`;
  return <ul className={`mv:m-0 mv:flex mv:list-none mv:p-0 ${layout}`}>{children}</ul>;
}
