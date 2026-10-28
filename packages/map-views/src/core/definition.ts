import Ajv2020, { type AnySchemaObject, type ErrorObject } from 'ajv/dist/2020';
import type { FromSchema } from 'json-schema-to-ts';
import JSON5 from 'json5';
import {
  definitionSchema,
  type landscapeLayoutSchema,
  MAP_VIEW_SCHEMAS,
  type settingsSchema,
  type treeLayoutSchema,
  type xyLayoutSchema,
} from './schemas';
import { SCHEMA_URL } from './schemas/schema-url';

export { MAP_VIEW_SCHEMAS };

type References = {
  references: [
    typeof settingsSchema,
    typeof treeLayoutSchema,
    typeof landscapeLayoutSchema,
    typeof xyLayoutSchema,
    typeof definitionSchema,
  ];
  // Grouping levels dispatch with if/then/else (see the landscape layout schema).
  parseIfThenElseKeywords: true;
};
type ParamRef = { $param: string };
/** Drop `{ $param }` bindings from every setting's type: what remains after resolution. */
type Resolved<T> = T extends ParamRef
  ? never
  : T extends readonly (infer U)[]
    ? Resolved<U>[]
    : T extends object
      ? { [K in keyof T]: Resolved<T[K]> }
      : T;

/** A definition as authored: settings may be `{ $param }` bindings, defaulted properties may be absent. */
export type AuthoredDefinition = FromSchema<
  typeof definitionSchema,
  References & { keepDefaultedPropertiesOptional: true }
>;
type FilledDefinition = FromSchema<typeof definitionSchema, References>;

/** A region with parameters applied and defaults filled in: what layouts receive. */
export type Region = Resolved<FilledDefinition['regions'][number]>;
export type LayoutConfig = Region['layout'];
export type TreeLayoutConfig = Extract<LayoutConfig, { type: 'tree' }>;
export type LandscapeLayoutConfig = Extract<LayoutConfig, { type: 'landscape' }>;
export type XYLayoutConfig = Extract<LayoutConfig, { type: 'xy' }>;
export type AxisConfig = XYLayoutConfig['x'];
export type GroupLevel = LandscapeLayoutConfig['group'][number];
export type IntermediateDisplay = Extract<GroupLevel, { type: string }>['intermediate'];
export type NodesConfig = Region['nodes'];
export type EdgesConfig = Region['edges'];
export type Orientation = TreeLayoutConfig['orientation'];
export type DagMode = TreeLayoutConfig['dag'];
export type NodeStyle = NodesConfig['style'];

/**
 * A validated map view definition. Plain data, so hosts can pass it across a server/browser
 * boundary. Settings in `source` may still be `{ $param }` bindings; {@link resolveRegions}
 * replaces them with parameter values.
 */
export type MapViewDefinition = {
  /** The definition's `$id`. */
  id: string;
  title: string;
  description?: string;
  /** `$id` of the schema whose spaces this map view applies to. */
  schema: string;
  parameters: Parameter[];
  /** The definition as authored. */
  source: AuthoredDefinition;
};

/** A setting the reader can change, with the control generated from its schema. */
export type Parameter = {
  name: string;
  title: string;
  description?: string;
  default: unknown;
  control: ParameterControl;
};

/** Options are JSON primitives, so they can be labelled and compared directly. */
export type ParameterControl =
  | { kind: 'select'; options: readonly Primitive[] }
  | { kind: 'multiselect'; options: readonly Primitive[] }
  | { kind: 'toggle' };

type Primitive = string | number | boolean | null;

export type ParameterValues = Readonly<Record<string, unknown>>;

export class MapViewDefinitionError extends Error {
  constructor(name: string, message: string) {
    super(`Map view "${name}": ${message}`);
    this.name = 'MapViewDefinitionError';
  }
}

const newAjv = (options: { useDefaults?: boolean } = {}) =>
  new Ajv2020({
    allErrors: true,
    discriminator: true,
    ...options,
    schemas: MAP_VIEW_SCHEMAS.map((s) => structuredClone(s) as AnySchemaObject),
  });

/** Validates definitions as authored. */
const ajv = newAjv();
const validateDefinition = ajv.getSchema(definitionSchema.$id)!;
/** Validates resolved definitions, filling in setting defaults from the schemas. */
const fillDefaults = newAjv({ useDefaults: true }).getSchema(definitionSchema.$id)!;

