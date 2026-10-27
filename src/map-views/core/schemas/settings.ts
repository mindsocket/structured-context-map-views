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
    fieldList: {
      title: 'Fields',
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
  },
} as const;
