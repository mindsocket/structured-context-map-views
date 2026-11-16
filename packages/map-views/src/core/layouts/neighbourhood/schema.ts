import { parameterisable } from '../../schema/param-ref';
import { SCHEMA_URL } from '../../schema/schema-url';

const roleFields = (description: string) =>
  parameterisable({ $ref: `${SCHEMA_URL}/settings.json#/$defs/fieldList` }, [], description);

/** Settings of the neighbourhood layout: the neighbourhood of one node, placed by role. */
export const neighbourhoodLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/layouts/neighbourhood.json`,
  title: 'Neighbourhood layout',
  description:
    'The neighbourhood of one focus node, with related nodes placed around it by role. Each role lists the fields that put a node there. A node is placed by the first role that matches, in the order left, right, above, below, around.',
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    type: { const: 'neighbourhood' },
    above: roleFields('Fields through which the focus has a parent, shown above it. Empty: every field.'),
    below: roleFields('Fields through which the focus has a child, shown below it. Empty: every field.'),
    left: roleFields('Fields, in either direction, shown to the left. Empty: none.'),
    right: roleFields('Fields, in either direction, shown to the right. Empty: none.'),
  },
} as const;
