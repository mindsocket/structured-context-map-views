import { PARAM_REF, parameterisable } from './param-ref';
import { SCHEMA_URL } from './schema-url';

/** Settings of the XY layout: nodes positioned by two numeric fields. */
export const xyLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/layouts/xy.json`,
  title: 'XY layout',
  description:
    'Nodes positioned on two axes by numeric fields. Nodes of the plotted types without a usable value on both axes are listed beside the plot, not dropped.',
  type: 'object',
  required: ['type', 'x', 'y'],
  additionalProperties: false,
  properties: {
    type: { const: 'xy' },
    x: { $ref: `${SCHEMA_URL}/layouts/xy.json#/$defs/axis` },
    y: { $ref: `${SCHEMA_URL}/layouts/xy.json#/$defs/axis` },
    types: parameterisable(
      { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true },
      [],
      'Node types to plot. Empty: every type with a value on either axis.',
    ),
    edgeFields: parameterisable(
      { $ref: `${SCHEMA_URL}/settings.json#/$defs/fieldList` },
      [],
      'Fields whose edges are drawn between plotted nodes. Empty: all edges.',
    ),
  },
  $defs: {
    axis: {
      title: 'Axis',
      type: 'object',
      required: ['field'],
      additionalProperties: false,
      properties: {
        field: {
          description: 'Numeric field giving the position.',
          anyOf: [{ type: 'string', minLength: 1 }, { $ref: PARAM_REF }],
        },
        domain: {
          description:
            'Values at the two ends of the axis: [min, max], or "data" for the smallest and largest plotted values. Nodes outside a fixed domain are listed as unplaced.',
          default: 'data',
          anyOf: [{ const: 'data' }, { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }],
        },
        direction: parameterisable(
          { $ref: `${SCHEMA_URL}/layouts/xy.json#/$defs/direction` },
          'ascending',
          'ascending: values grow rightwards (x) or upwards (y). descending: the reverse.',
        ),
        label: { type: 'string', description: 'Axis title. Defaults to the field name.' },
      },
    },
    direction: {
      title: 'Axis direction',
      enum: ['ascending', 'descending'],
    },
  },
} as const;
