import type { AuthoredLayout } from '../../definition';
import { PARAM_REF, parameterisable } from '../../schema/param-ref';
import { SCHEMA_URL } from '../../schema/schema-url';

/** A dimension: groups that are the same wherever the dimension is used. Dispatches on `field`, like a grouping level. */
const dimensionSchema = {
  type: 'object',
  if: { type: 'object', required: ['field'] },
  // biome-ignore lint/suspicious/noThenProperty: JSON Schema's `then` keyword.
  then: {
    type: 'object',
    description:
      "Groups labelled by the values of a field of the strip's first node level. A value no node has is not a group.",
    required: ['field'],
    additionalProperties: false,
    properties: { field: { type: 'string', minLength: 1 } },
  },
  else: {
    type: 'object',
    description: 'A group for every node of one type.',
    required: ['type'],
    additionalProperties: false,
    properties: {
      type: {
        description: 'Node type of the groups.',
        anyOf: [{ type: 'string', minLength: 1 }, { $ref: PARAM_REF }],
      },
      edge: {
        type: 'object',
        description:
          "Which edges join a group's node to the strip's first node level, or to its last `via` type. By default, any edge between the two types, in either direction.",
        required: ['field'],
        additionalProperties: false,
        properties: { field: { type: 'string', minLength: 1 } },
      },
    },
  },
} as const;

/** Settings of the landscape layout: strips of nested containers, optionally divided into cells by dimensions. */
export const landscapeLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/layouts/landscape.json`,
  title: 'Landscape layout',
  description:
    "Strips, one after the other. Each strip nests its grouping levels, and its last level is drawn as nodes. A dimension divides a strip into cells: the layout's dimension divides every strip alike, so they line up, and a strip's own dimension divides that strip further.",
  type: 'object',
  required: ['type', 'strips'],
  additionalProperties: false,
  properties: {
    type: { const: 'landscape' },
    orientation: parameterisable(
      { $ref: `${SCHEMA_URL}/settings.json#/$defs/orientation` },
      'horizontal',
      "horizontal: top-level containers, or the layout dimension's groups, side by side, as columns, and strips stacked. vertical: the reverse.",
    ),
    dimension: {
      ...dimensionSchema,
      description:
        'Divides every strip. Its groups are worked out once, so every strip has the same groups in the same order, and a cell exists even when it is empty.',
    },
    strips: {
      type: 'array',
      minItems: 1,
      description: 'The strips, in order along the axis the layout dimension does not run along.',
      items: {
        type: 'object',
        required: ['group'],
        additionalProperties: false,
        properties: {
          dimension: {
            ...dimensionSchema,
            description:
              "Divides this strip further, along the strip's own axis. Without a layout dimension, a strip with its own dimension is a swimlane.",
          },
          showUngrouped: parameterisable(
            { type: 'boolean' },
            true,
            "Whether to draw the nodes of the strip's levels that no cell or container reached.",
          ),
          group: {
            type: 'array',
            minItems: 1,
            description:
              'Grouping levels, outermost first. The last level is drawn as nodes; the others as containers. Adjacent node levels are joined by any edge between their types, in either direction. In a strip with a dimension, the first level is joined to each dimension node the same way, so `edge` and `via` apply there.',
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
                      "Types skipped between the node level above (or the dimension's node) and this one, in order. Nodes are joined through a chain of edges across them. Ignored on the first level of a strip with no dimension.",
                    items: { type: 'string', minLength: 1 },
                  },
                  intermediate: parameterisable(
                    { $ref: `${SCHEMA_URL}/layouts/landscape.json#/$defs/intermediate` },
                    'hidden',
                    'How the skipped nodes of a `via` chain are shown.',
                  ),
                },
              },
            },
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

export function checkLandscapeLayout(layout: AuthoredLayout<'landscape'>) {
  // A field level labels the nodes of a later level, so a node level must come last in each strip.
  if (layout.strips.some((strip) => !('type' in strip.group.at(-1)!))) {
    return 'the last grouping level of a strip must be a node type, not a field';
  }
}
