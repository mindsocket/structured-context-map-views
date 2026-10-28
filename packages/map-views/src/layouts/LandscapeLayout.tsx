import { useMemo } from 'react';
import type { SpaceNode } from 'structured-context/api';
import { buildLandscape, type LandscapeLayoutConfig, type LandscapeOccurrence, type Orientation } from '../core';
import { NodeCard } from './NodeCard';
import type { LayoutProps } from './TreeLayout';

/**
 * Nested containers following the layout's grouping levels; the last level is drawn as nodes.
 * Flexbox does the nesting and wrapping. Containment shows the grouping edges, so no connectors
 * are drawn. PROTOTYPE: `edges.show` has no effect here; other edges aren't drawn yet.
 */
export function LandscapeLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<LandscapeLayoutConfig>) {
  const { layout } = region;
  const landscape = useMemo(() => buildLandscape(graph, region.id, layout), [graph, region.id, layout]);
  const last = layout.group.length - 1;

  const breadcrumb = (occurrence: LandscapeOccurrence) => {
    const level = layout.group[occurrence.level];
    if (!level || !('type' in level) || level.intermediate !== 'breadcrumb') return null;
    const steps = occurrence.via.filter((step) => step.nodes.length > 0);
    if (steps.length === 0) return null;
    return (
      <span className="mv:block mv:max-w-44 mv:text-[0.65rem] mv:leading-tight mv:text-muted">
        via {steps.map((step) => step.nodes.map((n) => n.title).join(', ')).join(' › ')}
      </span>
    );
  };

  const render = (occurrence: LandscapeOccurrence, direction: Orientation): React.ReactNode => {
    const repeat = occurrence.repeatOf !== undefined;
    const marker = { 'data-occurrence': `${instanceId}${occurrence.key}` };

    if (occurrence.item.kind === 'node' && occurrence.level === last) {
      return (
        <li key={occurrence.key} {...marker} className="mv:flex mv:flex-col mv:gap-0.5">
          <NodeCard node={occurrence.item.node} repeat={repeat} nodes={region.nodes} onSelect={onNodeSelect} />
          {breadcrumb(occurrence)}
        </li>
      );
    }

    // Containers alternate direction with depth; a container of nodes wraps them.
    const inner: Orientation = direction === 'horizontal' ? 'vertical' : 'horizontal';
    const holdsNodes = occurrence.level + 1 === last;
    return (
      <li
        key={occurrence.key}
        {...marker}
        className={`mv:flex mv:flex-col mv:gap-2 mv:rounded-lg mv:border mv:bg-surface mv:p-2 ${repeat ? 'mv:border-dashed mv:border-muted/60' : 'mv:border-edge'}`}
      >
        {occurrence.item.kind === 'node' ? (
          <ContainerHeading node={occurrence.item.node} repeat={repeat} onSelect={onNodeSelect}>
            {breadcrumb(occurrence)}
          </ContainerHeading>
        ) : (
          <span className="mv:text-xs mv:font-semibold mv:text-muted">
            {occurrence.item.field}: {occurrence.item.value === null ? '(none)' : displayValue(occurrence.item.value)}
          </span>
        )}
        <Items direction={holdsNodes ? 'wrap' : inner}>
          {occurrence.children.map((child) => render(child, inner))}
        </Items>
      </li>
    );
  };

  const top = layout.orientation;
  return (
    <div className="mv:w-max mv:min-w-full mv:p-4">
      <Items direction={last === 0 ? 'wrap' : top}>
        {landscape.groups.map((group) => render(group, top))}
        {landscape.ungrouped.length > 0 && (
          <li className="mv:flex mv:flex-col mv:gap-2 mv:rounded-lg mv:border mv:border-dashed mv:border-edge mv:p-2">
            <span className="mv:text-xs mv:font-semibold mv:text-muted">Ungrouped</span>
            <Items direction="wrap">{landscape.ungrouped.map((o) => render(o, top))}</Items>
          </li>
        )}
      </Items>
    </div>
  );
}

function Items({ direction, children }: { direction: Orientation | 'wrap'; children: React.ReactNode }) {
  const layout = {
    horizontal: 'mv:flex-row mv:items-start mv:gap-3',
    vertical: 'mv:flex-col mv:items-stretch mv:gap-2',
    wrap: 'mv:max-w-[36rem] mv:flex-row mv:flex-wrap mv:items-start mv:gap-2',
  }[direction];
  return <ul className={`mv:m-0 mv:flex mv:list-none mv:p-0 ${layout}`}>{children}</ul>;
}

/** A container's node: type and title, selectable like a card. */
function ContainerHeading({
  node,
  repeat,
  onSelect,
  children,
}: {
  node: SpaceNode;
  repeat: boolean;
  onSelect?: (node: SpaceNode) => void;
  children?: React.ReactNode;
}) {
  const select = () => onSelect?.(node);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a native button inherits host button styles.
    <div
      role="button"
      tabIndex={0}
      title={`${node.resolvedType}: ${node.title}${repeat ? ' (also shown elsewhere)' : ''}`}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      }}
      className="mv:cursor-pointer mv:rounded mv:px-1 mv:hover:text-accent mv:focus-visible:outline-2 mv:focus-visible:outline-accent"
    >
      <span className="mv:block mv:text-[0.65rem] mv:uppercase mv:tracking-wide mv:text-muted">
        {node.resolvedType}
        {repeat && ' · repeat'}
      </span>
      <span className="mv:block mv:text-sm mv:font-semibold mv:leading-snug">{node.title}</span>
      {children}
    </div>
  );
}

/** Field values that are wikilinks show as the linked title. */
function displayValue(value: string): string {
  return value.replace(/^\[\[([^\]|]+)(\|[^\]]*)?\]\]$/, '$1');
}
