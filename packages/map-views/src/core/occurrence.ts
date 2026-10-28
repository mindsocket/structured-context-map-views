/**
 * One step of an occurrence path: a node title, a `[field, value]` group, or `null` for the
 * ungrouped area. Encoded distinctly, so a field group can't collide with a node of the same name.
 */
export type PathSegment = string | readonly [field: string, value: string | null] | null;

/**
 * Path-based key for one occurrence of a node: region, then the steps from the outermost
 * container down to the node. Unique within a map view even when a node appears several times.
 * Hosts can render several map views at once, so layouts scope keys to the map view instance.
 */
export function occurrenceKey(regionId: string, path: readonly PathSegment[]): string {
  return JSON.stringify([regionId, ...path]);
}
