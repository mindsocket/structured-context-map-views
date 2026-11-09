/**
 * The package's public surface. Everything else (layouts, node cards, the edge overlay, the other projections)
 * is internal; add an export here when a host needs it.
 */
export {
  type AnnotationIndex,
  type AnnotationSource,
  annotationsFrom,
  type NodeAnnotation,
  type Severity,
  type UnattachedAnnotation,
  type ValidationInput,
  worstSeverity,
} from './core/annotations';
export {
  MAP_VIEW_SCHEMAS,
  type MapViewDefinition,
  MapViewDefinitionError,
  mapViewsForSchema,
  type Parameter,
  type ParameterControl,
  type ParameterValues,
  parseMapViewDefinition,
  resolveParameterValues,
  selectionFilter,
  viewValidationLevel,
} from './core/definition';
export { buildTree, type Tree, type TreeOccurrence } from './core/tree';
export { MapView } from './layouts/MapView';
export { ParameterControls } from './layouts/ParameterControls';
export {
  MultiSelectParameterInput,
  ParameterInput,
  SelectParameterInput,
  ToggleParameterInput,
} from './layouts/ParameterInputs';
export { type ParameterControlState, useParameterControls } from './layouts/useParameterControls';
