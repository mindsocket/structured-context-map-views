import type { UnattachedAnnotation } from 'structured-context-map-views';
import { AnnotationList } from './NodeDetails';

/**
 * Validation results with no node on the map: parse issues, global rules, and nodes that aren't in the
 * graph. Grouped by node id, else by file, or under "Space" when the result has neither.
 */
export function UnattachedAnnotationPanel({
  unattached,
  onClose,
}: {
  unattached: readonly UnattachedAnnotation[];
  onClose: () => void;
}) {
  const groups = Map.groupBy(unattached, (u) => u.nodeId ?? u.location?.file ?? '');
  return (
    <aside className="details" aria-label="Validation results not on a node">
      <div className="details-head">
        <h2>Not on a node</h2>
        <button type="button" className="details-close" onClick={onClose} aria-label="Close validation results">
          ×
        </button>
      </div>
      {[...groups].map(([name, items]) => (
        <section key={name}>
          <h3>{name || 'Space'}</h3>
          {items[0]?.location?.line !== undefined && <p className="source muted">line {items[0].location.line}</p>}
          <AnnotationList annotations={items} />
        </section>
      ))}
    </aside>
  );
}
