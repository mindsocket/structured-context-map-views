import { parameterisable } from '../../schema/param-ref';
import { SCHEMA_URL } from '../../schema/schema-url';

/** Settings of the graph layout: every node and edge as a network. */
export const graphLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/layouts/graph.json`,
  title: 'Graph layout',
  description: 'Nodes and edges as a network: connected nodes sit close together. Works with any schema.',
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    type: { const: 'graph' },
    edgeFields: parameterisable(
      { $ref: `${SCHEMA_URL}/settings.json#/$defs/fieldList` },
      [],
      'Fields whose edges are drawn and pull nodes together. Empty: all edges.',
    ),
  },
} as const;
