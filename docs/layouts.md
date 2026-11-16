# Layouts

A layout arranges a region's nodes. A region chooses one with `layout.type` and configures it with the settings below (see [Definitions](definitions.md)).

## tree

A tree over the schema's hierarchy: nodes of the root type at the top, children through hierarchy edges. Relationship edges don't shape the tree.

| Setting | Values | Default |
|---|---|---|
| `orientation` | `vertical`, `horizontal` | `vertical` |
| `dag` | `repeat`, `cross-edge` | `repeat` |

`dag` chooses how a node with several parents is shown. With `repeat` it appears under each parent, and its subtree is shown once. With `cross-edge` it appears under its first parent, with extra connectors from the others.

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

Every node and edge as a network: connected nodes sit close together. It needs no hierarchy, so it suits any schema. Where there is one, it shapes the network: each level settles in a band below the one above, hierarchy nodes gather in the middle while other nodes drift to the sides, and relationship edges are drawn dashed. Nodes with no edge shown sit in a grid underneath.

| Setting | Values | Default |
|---|---|---|
| `edgeFields` | Fields whose edges are drawn and pull nodes together | all edges |

## neighbourhood

One focus node with its neighbours around it. Selecting a neighbour makes it the focus; selecting the focus is a normal node selection.

By default the hierarchy runs down the page, with relationships to one side and siblings to the other:

| Where | Default |
|---|---|
| `above` | Hierarchy parents |
| `below` | Hierarchy children |
| `left` | Relationship edges, in either direction |
| `right` | Nothing |
| Far right | Siblings: the nodes that share the focus's hierarchy parent or, for a hierarchy root, the other roots of its type. They have no connectors; they let the reader move along a level |

In a space with no hierarchy, every edge runs down the page. Each role is also a setting: a list of fields whose nodes go there in either direction, whatever the default. A node joined to the focus by several fields is placed once, by the first of `above`, `below`, `left`, `right`.

The focus is the host's to set (`focus` on `MapView`); by default it is the first hierarchy root, else the first node.
