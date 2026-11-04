import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { spaceGraphFrom } from 'structured-context/browser';
import { annotationsFrom } from '../core/annotations';
import type { MapViewDefinition, ParameterValues } from '../core/definition';
import { MapView } from '../layouts/MapView';
import { ParameterControls } from '../layouts/ParameterControls';
import { type LoadedSpace, loadSpaces } from './load';

/**
 * The host for a Claude artifact: renders the spaces the publishing agent wrote to the artifact's
 * db (the `export` command's document, one per space) with the parameter controls and a panel of
 * validation messages. It reads nothing else and ships as `dist/artifact.js`; `dist/artifact.html`
 * is the page that loads it. See docs/architecture.md.
 */

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; spaces: LoadedSpace[] };

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    loadSpaces().then(
      (spaces) => setState({ status: 'ready', spaces }),
      (err) => setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    );
  }, []);
  if (state.status === 'loading') return <p className="art-message">Loading from the artifact database…</p>;
  if (state.status === 'error') return <p className="art-message">{state.message}</p>;
  return <Viewer spaces={state.spaces} />;
}

function Viewer({ spaces }: { spaces: LoadedSpace[] }) {
  const [spaceName, setSpaceName] = useState(spaces[0]!.name);
  const space = spaces.find((s) => s.name === spaceName)!;
  const [viewId, setViewId] = useState(space.definitions[0]?.id);
  const definition = space.definitions.find((d) => d.id === viewId) ?? space.definitions[0];
  const [values, setValues] = useState<ParameterValues>({});
  const [selected, setSelected] = useState<{ id: string; title: string; type: string }>();

  const graph = useMemo(() => spaceGraphFrom(space.graph), [space]);
  const annotated = useMemo(() => annotationsFrom(space.validation, graph), [space, graph]);
  const mapRef = useNodeLabels(graph, definition);

  if (!definition) return <p className="art-message">No map views apply to the schema of "{space.name}".</p>;
  const results = selected ? (annotated.annotations.get(selected.id as never) ?? []) : [];

  return (
    <div className="art-root">
      <header className="art-bar">
        {spaces.length > 1 && (
          <select
            aria-label="Space"
            value={spaceName}
            onChange={(e) => {
              const next = spaces.find((s) => s.name === e.target.value)!;
              setSpaceName(next.name);
              setViewId(next.definitions[0]?.id);
              setValues({});
              setSelected(undefined);
            }}
          >
            {spaces.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
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
      <div className="art-body">
        <div className="art-map" ref={mapRef}>
          <MapView
            definition={definition}
            graph={graph}
            values={values}
            annotations={annotated.annotations}
            onNodeSelect={(node) => setSelected({ id: node.id, title: node.title, type: node.resolvedType })}
          />
        </div>
        {(selected || annotated.unattached.length > 0) && (
          <aside className="art-panel" aria-label="Validation results">
            {selected && (
              <section>
                <button type="button" className="art-close" aria-label="Close" onClick={() => setSelected(undefined)}>
                  ×
                </button>
                <p className="art-type">{selected.type}</p>
                <h2>{selected.title}</h2>
                {results.length === 0 ? (
                  <p className="art-muted">No validation results.</p>
                ) : (
                  <Results items={results} />
                )}
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

function Results({
  items,
}: {
  items: readonly { severity: string; source: string; ruleId?: string; message: string; nodeId?: string }[];
}) {
  return (
    <ul className="art-results">
      {items.map((a, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a static list with no stable identity beyond position.
        <li key={i}>
          <span className={`art-severity art-${a.severity}`}>{a.severity}</span>{' '}
          <span className="art-muted">{a.ruleId ? `${a.source} · ${a.ruleId}` : a.source}</span>
          {a.nodeId && <span className="art-muted"> · {a.nodeId}</span>}
          <div>{a.message}</div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Names each card for the viewer's comment mode, which reads the location of a comment from the
 * element's accessible name. The name leads with the map view and node id so it survives the
 * viewer's truncation, then gives the type and title: `<view>/<nodeId>: <type> <title>`. An agent
 * reading the comment resolves the id back to the node from the db.
 */
function useNodeLabels(graph: ReturnType<typeof spaceGraphFrom>, definition: MapViewDefinition | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !definition) return;
    const stamp = () => {
      for (const card of root.querySelectorAll<HTMLElement>('[data-node-id]')) {
        const node = graph.nodes.get(card.dataset.nodeId as never);
        if (node) card.setAttribute('aria-label', `${definition.id}/${node.id}: ${node.resolvedType} ${node.title}`);
      }
    };
    stamp();
    const observer = new MutationObserver(stamp);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [graph, definition]);
  return ref;
}

createRoot(document.getElementById('root')!).render(<App />);
