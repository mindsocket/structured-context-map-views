import type { spaceGraphFrom } from 'structured-context/browser';
import type { ValidationInput } from './annotations';
import type { MapViewDefinition } from './definition';

/**
 * Everything a host without filesystem access needs to render a space: its graph, the validation
 * results that attach to nodes, and the map view definitions that apply to its schema. Plain JSON.
 */
export type SpaceSnapshot = {
  space: string;
  schemaId: string | undefined;
  graph: Parameters<typeof spaceGraphFrom>[0];
  /** What `annotationsFrom` attaches */
  validation: ValidationInput;
  definitions: MapViewDefinition[];
};
