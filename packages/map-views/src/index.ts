/** The package's public surface. Everything else is internal; add an export here when a host needs it. */

export { MapView } from './components/MapView';
export { ParameterControls } from './components/ParameterControls';
export {
  MultiSelectParameterInput,
  ParameterInput,
  SelectParameterInput,
  ToggleParameterInput,
} from './components/ParameterInputs';
export { type ParameterControlState, useParameterControls } from './components/useParameterControls';
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
export { buildTree, type Tree, type TreeOccurrence } from './core/layouts/tree/projection';
