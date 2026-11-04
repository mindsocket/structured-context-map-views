import type { UnattachedAnnotation } from 'structured-context-map-views';
import { AnnotationList } from './NodeDetails';

/**
 * Validation results with no node on the map: global rules, and nodes that failed their schema
 * (those aren't in the graph). Grouped by node id, or under "Space" when the result has none.
 */
export function UnattachedAnnotationPanel({
  unattached,
  onClose,
}: {
  unattached: readonly UnattachedAnnotation[];
  onClose: () => void;
}) {
  const groups = Map.groupBy(unattached, (u) => u.nodeId ?? '');
  return (
    <aside className="details" aria-label="Validation results not on a node">
      <div className="details-head">
        <h2>Not on a node</h2>
        <button type="button" className="details-close" onClick={onClose} aria-label="Close validation results">
          ×
        </button>
      </div>
      {[...groups].map(([nodeId, items]) => (
        <section key={nodeId}>
          <h3>{nodeId || 'Space'}</h3>
          {items[0]?.location && (
            <p className="source muted">
              {items[0].location.file}
              {items[0].location.line !== undefined && `:${items[0].location.line}`}
            </p>
          )}
          <AnnotationList annotations={items} />
        </section>
      ))}
    </aside>
  );
}
