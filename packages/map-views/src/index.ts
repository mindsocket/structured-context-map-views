/**
 * The package's public surface. Everything else (layouts, node cards, the edge overlay, the projections)
 * is internal; add an export here when a host needs it.
 */
export {
  MAP_VIEW_SCHEMAS,
  type MapViewDefinition,
  MapViewDefinitionError,
  mapViewsForSchema,
  type ParameterValues,
  parseMapViewDefinition,
  resolveParameterValues,
  selectionFilter,
} from './core';
export { MapView } from './layouts/MapView';
export { ParameterControls } from './layouts/ParameterControls';
