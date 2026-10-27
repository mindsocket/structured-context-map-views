import { PARAM_REF, parameterisable } from './param-ref';

/**
 * The map view definition format: shared parameters, and the regions a map view is composed of.
 *
 * Written as TypeScript so the definition types derive from it (`FromSchema`); the JSON files
 * for `$schema` references and editors are generated (`bun run generate:schemas`).
 */
export const definitionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'sctx-map-view://definition.json',
  title: 'Map view definition',
  description:
    'Declares how spaces of one schema are projected into a map view: shared parameters, and the regions the map view is composed of.',
  type: 'object',
  required: ['schema', 'regions'],
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    title: { type: 'string', minLength: 1, description: 'Display name. Defaults to the file name.' },
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
            { $ref: 'sctx-map-view://layouts/tree.json' },
            { $ref: 'sctx-map-view://layouts/landscape.json' },
            { $ref: 'sctx-map-view://layouts/xy.json' },
          ],
        },
        nodes: {
          type: 'object',
          additionalProperties: false,
          default: {},
          properties: {
            style: parameterisable(
              { $ref: 'sctx-map-view://settings.json#/$defs/nodeStyle' },
              'card',
              'How nodes are drawn.',
            ),
            fields: parameterisable(
              { $ref: 'sctx-map-view://settings.json#/$defs/fieldList' },
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