/**
 * Parse a JSON5 map view definition and check it against the bundled schemas. `name` labels
 * error messages (hosts pass where the definition came from).
 *
 * Beyond schema validation: every parameter needs a control derivable from its schema, and
 * every value that control can produce must satisfy the parameter's schema; every `$param`
 * must name a declared parameter; and each parameter's values must be valid wherever it's
 * bound, checked by substituting them and re-validating.
 */
export function parseMapViewDefinition(name: string, text: string): MapViewDefinition {
  const fail = (message: string): never => {
    throw new MapViewDefinitionError(name, message);
  };

  let raw: unknown;
  try {
    raw = JSON5.parse(text);
  } catch (err) {
    return fail(`invalid JSON5: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!validateDefinition(raw)) return fail(formatErrors(validateDefinition.errors, raw));
  const source = raw as AuthoredDefinition;

  // A fresh instance per parse, so compiled parameter schemas aren't cached indefinitely.
  const parameterAjv = newAjv();
  const declared = (source.parameters ?? {}) as Record<string, AnySchemaObject>;
  const parameters = Object.entries(declared).map(([paramName, schema]) =>
    parseParameter(paramName, schema, parameterAjv, (message) => fail(`parameter "${paramName}": ${message}`)),
  );

  for (const bound of paramNames(source.regions)) {
    if (!(bound in declared)) fail(`"$param": "${bound}" is not a declared parameter`);
  }
  checkBindings(source, parameters, fail);

  const regionIds = new Set<string>();
  for (const region of source.regions) {
    if (regionIds.has(region.id)) fail(`duplicate region id "${region.id}"`);
    regionIds.add(region.id);
    // A field level labels the nodes of a later level, so a node level must come last.
    if (region.layout.type === 'landscape' && !('type' in region.layout.group.at(-1)!)) {
      fail(`region "${region.id}": the last grouping level must be a node type, not a field`);
    }
    if (region.layout.type === 'xy') {
      for (const axis of ['x', 'y'] as const) {
        const { domain } = region.layout[axis];
        if (Array.isArray(domain) && !(domain[0]! < domain[1]!)) {
          fail(`region "${region.id}": ${axis} domain must be [min, max] with min < max`);
        }
      }
    }
  }

  return {
    id: source.$id,
    title: source.title ?? source.$id.slice(source.$id.lastIndexOf('/') + 1),
    ...(source.description !== undefined && { description: source.description }),
    schema: source.schema,
    parameters,
    source,
  };
}

/**
 * The value each parameter takes: the given value if its control could produce it, otherwise
 * (missing, or stale saved state) the default. Hosts' controls and rendering both use this.
 */
export function resolveParameterValues(definition: MapViewDefinition, values: ParameterValues = {}): ParameterValues {
  return Object.fromEntries(
    definition.parameters.map((param) => {
      const value = values[param.name];
      const chosen = value !== undefined && isProducible(param.control, value) ? value : param.default;
      return [param.name, structuredClone(chosen)];
    }),
  );
}

/** Apply parameter values to a definition's regions and fill in setting defaults. */
export function resolveRegions(definition: MapViewDefinition, values: ParameterValues = {}): Region[] {
  const resolved = resolveParameterValues(definition, values);
  const filled = substitute(definition.source, (paramName) => resolved[paramName]);
  if (!fillDefaults(filled)) {
    // parseMapViewDefinition checked every producible value, so this means a bug, not bad input.
    throw new MapViewDefinitionError(
      definition.id,
      `resolved definition is invalid: ${formatErrors(fillDefaults.errors, filled)}`,
    );
  }
  return (filled as FilledDefinition).regions as Region[];
}

/**
 * The filter selecting the nodes a map view shows, if any. Hosts apply it when loading the space.
 * PROTOTYPE: filters are evaluated by the host, not per region in the browser, because
 * structured-context's filter evaluator can't yet be bundled for a browser (its only entry point,
 * `structured-context/api`, imports Node built-ins). That's fine while only the first region renders.
 */
export function selectionFilter(definition: MapViewDefinition, values: ParameterValues = {}): string | undefined {
  return resolveRegions(definition, values)[0]?.select?.filter;
}

/** Map view definitions that apply to a space with the given schema. */
export function mapViewsForSchema(
  definitions: readonly MapViewDefinition[],
  schemaId: string | undefined,
): MapViewDefinition[] {
  return schemaId === undefined ? [] : definitions.filter((d) => d.schema === schemaId);
}

/** Resolve `$ref`s relative to the format schemas, so parameters can write `settings.json#/$defs/orientation`. */
function absoluteRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(absoluteRefs);
  if (typeof node !== 'object' || node === null) return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      key === '$ref' && typeof value === 'string' ? new URL(value, `${SCHEMA_URL}/`).href : absoluteRefs(value),
    ]),
  );
}

