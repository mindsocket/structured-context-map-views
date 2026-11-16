import type { SpaceNode } from 'structured-context/api';
import { type NodeAnnotation, type Severity, worstSeverity } from '../core/annotations';
import type { NodesConfig } from '../core/definition';
import { useAnnotations } from './annotations-context';

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
  const annotations = useAnnotations().get(node.id);
  const label = `${node.resolvedType}: ${node.title}${repeat ? ' (shown in full elsewhere)' : ''}${annotationsLabel(annotations)}`;
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
        data-node-id={node.id}
        onClick={select}
        onKeyDown={onKeyDown}
        aria-label={label}
        className={`mv:relative mv:flex mv:size-6 mv:cursor-pointer mv:items-center mv:justify-center mv:rounded-full mv:border-2 mv:bg-card mv:text-[0.65rem] mv:font-semibold mv:uppercase mv:text-muted mv:hover:border-accent mv:focus-visible:outline-2 mv:focus-visible:outline-accent ${border}`}
      >
        <span aria-hidden="true">{node.resolvedType.charAt(0)}</span>
        <AnnotationBadge annotations={annotations} />
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
      data-node-id={node.id}
      onClick={select}
      onKeyDown={onKeyDown}
      className={`mv:relative mv:w-44 mv:cursor-pointer mv:rounded-md mv:border mv:bg-card mv:px-2.5 mv:py-1.5 mv:text-left mv:shadow-sm mv:hover:border-accent mv:focus-visible:outline-2 mv:focus-visible:outline-accent ${border}`}
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
      <AnnotationBadge annotations={annotations} />
    </div>
  );
}

const BADGE: Record<Severity, string> = {
  error: 'mv:bg-error',
  warning: 'mv:bg-warning',
  info: 'mv:bg-info',
};

/** A count of the node's validation results in the corner, coloured by the most serious. Decorative: the count is in the card's label. */
function AnnotationBadge({ annotations }: { annotations: readonly NodeAnnotation[] | undefined }) {
  const worst = annotations && worstSeverity(annotations);
  if (!annotations || !worst) return null;
  return (
    <span
      aria-hidden="true"
      className={`mv:absolute mv:-top-1.5 mv:-right-1.5 mv:flex mv:h-4 mv:min-w-4 mv:items-center mv:justify-center mv:rounded-full mv:px-1 mv:text-[0.6rem] mv:font-semibold mv:text-white ${BADGE[worst]}`}
    >
      {annotations.length}
    </span>
  );
}

function annotationsLabel(annotations: readonly NodeAnnotation[] | undefined): string {
  const worst = annotations && worstSeverity(annotations);
  if (!annotations || !worst) return '';
  return ` (${annotations.length} validation ${annotations.length === 1 ? 'result' : 'results'}, most serious: ${worst})`;
}

function formatValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
