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
    'The neighbourhood of one focus node, with related nodes placed around it by role. By default the hierarchy runs down the page (parents above, children below), relationships in either direction sit to the left and the siblings of the focus to the right; with no hierarchy, every edge runs down the page. A role that lists a field takes the nodes that field joins to the focus, in either direction. A node joined by several fields is placed once, by the first of above, below, left, right.',
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    type: { const: 'neighbourhood' },
    above: roleFields('Fields whose nodes are shown above the focus, in addition to the default.'),
    below: roleFields('Fields whose nodes are shown below the focus, in addition to the default.'),
    left: roleFields('Fields whose nodes are shown to the left of the focus, in addition to the default.'),
    right: roleFields('Fields whose nodes are shown to the right of the focus, in addition to the default.'),
  },
} as const;
