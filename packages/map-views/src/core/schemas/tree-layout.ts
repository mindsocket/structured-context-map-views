import { parameterisable } from './param-ref';
import { SCHEMA_URL } from './schema-url';

/** Settings of the tree layout: a tree over the schema's hierarchy. */
export const treeLayoutSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/layouts/tree.json`,
  title: 'Tree layout',
  description: "A tree over the schema's hierarchy: root-type nodes at the top, children via hierarchy edges.",
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    type: { const: 'tree' },
    orientation: parameterisable(
      { $ref: `${SCHEMA_URL}/settings.json#/$defs/orientation` },
      'vertical',
      'Direction the tree grows.',
    ),
    dag: parameterisable(
      { $ref: `${SCHEMA_URL}/layouts/tree.json#/$defs/dag` },
      'repeat',
      'How a node with several parents is shown.',
    ),
  },
  $defs: {
    dag: {
      title: 'Nodes with several parents',
      description:
        'repeat: the node appears under each parent, its subtree shown once. cross-edge: the node appears under its first parent, with extra connectors from the others.',
      enum: ['repeat', 'cross-edge'],
    },
  },
} as const;
