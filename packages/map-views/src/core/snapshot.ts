import type { spaceGraphFrom } from 'structured-context/browser';
import type { ValidationInput } from './annotations';
import type { MapViewDefinition } from './definition';

/** What a host without filesystem access needs to render a space. Plain JSON. */
export type SpaceSnapshot = {
  space: string;
  schemaId: string | undefined;
  graph: Parameters<typeof spaceGraphFrom>[0];
  /** What `annotationsFrom` attaches */
  validation: ValidationInput;
  definitions: MapViewDefinition[];
};
