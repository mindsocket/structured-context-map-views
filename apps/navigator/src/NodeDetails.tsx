import type { SpaceNode } from 'structured-context/api';
import type { NodeAnnotation } from 'structured-context-map-views';

/** Validation results as a list: severity, where the check came from, and the message. */
export function AnnotationList({ annotations }: { annotations: readonly NodeAnnotation[] }) {
  return (
    <ul className="results">
      {annotations.map((a) => (
        <li key={`${a.source}:${a.ruleId ?? ''}:${a.message}`}>
          <span className={`severity ${a.severity}`}>{a.severity}</span>{' '}
          <span className="muted">{a.ruleId ? `${a.source} · ${a.ruleId}` : a.source}</span>
          <div>{a.message}</div>
        </li>
      ))}
    </ul>
  );
}

/** A field value as text: lists joined, objects as compact JSON, empty values omitted by the caller. */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

/** The selected node: its type, its fields as a list and, if it has one, the body text. */
export function NodeDetails({
  node,
  annotations,
  onClose,
}: {
  node: SpaceNode;
  /** Validation results for the node, if the host has run validation. */
  annotations?: readonly NodeAnnotation[];
  onClose: () => void;
}) {
  // The title and type are in the heading and the body gets its own section, so none repeats in the list.
  const fields = Object.entries(node.schemaData).filter(
    ([name, value]) => name !== 'title' && name !== 'type' && name !== 'content' && !isEmpty(value),
  );

  return (
    <aside className="details" aria-label="Selected node">
      <div className="details-head">
        <div>
          <p className="details-type">{node.resolvedType}</p>
          <h2>{node.title}</h2>
        </div>
        <button type="button" className="details-close" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </div>
      {fields.length > 0 ? (
        <dl>
          {fields.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted">No fields.</p>
      )}
      {annotations && annotations.length > 0 && (
        <section>
          <h3>Validation</h3>
          <AnnotationList annotations={annotations} />
        </section>
      )}
      {node.content && (
        <section>
          <h3>Content</h3>
          <p className="content">{node.content}</p>
        </section>
      )}
      {node.source && <p className="source muted">{node.source.file}</p>}
    </aside>
  );
}
