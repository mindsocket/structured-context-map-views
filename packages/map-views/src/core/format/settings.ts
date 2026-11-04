import { SCHEMA_URL } from './schema-url';
/** Reusable setting definitions. Parameters can `$ref` these and narrow them, e.g. with `allOf` and `enum`. */
export const settingsSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SCHEMA_URL}/settings.json`,
  title: 'Shared map view settings',
  description: 'Reusable setting definitions. Parameters can $ref these and narrow them, e.g. with allOf and enum.',
  $defs: {
    orientation: {
      title: 'Orientation',
      enum: ['vertical', 'horizontal'],
    },
    nodeStyle: {
      title: 'Node style',
      description: 'card: a box with the title and selected fields. shape: a compact marker with a tooltip.',
      enum: ['card', 'shape'],
    },
    validationLevel: {
      title: 'Validation overlay',
      description:
        'The lowest severity of validation result shown on nodes, or off. error: only errors. warning: errors and warnings. info: everything.',
      enum: ['off', 'error', 'warning', 'info'],
    },
    validationSources: {
      title: 'Validation sources',
      description:
        'Which kinds of validation result are shown. schema: a node failing its schema. hierarchy: a node under a parent type it is not allowed under. rule: a schema rule violation.',
      type: 'array',
      items: { enum: ['schema', 'hierarchy', 'rule'] },
      uniqueItems: true,
    },
    fieldList: {
      title: 'Fields',
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
  },
} as const;
