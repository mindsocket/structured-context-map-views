# Definitions

A map view definition is a JSON5 file. Its format is a set of JSON Schemas in `schemas/generated/`, generated from `src/map-views/core/schemas/` (`bun run generate:schemas`).

```json5
{
  $schema: 'sctx-map-view://definition.json',
  title: 'Strategy tree',
  schema: 'sctx://core/strategy_general',
  parameters: {
    orientation: { $ref: 'sctx-map-view://settings.json#/$defs/orientation', default: 'vertical' },
  },
  regions: [
    {
      id: 'main',
      layout: { type: 'tree', orientation: { $param: 'orientation' } },
      nodes: { style: 'card', fields: ['status'] },
      edges: { show: true },
    },
  ],
}
```

## Top level

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | `$id` of the structured-context schema whose spaces this map view applies to |
| `regions` | yes | Parts of the map view (at least one; only the first is rendered) |
| `title` | | Display name. Defaults to the file name |
| `description` | | |
| `parameters` | | Settings the reader can change (below) |

## Regions

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within the map view; part of every occurrence key in the region |
| `layout` | yes | The layout and its settings, chosen by `type` |
| `select.filter` | | A structured-context filter: a filter view name from the space's config, or an expression such as `WHERE …` or `SELECT … WHERE …`. By default the region shows every node |
| `nodes.style` | | `card` (title and fields, the default) or `shape` (a compact marker with a tooltip) |
| `nodes.fields` | | Schema fields shown on cards |
| `edges.show` | | Whether connectors are drawn (default `true`) |

## Layouts

### tree

A tree over the schema's hierarchy: nodes of the root type at the top, children through hierarchy edges. Relationship edges don't shape the tree.

| Setting | Values | Default |
|---|---|---|
| `orientation` | `vertical`, `horizontal` | `vertical` |
| `dag` | `repeat`, `cross-edge` | `repeat` |

### landscape

Nested containers. `group` lists grouping levels, outermost first. The last level is drawn as nodes and the others as containers.

| Setting | Values | Default |
|---|---|---|
| `orientation` | `horizontal` (top-level containers as columns), `vertical` (as rows) | `horizontal` |
| `group` | Grouping levels (below) | required |

A grouping level is one of:

- `{ type: 'Activities' }`: a level of nodes of one type. Adjacent node levels are joined by any edge between their types, in either direction, so `Outcomes` can group `Activities` even when the edge is declared from `Activities`.
  - `edge: { field: 'phase' }` restricts the join to edges from that field.
  - `via: ['Capabilities']` joins through a chain of edges across the listed types, in order.
  - `intermediate`: how the skipped nodes of a `via` chain are shown. `hidden` (default) or `breadcrumb` (listed on each node reached through them).
- `{ field: 'status' }`: containers labelled by the values of a field on the next node level. A node with several values appears under each.

A node that occurs in several containers is repeated in each. Nodes of a grouped type that no container reaches are shown as ungrouped, not dropped.

### xy

Nodes positioned on two axes by numeric fields. Plotted nodes without a usable value on both axes, or outside a fixed domain, are listed beside the plot.

| Setting | Values | Default |
|---|---|---|
| `x`, `y` | Axis (below) | required |
| `types` | Node types to plot | every type with a value on either axis |
| `edgeFields` | Fields whose edges are drawn between plotted nodes | all edges |

An axis has a `field` (required), a `domain` (`[min, max]`, or `'data'` for the smallest and largest plotted values; default `'data'`), a `direction` (`ascending`, the default, or `descending`) and a `label` (defaults to the field name).

## Parameters

Any setting marked parameterisable in the schemas (`orientation`, `dag`, `intermediate`, `nodes.style`, `nodes.fields`, `edges.show`, a landscape level's `type`, an axis's `field` and `direction`, `types`, `edgeFields`) takes either a fixed value or `{ $param: '<name>' }`.

Each parameter is a JSON Schema with a `default` and an optional `title`. It can `$ref` a shared setting from `sctx-map-view://settings.json` (`orientation`, `nodeStyle`, `fieldList`) or a layout's own definitions, and narrow it:

```json5
parameters: {
  cardFields: {
    title: 'Card fields',
    type: 'array',
    items: { enum: ['status', 'priority', 'summary'] },
    default: ['status'],
  },
},
```

A definition is rejected when a parameter's default doesn't match its schema, when a binding names an undeclared parameter, or when a value the parameter allows isn't valid for a setting it's bound to.

## Where definitions are found

The navigator reads `map-views/` in this repo, plus any folders listed in `MAP_VIEWS_DIRS` (separated by the platform's path delimiter). A host lists the definitions whose `schema` matches the space's schema `$id` (`mapViewsForSchema`).
