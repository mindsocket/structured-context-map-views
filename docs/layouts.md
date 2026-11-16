# Layouts

A layout arranges a region's nodes. A region chooses one with `layout.type` and configures it with the settings below (see [Definitions](definitions.md)).

## tree

A tree over the schema's hierarchy: nodes of the root type at the top, children through hierarchy edges. Relationship edges don't shape the tree.

| Setting | Values | Default |
|---|---|---|
| `orientation` | `vertical`, `horizontal` | `vertical` |
| `dag` | `repeat`, `cross-edge` | `repeat` |

## landscape

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

## xy

Nodes positioned on two axes by numeric fields. Plotted nodes without a usable value on both axes, or outside a fixed domain, are listed beside the plot.

| Setting | Values | Default |
|---|---|---|
| `x`, `y` | Axis (below) | required |
| `types` | Node types to plot | every type with a value on either axis |
| `edgeFields` | Fields whose edges are drawn between plotted nodes | all edges |

An axis has a `field` (required), a `domain` (`[min, max]`, or `'data'` for the smallest and largest plotted values; default `'data'`), a `direction` (`ascending`, the default, or `descending`) and a `label` (defaults to the field name).

## graph

Every node and edge as a network: connected nodes sit close together. It needs no hierarchy, so it suits any schema.

| Setting | Values | Default |
|---|---|---|
| `edgeFields` | Fields whose edges are drawn and pull nodes together | all edges |

## neighbourhood

One focus node with its neighbours around it. Selecting a neighbour makes it the focus; selecting the focus is a normal node selection. A node is placed by the first role that matches, in the order `left`, `right`, `above`, `below`, then `around` for the rest.

| Setting | Meaning |
|---|---|
| `above` | Fields through which the focus has a parent. Empty: every field |
| `below` | Fields through which the focus has a child. Empty: every field |
| `left`, `right` | Fields, in either direction. Empty: none |

The focus is the host's to set (`focus` on `MapView`); by default it is the first hierarchy root, else the first node.
