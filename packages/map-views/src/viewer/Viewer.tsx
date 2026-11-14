import { useEffect, useMemo, useRef, useState } from 'react';
import { type SpaceGraph, type SpaceNode, spaceGraphFrom } from 'structured-context/browser';
import { annotationsFrom } from '../core/annotations';
import type { MapViewDefinition, ParameterValues } from '../core/definition';
import type { SpaceSnapshot } from '../core/snapshot';
import { MapView } from '../layouts/MapView';
import { ParameterControls } from '../layouts/ParameterControls';

/**
 * A page-filling viewer for one or more space snapshots: a space and map view switcher, the parameter
 * controls, the map view, and a side panel with the selected node's fields and validation results. Hosts
 * supply the snapshots and anything specific to where the page is shown. See docs/architecture.md.
 */

export type ViewerProps = {
  spaces: SpaceSnapshot[];
  /** Accessible name for each card, for hosts whose surroundings read it. Cards keep their default name without it. */
  cardLabel?: (node: SpaceNode, graph: SpaceGraph, definition: MapViewDefinition) => string;
};

export function Viewer({ spaces, cardLabel }: ViewerProps) {
  const [spaceName, setSpaceName] = useState(spaces[0]!.space);
  const space = spaces.find((s) => s.space === spaceName)!;
  const [viewId, setViewId] = useState(space.definitions[0]?.id);
  const definition = space.definitions.find((d) => d.id === viewId) ?? space.definitions[0];
  const [values, setValues] = useState<ParameterValues>({});
  const [selectedId, setSelectedId] = useState<string>();

  const graph = useMemo(() => spaceGraphFrom(space.graph), [space]);
  const annotated = useMemo(() => annotationsFrom(space.validation, graph), [space, graph]);
  const mapRef = useCardLabels(graph, definition, cardLabel);

  if (!definition) return <p className="viewer-message">No map views apply to the schema of "{space.space}".</p>;
  const selected = selectedId ? graph.nodes.get(selectedId as never) : undefined;
  const results = selected ? (annotated.annotations.get(selected.id as never) ?? []) : [];

  return (
    <div className="viewer-root">
      <header className="viewer-bar">
        {spaces.length > 1 && (
          <select
            aria-label="Space"
            value={spaceName}
            onChange={(e) => {
              const next = spaces.find((s) => s.space === e.target.value)!;
              setSpaceName(next.space);
              setViewId(next.definitions[0]?.id);
              setValues({});
              setSelectedId(undefined);
            }}
          >
            {spaces.map((s) => (
              <option key={s.space} value={s.space}>
                {s.space}
              </option>
            ))}
          </select>
        )}
        {space.definitions.length > 1 && (
          <select
            aria-label="Map view"
            value={definition.id}
            onChange={(e) => {
              setViewId(e.target.value);
              setValues({});
            }}
          >
            {space.definitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
        <ParameterControls
          definition={definition}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </header>
      <div className="viewer-body">
        <div className="viewer-map" ref={mapRef}>
          <MapView
            definition={definition}
            graph={graph}
            values={values}
            annotations={annotated.annotations}
            onNodeSelect={(node) => setSelectedId(node.id)}
          />
        </div>
        {(selected || annotated.unattached.length > 0) && (
          <aside className="viewer-panel" aria-label="Validation results">
            {selected && (
              <section>
                <button
                  type="button"
                  className="viewer-close"
                  aria-label="Close"
                  onClick={() => setSelectedId(undefined)}
                >
                  ×
                </button>
                <p className="viewer-type">{selected.resolvedType}</p>
                <h2>{selected.title}</h2>
                {results.length > 0 && (
                  <>
                    <h3>Validation</h3>
                    <Results items={results} />
                  </>
                )}
                <Fields data={selected.schemaData} />
                {selected.content && (
                  <>
                    <h3>Content</h3>
                    <p className="viewer-content">{selected.content}</p>
                  </>
                )}
                {selected.source && <p className="viewer-muted">{selected.source.file}</p>}
              </section>
            )}
            {annotated.unattached.length > 0 && (
              <section>
                <h3>Not on a node ({annotated.unattached.length})</h3>
                <Results items={annotated.unattached} />
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

const SKIPPED_FIELDS = new Set(['title', 'type', 'content']);
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const asText = (v: unknown): string =>
  Array.isArray(v) ? v.map(asText).join(', ') : v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);

/** The node's fields as a list; the title, type and body are shown elsewhere. */
function Fields({ data }: { data: Record<string, unknown> }) {
  const fields = Object.entries(data).filter(([name, value]) => !SKIPPED_FIELDS.has(name) && !isEmpty(value));
  if (fields.length === 0) return null;
  return (
    <>
      <h3>Fields</h3>
      <dl className="viewer-fields">
        {fields.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{asText(value)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Results({
  items,
}: {
  items: readonly { severity: string; source: string; ruleId?: string; message: string; nodeId?: string }[];
}) {
  return (
    <ul className="viewer-results">
      {items.map((a, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a static list with no stable identity beyond position.
        <li key={i}>
          <span className={`viewer-severity viewer-${a.severity}`}>{a.severity}</span>{' '}
          <span className="viewer-muted">{a.ruleId ? `${a.source} · ${a.ruleId}` : a.source}</span>
          {a.nodeId && <span className="viewer-muted"> · {a.nodeId}</span>}
          <div>{a.message}</div>
        </li>
      ))}
    </ul>
  );
}

/** Names each card with `cardLabel`, again whenever the map view redraws its cards. */
function useCardLabels(
  graph: SpaceGraph,
  definition: MapViewDefinition | undefined,
  cardLabel: ViewerProps['cardLabel'],
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !definition || !cardLabel) return;
    const stamp = () => {
      for (const card of root.querySelectorAll<HTMLElement>('[data-node-id]')) {
        const node = graph.nodes.get(card.dataset.nodeId as never);
        if (node) card.setAttribute('aria-label', cardLabel(node, graph, definition));
      }
    };
    stamp();
    const observer = new MutationObserver(stamp);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [graph, definition, cardLabel]);
  return ref;
}