function parseParameter(
  name: string,
  schema: AnySchemaObject,
  parameterAjv: Ajv2020,
  fail: (message: string) => never,
): Parameter {
  const { title, description, default: defaultValue, ...authored } = schema;
  const valueSchema = absoluteRefs(authored) as AnySchemaObject;
  let validate: (value: unknown) => boolean;
  try {
    validate = parameterAjv.compile(valueSchema);
  } catch (err) {
    return fail(`invalid schema: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!validate(defaultValue)) return fail(`default ${JSON.stringify(defaultValue)} doesn't match its schema`);

  const control = controlFor(valueSchema, fail);
  const invalid = producibleValues(control).filter((value) => !validate(value));
  if (invalid.length > 0) {
    fail(
      `its ${control.kind} control can produce ${invalid.map((v) => JSON.stringify(v)).join(', ')}, which its schema rejects; remove constraints the control can't enforce`,
    );
  }

  return {
    name,
    title: typeof title === 'string' ? title : (titleFromRef(valueSchema) ?? name),
    ...(typeof description === 'string' && { description }),
    default: defaultValue,
    control,
  };
}

/**
 * Values a control can produce, as checked against schemas. For a multi-select that's none,
 * each option alone, and all of them. PROTOTYPE: other subsets are assumed valid if these are,
 * which holds for the constraints in use (enum items, uniqueItems) but not, say, `contains`.
 */
function producibleValues(control: ParameterControl): unknown[] {
  switch (control.kind) {
    case 'toggle':
      return [true, false];
    case 'select':
      return [...control.options];
    case 'multiselect':
      return [[], ...control.options.map((option) => [option]), [...control.options]];
  }
}

/**
 * Every `$param` binding must accept each value the parameter's control can produce.
 * PROTOTYPE: parameters are checked one at a time, with the others at their defaults, which
 * assumes their bindings don't constrain each other.
 */
function checkBindings(source: AuthoredDefinition, parameters: Parameter[], fail: (message: string) => never) {
  const defaults = new Map(parameters.map((p) => [p.name, p.default]));
  for (const param of parameters) {
    for (const candidate of producibleValues(param.control)) {
      const substituted = substitute(source, (n) => (n === param.name ? candidate : defaults.get(n)));
      if (!validateDefinition(substituted)) {
        fail(
          `parameter "${param.name}" value ${JSON.stringify(candidate)} isn't valid where it's used: ${formatErrors(validateDefinition.errors, substituted)}`,
        );
      }
    }
  }
}

/**
 * Derive a control from a parameter's value schema: `enum` (directly, via `$ref`, or narrowed
 * with `allOf`) gives a select, an array of such items a multi-select, `boolean` a toggle.
 */
function controlFor(schema: AnySchemaObject, fail: (message: string) => never): ParameterControl {
  if (typeOf(schema) === 'boolean') return { kind: 'toggle' };
  const isArray = typeOf(schema) === 'array';
  const options = isArray ? intersect(itemSchemas(schema).map(enumOf)) : enumOf(schema);
  if (!options) {
    return fail(
      'no control can be generated: give it enum options (directly, or via $ref/allOf), array items with enum options, or type boolean',
    );
  }
  if (options.length === 0) return fail('its options narrow to nothing');
  if (!options.every(isPrimitive)) return fail('options must be strings, numbers, booleans or null');
  return { kind: isArray ? 'multiselect' : 'select', options };
}

/** Schemas linked from this one through `$ref` and `allOf`. */
function linked(schema: AnySchemaObject): AnySchemaObject[] {
  const ref = typeof schema.$ref === 'string' ? ajv.getSchema(schema.$ref)?.schema : undefined;
  return [...(typeof ref === 'object' ? [ref] : []), ...((schema.allOf as AnySchemaObject[] | undefined) ?? [])];
}

/** Allowed values, intersecting `enum`/`const` with those reached through `$ref` and `allOf`. */
function enumOf(schema: AnySchemaObject): unknown[] | undefined {
  return intersect([
    Array.isArray(schema.enum) ? schema.enum : undefined,
    'const' in schema ? [schema.const] : undefined,
    ...linked(schema).map(enumOf),
  ]);
}

function typeOf(schema: AnySchemaObject): unknown {
  if (schema.type !== undefined) return schema.type;
  return linked(schema)
    .map(typeOf)
    .find((type) => type !== undefined);
}

/** Every `items` schema applying to an array, so their constraints can be intersected. */
function itemSchemas(schema: AnySchemaObject): AnySchemaObject[] {
  return [...(typeof schema.items === 'object' ? [schema.items] : []), ...linked(schema).flatMap(itemSchemas)];
}

function intersect(sets: (unknown[] | undefined)[]): unknown[] | undefined {
  const defined = sets.filter((set): set is unknown[] => set !== undefined);
  if (defined.length === 0) return undefined;
  const key = (v: unknown) => JSON.stringify(v);
  return defined.reduce((acc, set) => acc.filter((v) => set.some((w) => key(w) === key(v))));
}

function titleFromRef(schema: AnySchemaObject): string | undefined {
  const title = linked(schema)[0]?.title;
  return typeof title === 'string' ? title : undefined;
}

function isPrimitive(value: unknown): value is Primitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isProducible(control: ParameterControl, value: unknown): boolean {
  switch (control.kind) {
    case 'toggle':
      return typeof value === 'boolean';
    case 'select':
      return control.options.includes(value as Primitive);
    case 'multiselect':
      return Array.isArray(value) && value.every((v) => control.options.includes(v));
  }
}

function isParamRef(value: unknown): value is ParamRef {
  return typeof value === 'object' && value !== null && typeof (value as { $param?: unknown }).$param === 'string';
}

/** Copy a JSON value, replacing each `{ $param }` binding with its value. */
function substitute(value: unknown, valueFor: (paramName: string) => unknown): unknown {
  if (isParamRef(value)) return structuredClone(valueFor(value.$param));
  if (Array.isArray(value)) return value.map((v) => substitute(v, valueFor));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, valueFor)]));
  }
  return value;
}

