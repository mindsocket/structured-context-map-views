import { SCHEMA_URL } from './schema-url';
/** `$ref` target for a setting whose value comes from a declared parameter. */
export const PARAM_REF = `${SCHEMA_URL}/definition.json#/$defs/paramRef` as const;

/** A setting that takes either a fixed value matching `valueSchema` or a `{ $param }` binding. */
export function parameterisable<const S extends object, const D>(valueSchema: S, defaultValue: D, description: string) {
  return { description, default: defaultValue, anyOf: [valueSchema, { $ref: PARAM_REF }] } as const;
}
