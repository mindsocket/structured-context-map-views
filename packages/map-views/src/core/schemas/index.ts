import { definitionSchema } from './definition';
import { landscapeLayoutSchema } from './landscape-layout';
import { settingsSchema } from './settings';
import { treeLayoutSchema } from './tree-layout';
import { xyLayoutSchema } from './xy-layout';

export { PARAM_REF } from './param-ref';
export { definitionSchema, landscapeLayoutSchema, settingsSchema, treeLayoutSchema, xyLayoutSchema };

/** The bundled schemas describing the map view definition format. */
export const MAP_VIEW_SCHEMAS = [
  definitionSchema,
  settingsSchema,
  treeLayoutSchema,
  landscapeLayoutSchema,
  xyLayoutSchema,
] as const;
