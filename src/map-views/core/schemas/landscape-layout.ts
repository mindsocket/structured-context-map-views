import { PARAM_REF, parameterisable } from './param-ref';

/** Settings of the landscape layout: nested containers following an authored grouping. */
export const landscapeLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'sctx-map-view://layouts/landscape.json',
  title: 'Landscape layout',
  description:
    'Nested containers: each grouping level becomes containers inside the level above, and the last level is drawn as nodes.',
  type: 'object',
  required: ['type', 'group'],
  additionalProperties: false,
  properties: {
    type: { const: 'landscape' },
    orientation: parameterisable(
      { $ref: 'sctx-map-view://settings.json#/$defs/orientation' },
      'horizontal',
      'horizontal: top-level containers side by side, as columns. vertical: stacked, as rows.',
    ),
    group: {
      type: 'array',
      minItems: 1,
      description:
        'Grouping levels, outermost first. The last level is drawn as nodes; the others as containers. Adjacent node levels are joined by any edge between their types, in either direction.',
      // Dispatch on `field`, so errors come from the kind of level written, not both.
      items: {
        type: 'object',
        if: { type: 'object', required: ['field'] },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema's `then` keyword.
        then: {
          type: 'object',
          description:
            "Containers labelled by the values of a field of the next node level's nodes. A node with several values appears under each.",
          required: ['field'],
          additionalProperties: false,
          properties: { field: { type: 'string', minLength: 1 } },
        },
        else: {
          type: 'object',
          description: 'A level of nodes of one type.',
          required: ['type'],
          additionalProperties: false,
          properties: {
            type: {
              description: 'Node type at this level.',
              anyOf: [{ type: 'string', minLength: 1 }, { $ref: PARAM_REF }],
            },
            edge: {
              type: 'object',
              description:
                'Which edges join this level to the node level above (or to the last `via` type). By default, any edge between the two types.',
              required: ['field'],
              additionalProperties: false,
              properties: { field: { type: 'string', minLength: 1 } },
            },
            via: {
              type: 'array',
              minItems: 1,
              description:
                'Types skipped between the node level above and this one, in order. Nodes are joined through a chain of edges across them. Ignored on the first level, which has no level above.',
              items: { type: 'string', minLength: 1 },
            },
            intermediate: parameterisable(
              { $ref: 'sctx-map-view://layouts/landscape.json#/$defs/intermediate' },
              'hidden',
              'How the skipped nodes of a `via` chain are shown.',
            ),
          },
        },
      },
    },
  },
  $defs: {
    intermediate: {
      title: 'Skipped levels',
      description: 'hidden: not shown. breadcrumb: listed on each node reached through them.',
      enum: ['hidden', 'breadcrumb'],
    },
  },
} as const;
