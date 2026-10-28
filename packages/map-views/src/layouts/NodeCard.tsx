import type { SpaceNode } from 'structured-context/api';
import type { NodesConfig } from '../core';

type Props = {
  node: SpaceNode;
  /** The node's subtree is rendered at another occurrence. */
  repeat: boolean;
  nodes: NodesConfig;
  onSelect?: (node: SpaceNode) => void;
};

/**
 * A clickable node, drawn as a card (title plus selected fields) or a compact shape with a
 * tooltip. Deliberately a `div` with button semantics rather than a `<button>`: hosts style
 * native form controls globally (Obsidian fixes button height and disables wrapping).
 */
export function NodeCard({ node, repeat, nodes, onSelect }: Props) {
  const select = () => onSelect?.(node);
  const label = `${node.resolvedType}: ${node.title}${repeat ? ' (shown in full elsewhere)' : ''}`;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  };
  const border = repeat ? 'mv:border-dashed mv:border-muted/60 mv:opacity-75' : 'mv:border-edge';

  if (nodes.style === 'shape') {
    // 24px: the minimum target size for pointer input (WCAG 2.2 AA). The type's initial is the
    // visible cue; the full type and title are in the tooltip and accessible name.
    return (
      // biome-ignore lint/a11y/useSemanticElements: a native button inherits host button styles.
      <div
        role="button"
        tabIndex={0}
        title={label}
        onClick={select}
        onKeyDown={onKeyDown}
        aria-label={label}
        className={`mv:flex mv:size-6 mv:cursor-pointer mv:items-center mv:justify-center mv:rounded-full mv:border-2 mv:bg-card mv:text-[0.65rem] mv:font-semibold mv:uppercase mv:text-muted mv:hover:border-accent mv:focus-visible:outline-2 mv:focus-visible:outline-accent ${border}`}
      >
        <span aria-hidden="true">{node.resolvedType.charAt(0)}</span>
      </div>
    );
  }

  const fields = nodes.fields
    .map((field) => [field, formatValue(node.schemaData[field])] as const)
    .filter(([, value]) => value !== undefined);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a native button inherits host button styles.
    <div
      role="button"
      tabIndex={0}
      title={label}
      onClick={select}
      onKeyDown={onKeyDown}
      className={`mv:w-44 mv:cursor-pointer mv:rounded-md mv:border mv:bg-card mv:px-2.5 mv:py-1.5 mv:text-left mv:shadow-sm mv:hover:border-accent mv:focus-visible:outline-2 mv:focus-visible:outline-accent ${border}`}
    >
      <span className="mv:block mv:text-[0.65rem] mv:uppercase mv:tracking-wide mv:text-muted">
        {node.resolvedType}
        {repeat && ' · repeat'}
      </span>
      <span className="mv:block mv:text-sm mv:leading-snug">{node.title}</span>
      {fields.length > 0 && (
        <dl className="mv:m-0 mv:mt-1 mv:text-xs mv:text-muted">
          {fields.map(([field, value]) => (
            <div key={field} className="mv:flex mv:gap-1">
              <dt className="mv:shrink-0">{field}:</dt>
              <dd className="mv:m-0 mv:truncate mv:text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function formatValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
