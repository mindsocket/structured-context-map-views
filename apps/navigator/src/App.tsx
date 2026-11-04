import { useEffect, useMemo, useState } from 'react';
import type { SpaceNode } from 'structured-context/api';
import {
  annotationsFrom,
  MapView,
  type MapViewDefinition,
  mapViewsForSchema,
  ParameterControls,
  selectionFilter,
  viewValidationLevel,
} from 'structured-context-map-views';
import { fetchJson, fetchSpace, fetchValidation, spaceUrl, validationUrl } from './api';
import { NodeDetails } from './NodeDetails';
import { UnattachedAnnotationPanel } from './UnattachedAnnotationPanel';
import { useFetched } from './useFetched';
import { useUrlState } from './useUrlState';

type SpaceListItem = { name: string };

export function App() {
  const { spaceName, mapViewId, values, setSpaceName, setMapViewId, setValue } = useUrlState();
  const [selectedNode, setSelectedNode] = useState<SpaceNode>();
  const [unattachedPanelOpen, setUnattachedPanelOpen] = useState(false);

  const spaceList = useFetched('/api/spaces', fetchJson<SpaceListItem[]>);
  const allDefinitions = useFetched('/api/map-views', fetchJson<MapViewDefinition[]>);
  // The whole space, unfiltered: gives the schema (to pick map views) and the nodes validation results attach to.
  const fullSpace = useFetched(spaceName ? spaceUrl(spaceName) : undefined, fetchSpace);

  const applicableDefinitions = useMemo(
    () => mapViewsForSchema(allDefinitions.data ?? [], fullSpace.data?.schemaId),
    [allDefinitions.data, fullSpace.data?.schemaId],
  );
  const activeDefinition = applicableDefinitions.find((d) => d.id === mapViewId) ?? applicableDefinitions[0];
  // Settle on the map view actually drawn, so the URL names it and a stale or missing `view` is replaced.
  useEffect(() => {
    if (activeDefinition && activeDefinition.id !== mapViewId) setMapViewId(activeDefinition.id);
  }, [activeDefinition, mapViewId, setMapViewId]);

  // The map view may select a subset of the space; that subset is what the map draws.
  const selectionExpression = activeDefinition ? selectionFilter(activeDefinition, values) : undefined;
  const filteredSpace = useFetched(
    spaceName && selectionExpression ? spaceUrl(spaceName, selectionExpression) : undefined,
    fetchSpace,
  );
  // The unfiltered space stands in only for map views without a selection, never for a pending one.
  const mapSpace = selectionExpression ? filteredSpace.data : fullSpace.data;

  // Validation runs only when the map view asks to show its results.
  const validationLevel = activeDefinition ? viewValidationLevel(activeDefinition, values) : 'off';
  const validationResults = useFetched(
    spaceName && validationLevel !== 'off' ? validationUrl(spaceName) : undefined,
    fetchValidation,
  );
  // Attached against the full space, so a selection that leaves nodes out doesn't make their results look unattached.
  const { annotations, unattached } = useMemo(
    () =>
      fullSpace.data && validationResults.data
        ? annotationsFrom(validationResults.data, fullSpace.data.graph)
        : { annotations: undefined, unattached: [] },
    [fullSpace.data, validationResults.data],
  );

  const isLoading =
    spaceList.loading ||
    allDefinitions.loading ||
    fullSpace.loading ||
    (selectionExpression !== undefined && filteredSpace.loading) ||
    validationResults.loading;
  const error =
    spaceList.error ?? allDefinitions.error ?? fullSpace.error ?? filteredSpace.error ?? validationResults.error;

  const chooseSpace = (name: string) => {
    setSelectedNode(undefined);
    setSpaceName(name);
  };

  return (
    <div className="app">
      <header className="bar">
        <h1>Structured Context Navigator</h1>
        <select value={spaceName} onChange={(e) => chooseSpace(e.target.value)} aria-label="Space">
          <option value="">Choose a space…</option>
          {spaceList.data?.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        {applicableDefinitions.length > 0 && (
          <select value={activeDefinition?.id} onChange={(e) => setMapViewId(e.target.value)} aria-label="Map view">
            {applicableDefinitions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
        {fullSpace.data && <span className="muted">schema: {fullSpace.data.schemaId ?? 'none'}</span>}
        {unattached.length > 0 && (
          <button type="button" className="link" onClick={() => setUnattachedPanelOpen((open) => !open)}>
            {unattached.length} validation {unattached.length === 1 ? 'result isn’t' : 'results aren’t'} on a node
          </button>
        )}
        {isLoading && <span className="muted">Loading…</span>}
      </header>
      {activeDefinition && activeDefinition.parameters.length > 0 && (
        <div className="params">
          <ParameterControls definition={activeDefinition} values={values} onChange={setValue} />
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {fullSpace.data && !activeDefinition && (
        <p className="notice muted">No map view applies to this space's schema.</p>
      )}
      {!spaceName && !spaceList.loading && !error && (
        <p className="notice muted">Choose a space to see its map views.</p>
      )}
      <main>
        <div className="map">
          {mapSpace && activeDefinition && (
            <MapView
              definition={activeDefinition}
              graph={mapSpace.graph}
              values={values}
              annotations={annotations}
              onNodeSelect={setSelectedNode}
            />
          )}
        </div>
        {unattachedPanelOpen && unattached.length > 0 ? (
          <UnattachedAnnotationPanel unattached={unattached} onClose={() => setUnattachedPanelOpen(false)} />
        ) : (
          selectedNode && (
            <NodeDetails
              node={selectedNode}
              annotations={annotations?.get(selectedNode.id)}
              onClose={() => setSelectedNode(undefined)}
            />
          )
        )}
      </main>
    </div>
  );
}
