import type { AuthoredLayout } from '../definition';
import { graphLayoutSchema } from './graph/schema';
import { checkLandscapeLayout, landscapeLayoutSchema } from './landscape/schema';
import { neighbourhoodLayoutSchema } from './neighbourhood/schema';
import { treeLayoutSchema } from './tree/schema';
import { checkXYLayout, xyLayoutSchema } from './xy/schema';

/** Every layout's settings schema. The definition format and its types follow from this list. */
export const layoutSchemas = [
  treeLayoutSchema,
  landscapeLayoutSchema,
  xyLayoutSchema,
  neighbourhoodLayoutSchema,
  graphLayoutSchema,
] as const;

/** Rules a layout's schema can't express. A check returns a message for settings that break one. */
export const layoutChecks: { [T in AuthoredLayout['type']]?: (layout: AuthoredLayout<T>) => string | undefined } = {
  landscape: checkLandscapeLayout,
  xy: checkXYLayout,
};
