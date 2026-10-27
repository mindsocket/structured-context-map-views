import { useEffect, useMemo, useState } from 'react';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import { spaceGraphFrom } from 'structured-context/browser';
import { type MapViewDefinition, mapViewsForSchema, type ParameterValues, selectionFilter } from '../map-views/core';
import { MapView, ParameterControls } from '../map-views/layouts';
import type { SpaceResponse } from './space-response';

type SpaceListItem = { name: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as T;
}

type Space = { schemaId: string | undefined; graph: SpaceGraph };

async function fetchSpace(url: string): Promise<Space> {
  const { schemaId, graph } = await fetchJson<SpaceResponse>(url);
  return { schemaId, graph: spaceGraphFrom(graph) };
}

export function App() {
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [definitions, setDefinitions] = useState<MapViewDefinition[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [mapViewName, setMapViewName] = useState<string>('');
  // The whole space, for its schema; then the space as the map view's filter selects it.
  const [data, setData] = useState<Space>();
  const [selection, setSelection] = useState<{ filter: string; data: Space }>();
  const [node, setNode] = useState<SpaceNode>();
  const [error, setError] = useState<string>();
  // Session-only parameter values, per map view.
  const [valuesByView, setValuesByView] = useState<Record<string, ParameterValues>>({});

  useEffect(() => {
    fetchJson<SpaceListItem[]>('/api/spaces').then(setSpaces, (e) => setError(String(e)));
    fetchJson<MapViewDefinition[]>('/api/map-views').then(setDefinitions, (e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setData(undefined);
    setNode(undefined);
    setError(undefined);
    let current = true;
    fetchSpace(`/api/spaces/${encodeURIComponent(selected)}`).then(
      (d) => current && setData(d),
      (e) => current && setError(String(e)),
    );
    return () => {
      current = false;
    };
  }, [selected]);

  const available = useMemo(() => mapViewsForSchema(definitions, data?.schemaId), [definitions, data?.schemaId]);
  const definition = available.find((d) => d.id === mapViewName) ?? available[0];
  const values = definition ? valuesByView[definition.id] : undefined;
  const filter = definition ? selectionFilter(definition, values) : undefined;

  useEffect(() => {
    setSelection(undefined);
    if (!selected || !filter) return;
    let current = true;
    fetchSpace(`/api/spaces/${encodeURIComponent(selected)}?filter=${encodeURIComponent(filter)}`).then(
      (d) => current && setSelection({ filter, data: d }),
      (e) => current && setError(String(e)),
    );
    return () => {
      current = false;
    };
  }, [selected, filter]);
  // Unfiltered data stands in only for map views without a filter, never for a pending selection.
  const shown = filter ? (selection?.filter === filter ? selection.data : undefined) : data;

  const setValue = (name: string, value: unknown) => {
    if (!definition) return;
    setValuesByView((all) => ({ ...all, [definition.id]: { ...all[definition.id], [name]: value } }));
  };

  return (
    <div className="mv:flex mv:h-screen mv:flex-col mv:bg-surface mv:text-ink">
      <header className="mv:flex mv:items-center mv:gap-3 mv:border-b mv:border-edge mv:p-3">
        <h1 className="mv:m-0 mv:text-base mv:font-semibold">Structured Context Navigator</h1>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Space">
          <option value="">Choose a space…</option>
          {spaces.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        {available.length > 0 && (
          <select value={definition?.id} onChange={(e) => setMapViewName(e.target.value)} aria-label="Map view">
            {available.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
        {data && <span className="mv:text-sm mv:text-muted">schema: {data.schemaId ?? 'none'}</span>}
      </header>
      {definition && definition.parameters.length > 0 && (
        <div className="mv:border-b mv:border-edge mv:px-3 mv:py-2">
          <ParameterControls definition={definition} values={values ?? {}} onChange={setValue} />
        </div>
      )}
      {error && <p className="mv:m-0 mv:p-3 mv:text-red-600">{error}</p>}
      {data && !definition && (
        <p className="mv:m-0 mv:p-3 mv:text-muted">No map view applies to this space's schema.</p>
      )}
      <main className="mv:flex mv:min-h-0 mv:flex-1">
        <div className="mv:min-w-0 mv:flex-1">
          {shown && definition && (
            <MapView definition={definition} graph={shown.graph} values={values} onNodeSelect={setNode} />
          )}
        </div>
        {node && (
          <aside className="mv:w-80 mv:overflow-auto mv:border-l mv:border-edge mv:p-3 mv:text-sm">
            <h2 className="mv:m-0 mv:font-semibold">{node.title}</h2>
            <pre className="mv:mt-2 mv:whitespace-pre-wrap mv:text-xs">{JSON.stringify(node.schemaData, null, 2)}</pre>
          </aside>
        )}
      </main>
    </div>
  );
}
