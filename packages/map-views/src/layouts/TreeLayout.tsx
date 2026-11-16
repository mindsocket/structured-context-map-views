import { useMemo } from 'react';
import type { Orientation, TreeLayoutConfig } from '../core/definition';
import { buildTree, type TreeOccurrence, treeLinks } from '../core/layouts/tree/projection';
import { EdgeOverlay } from './EdgeOverlay';
import { type LayoutProps, overlayLinks, useOccurrenceElements } from './layout';
import { NodeCard } from './NodeCard';

/**
 * Tree over the schema's hierarchy. Flexbox does the branching; the SVG overlay draws connectors.
 */
export function TreeLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<TreeLayoutConfig>) {
  const { orientation, dag } = region.layout;
  const tree = useMemo(() => buildTree(graph, region.id, dag), [graph, region.id, dag]);
  const links = useMemo(() => overlayLinks(treeLinks(tree), region.edges), [tree, region.edges]);

  const { container, setContainer, elements, register } = useOccurrenceElements();

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

  if (!graph.hierarchy) return <p className="mv:p-4 mv:text-muted">This schema has no hierarchy to draw as a tree.</p>;

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