function paramNames(value: unknown): string[] {
  if (isParamRef(value)) return [value.$param];
  if (Array.isArray(value)) return value.flatMap(paramNames);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(paramNames);
  return [];
}

/**
 * Readable Ajv errors. A setting accepts a value or a `{ $param }` binding (`anyOf`), so a bad
 * value also fails the binding branch; those errors, and the bare anyOf summary, are dropped
 * unless the value actually is a binding. An `if` failure only repeats its branch's errors.
 */
function formatErrors(errors: ErrorObject[] | null | undefined, instance: unknown): string {
  const relevant = (errors ?? []).filter(
    (e) =>
      e.keyword !== 'anyOf' &&
      e.keyword !== 'if' &&
      !(e.schemaPath.includes('/$defs/paramRef') && !isParamRef(at(instance, e.instancePath))),
  );
  return relevant.map((e) => `${e.instancePath || '/'} ${message(e)}${detail(e)}`).join('; ');
}

/** The value at a JSON pointer. */
function at(value: unknown, pointer: string): unknown {
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>(
      (node, key) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined),
      value,
    );
}

function message(error: ErrorObject): string | undefined {
  if (error.keyword === 'discriminator' && error.params.error === 'mapping') {
    return `has unknown ${error.params.tag} ${JSON.stringify(error.params.tagValue)}`;
  }
  return error.message;
}

function detail(error: ErrorObject): string {
  if (error.keyword === 'additionalProperties') return ` ("${error.params.additionalProperty}")`;
  if (error.keyword === 'enum') {
    return ` (${(error.params.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', ')})`;
  }
  return '';
}
