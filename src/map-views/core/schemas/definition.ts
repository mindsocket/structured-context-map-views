import { PARAM_REF, parameterisable } from './param-ref';
import { SCHEMA_URL } from './schema-url';

/**
 * The map view definition format: shared parameters, and the regions a map view is composed of.
 *
 * Written as TypeScript so the definition types derive from it (`FromSchema`); the JSON files
 * for `$schema` references and editors are generated (`bun run generate:schemas`).
 */
export const definitionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/definition.json`,
  title: 'Map view definition',
  description:
    'Declares how spaces of one schema are projected into a map view: shared parameters, and the regions the map view is composed of.',
  type: 'object',
  required: ['$id', 'schema', 'regions'],
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    $id: {
      type: 'string',
      pattern: '^sctx-map-view://[^/]+(/[^/]+)?$',
      description:
        'Identifier, namespaced by where the definition is found: "sctx-map-view://core/<name>" (bundled), "sctx-map-view://<plugin>/<name>" (a plugin) or "sctx-map-view://<name>" (the config folder).',
    },
    title: { type: 'string', minLength: 1, description: 'Display name. Defaults to the last segment of the `$id`.' },
    description: { type: 'string' },
    schema: {
      type: 'string',
      minLength: 1,
      description: '`$id` of the structured-context schema whose spaces this map view applies to.',
    },
    parameters: {
      type: 'object',
      description:
        'Settings the reader can change. Each is a JSON Schema with a default, bound to settings anywhere in the definition with { "$param": "<name>" }.',
      additionalProperties: { $ref: '#/$defs/parameter' },
    },
    regions: {
      type: 'array',
      minItems: 1,
      description:
        'Parts of the map view, each with its own layout, nodes and edges. Only the first region is rendered for now.',
      items: { $ref: '#/$defs/region' },
    },
  },
  $defs: {
    parameter: {
      type: 'object',
      description:
        "A JSON Schema for the parameter's values (it can $ref, narrow or extend the bundled setting definitions), plus a title for its control.",
      required: ['default'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        default: {},
      },
    },
    paramRef: {
      type: 'object',
      description: "Takes this setting's value from a declared parameter.",
      required: ['$param'],
      additionalProperties: false,
      properties: { $param: { type: 'string', minLength: 1 } },
    },
    region: {
      type: 'object',
      required: ['id', 'layout'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          minLength: 1,
          description: 'Unique within the map view; part of every occurrence id in the region.',
        },
        select: {
          type: 'object',
          description: 'Which nodes of the space the region shows. By default, all of them.',
          additionalProperties: false,
          properties: {
            filter: {
              type: 'string',
              minLength: 1,
              description:
                "A structured-context filter: a view name from the space's config, or an expression such as `WHERE …` or `SELECT … WHERE …`.",
            },
          },
        },
        layout: {
          description: 'How the region is arranged, chosen by `type`.',
          type: 'object',
          required: ['type'],
          // Ajv validates only the branch `type` selects, so errors name that layout's settings.
          discriminator: { propertyName: 'type' },
          oneOf: [
            { $ref: `${SCHEMA_URL}/layouts/tree.json` },
            { $ref: `${SCHEMA_URL}/layouts/landscape.json` },
            { $ref: `${SCHEMA_URL}/layouts/xy.json` },
          ],
        },
        nodes: {
          type: 'object',
          additionalProperties: false,
          default: {},
          properties: {
            style: parameterisable(
              { $ref: `${SCHEMA_URL}/settings.json#/$defs/nodeStyle` },
              'card',
              'How nodes are drawn.',
            ),
            fields: parameterisable(
              { $ref: `${SCHEMA_URL}/settings.json#/$defs/fieldList` },
              [],
              'Schema fields shown on cards.',
            ),
          },
        },
        edges: {
          type: 'object',
          additionalProperties: false,
          default: {},
          properties: {
            show: parameterisable({ type: 'boolean' }, true, 'Whether connectors are drawn.'),
          },
        },
      },
    },
  },
} as const;

export { PARAM_REF };
