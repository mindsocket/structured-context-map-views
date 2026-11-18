import { useMemo } from 'react';
import type { SpaceNode } from 'structured-context/api';
import type { LayoutConfig, Orientation } from '../core/definition';
import { buildLandscape, type LandscapeGroup, type LandscapeOccurrence } from '../core/layouts/landscape/projection';
import type { LayoutProps } from './layout';
import { NodeComponent } from './NodeComponent';

type Level = LayoutConfig<'landscape'>['strips'][number]['group'][number];

/**
 * Strips of nested containers following each strip's grouping levels; the last level is drawn as
 * nodes. Flexbox does the nesting and wrapping, and CSS grid lays out strips divided into cells.
 * Containment shows the grouping edges, so no connectors are drawn. PROTOTYPE: `edges.show` has no
 * effect here; other edges aren't drawn yet.
 */
export function LandscapeLayout({ graph, region, instanceId, onNodeSelect }: LayoutProps<LayoutConfig<'landscape'>>) {
  const { layout } = region;
  const landscape = useMemo(() => buildLandscape(graph, region.id, layout), [graph, region.id, layout]);

  const breadcrumb = (occurrence: LandscapeOccurrence, levels: readonly Level[]) => {
    const level = levels[occurrence.level];
    if (!level || !('type' in level) || level.intermediate !== 'breadcrumb') return null;
    const steps = occurrence.via.filter((step) => step.nodes.length > 0);
    if (steps.length === 0) return null;
    return (
      <span className="mv:block mv:max-w-44 mv:text-[0.65rem] mv:leading-tight mv:text-muted">
        via {steps.map((step) => step.nodes.map((n) => n.title).join(', ')).join(' › ')}
      </span>
    );
  };

  /** The label of a container or a dimension's group: its node, or its field value. */
  const heading = (occurrence: LandscapeGroup | LandscapeOccurrence, levels: readonly Level[] = []) =>
    occurrence.item.kind === 'node' ? (
      <ContainerHeading
        node={occurrence.item.node}
        repeat={'repeatOf' in occurrence && occurrence.repeatOf !== undefined}
        onSelect={onNodeSelect}
      >
        {'level' in occurrence && breadcrumb(occurrence, levels)}
      </ContainerHeading>
    ) : (
      <span className="mv:text-xs mv:font-semibold mv:text-muted">
        {occurrence.item.field}: {occurrence.item.value === null ? '(none)' : displayValue(occurrence.item.value)}
      </span>
    );

  const render = (
    occurrence: LandscapeOccurrence,
    direction: Orientation,
    levels: readonly Level[],
  ): React.ReactNode => {
    const repeat = occurrence.repeatOf !== undefined;
    const marker = { 'data-occurrence': `${instanceId}${occurrence.key}` };
    // A level is drawn as nodes when it is the strip's last.
    const isLeaf = (level: number) => level === levels.length - 1;

    if (occurrence.item.kind === 'node' && isLeaf(occurrence.level)) {
      return (
        <li key={occurrence.key} {...marker} className="mv:flex mv:flex-col mv:gap-0.5">
          <NodeComponent node={occurrence.item.node} repeat={repeat} nodes={region.nodes} onSelect={onNodeSelect} />
          {breadcrumb(occurrence, levels)}
        </li>
      );
    }

    // Containers alternate direction with depth; a container of nodes wraps them.
    const inner: Orientation = direction === 'horizontal' ? 'vertical' : 'horizontal';
    const holdsNodes = isLeaf(occurrence.level + 1);
    return (
      <li
        key={occurrence.key}
        {...marker}
        className={`mv:flex mv:flex-col mv:gap-2 mv:rounded-lg mv:border mv:bg-surface mv:p-2 ${repeat ? 'mv:border-dashed mv:border-muted/60' : 'mv:border-edge'}`}
      >
        {heading(occurrence, levels)}
        <Items direction={holdsNodes ? 'wrap' : inner}>
          {occurrence.children.map((child) => render(child, inner, levels))}
        </Items>
      </li>
    );
  };

  const top = layout.orientation;
  const ungroupedClass = 'mv:flex mv:flex-col mv:gap-2 mv:rounded-lg mv:border mv:border-dashed mv:border-edge mv:p-2';
  const ungroupedItems = (ungrouped: LandscapeOccurrence[], levels: readonly Level[]) => (
    <>
      <span className="mv:text-xs mv:font-semibold mv:text-muted">Ungrouped</span>
      <Items direction="wrap">{ungrouped.map((o) => render(o, top, levels))}</Items>
    </>
  );

  const [only] = landscape.strips;
  // One strip with no dimension of either kind is plain nested containers, with no grid.
  const plain = only && landscape.strips.length === 1 && !landscape.dimension && !only.dimension;
  if (!plain) {
    const anyOwn = landscape.strips.some((strip) => strip.dimension);
    // A strip takes a position for each group of its own dimension (one without), and one for its ungrouped nodes.
    const sizes = landscape.strips.map(
      (strip) => (strip.dimension?.length ?? 1) + (strip.ungrouped.length > 0 ? 1 : 0),
    );
    const starts = sizes.map(
      (_, s) => 1 + (landscape.dimension ? 1 : 0) + sizes.slice(0, s).reduce((a, b) => a + b, 0),
    );
    const place = gridPlacement(top, {
      lead: anyOwn ? 2 : 1,
      dimensionSize: landscape.dimension?.length ?? 1,
      leadStrips: landscape.dimension ? 1 : 0,
      strips: sizes.reduce((a, b) => a + b, 0),
    });
    return (
      <div className="mv:w-max mv:min-w-full mv:p-4">
        <div data-grid className="mv:grid mv:gap-2" style={place.container}>
          {landscape.dimension?.map((group, i) => (
            <div
              key={group.key}
              data-dimension="layout"
              {...{ 'data-occurrence': `${instanceId}${group.key}` }}
              className="mv:self-center mv:px-1"
              style={place.heading(i)}
            >
              {heading(group)}
            </div>
          ))}
          {landscape.strips.map((strip, s) => {
            const levels = layout.strips[s]!.group;
            const start = starts[s]!;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: strips are positional, fixed by the definition.
              <div key={s} className="mv:contents" data-strip={s}>
                <div
                  data-strip-name
                  className="mv:self-center mv:px-1 mv:text-xs mv:font-semibold mv:uppercase mv:tracking-wide mv:text-muted"
                  style={place.name(start, Math.max(sizes[s]!, 1))}
                >
                  {levelLabel(levels[0]!)}
                </div>
                {strip.dimension?.map((group, j) => (
                  <div
                    key={group.key}
                    data-dimension="strip"
                    {...{ 'data-occurrence': `${instanceId}${group.key}` }}
                    className="mv:self-center mv:px-1"
                    style={place.stripHeading(start + j)}
                  >
                    {heading(group)}
                  </div>
                ))}
                {strip.cells.map((cell) => (
                  <div
                    key={cell.key}
                    data-cell
                    data-strip-cell={s}
                    className="mv:min-h-12 mv:rounded-lg mv:border mv:border-edge mv:bg-surface mv:p-2"
                    style={place.cell(cell.at[0], start + cell.at[1])}
                  >
                    <Items direction="vertical">{cell.children.map((child) => render(child, top, levels))}</Items>
                  </div>
                ))}
                {strip.ungrouped.length > 0 && (
                  <div
                    data-ungrouped
                    className={ungroupedClass}
                    style={place.ungrouped(start + (strip.dimension?.length ?? 1))}
                  >
                    {ungroupedItems(strip.ungrouped, levels)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const levels = layout.strips[0]!.group;
  return (
    <div className="mv:w-max mv:min-w-full mv:p-4">
      <Items direction={levels.length === 1 ? 'wrap' : top}>
        {only.cells[0]!.children.map((group) => render(group, top, levels))}
        {only.ungrouped.length > 0 && <li className={ungroupedClass}>{ungroupedItems(only.ungrouped, levels)}</li>}
      </Items>
    </div>
  );
}

const levelLabel = (level: Level) => ('type' in level ? level.type : level.field);

/**
 * Where the grid's labels, headings and cells go. The only place that decides which way the layout
 * dimension runs: with `horizontal` its groups sit side by side, like top-level containers elsewhere
 * in this layout, and strips stack; with `vertical` its groups stack and strips sit side by side.
 * Along the layout dimension's axis, the leading positions hold the strip names and, if any strip
 * has its own dimension, that dimension's headings. Along the strips' axis, the first holds the
 * layout dimension's headings.
 * PROTOTYPE: track sizes are fixed guesses, headings scroll away with the grid, and a grid has no
 * connectors or highlights.
 */
function gridPlacement(
  orientation: Orientation,
  shape: { lead: number; dimensionSize: number; leadStrips: number; strips: number },
) {
  const dimensionAcross = orientation === 'horizontal';
  /** A start line, and how many lines it spans. */
  const lines = (start: number, span = 1) => (span === 1 ? start : `${start} / span ${span}`);
  /** `onDimension` runs along the layout dimension's axis, `onStrips` along the strips'. */
  const at = (onDimension: number, onStrips: number, dimensionSpan = 1, stripsSpan = 1) =>
    dimensionAcross
      ? { gridColumn: lines(onDimension, dimensionSpan), gridRow: lines(onStrips, stripsSpan) }
      : { gridColumn: lines(onStrips, stripsSpan), gridRow: lines(onDimension, dimensionSpan) };
  const groupsStart = shape.lead + 1;
  return {
    // Only the columns are given tracks; the rows size to their content.
    container: {
      gridTemplateColumns: dimensionAcross
        ? `${'max-content '.repeat(shape.lead)}repeat(${shape.dimensionSize}, minmax(9rem, 1fr))`
        : `${'max-content '.repeat(shape.leadStrips)}repeat(${shape.strips}, minmax(9rem, 1fr))`,
    },
    heading: (index: number) => at(groupsStart + index, 1),
    name: (start: number, span: number) => at(1, start, 1, span),
    stripHeading: (line: number) => at(2, line),
    cell: (index: number, line: number) => at(groupsStart + index, line),
    ungrouped: (line: number) => at(groupsStart, line, shape.dimensionSize),
  };
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
