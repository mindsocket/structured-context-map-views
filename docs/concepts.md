# Concepts

Terms used across map views, their code and their docs. structured-context's own terms (space, node, schema, hierarchy, relationship, filter view) are defined in its [concepts](https://github.com/mindsocket/structured-context/blob/main/docs/concepts.md).

## Map view

A declarative way to visualise spaces of one schema, and the rendering it produces. Always qualified: a bare "map" is left for content that is itself a map, such as a Wardley map. "View" alone is avoided because structured-context (filter views), Obsidian (`ItemView`) and MVC all use it differently.

## Definition

The JSON5 file that declares a map view: the schema it applies to, its parameters and its regions. A definition applies to every space whose schema `$id` equals its `schema`. See [Definitions](definitions.md).

## Region

A part of a map view with its own node selection, layout, node style and edge setting. A definition holds a list of regions; only the first is rendered for now.

## Layout

The arrangement a region uses, chosen from a fixed catalogue:

- **tree**: a tree over the schema's hierarchy.
- **landscape**: nested containers following an authored grouping.
- **xy**: nodes positioned by two numeric fields.

Each layout carries its own opinions (spacing, card sizes, colours). Definitions choose and configure a layout; they don't compose one.

## Occurrence

One rendered appearance of a space node. A node can occur more than once, for example under each of its parents in a tree. Every occurrence has a key built from its path (region, then ancestors, then the node), so repeated nodes stay distinct. Connectors are drawn between occurrences.

## Repeat and cross-edge

The two ways a tree shows a node with several parents:

- **repeat**: the node appears under each parent, and its subtree is shown once.
- **cross-edge**: the node appears under its first parent, with extra connectors from the others.

## Grouping level

One step of a landscape's grouping: a node type, or a field whose values become containers. Levels can follow edges in either direction, and a `via` chain can skip types between two levels.

## Parameter

A setting the reader can change. A definition declares each parameter once, as a JSON Schema with a default, and binds it to settings with `{ "$param": "<name>" }`. Hosts generate controls from the declared parameters and own the current values.

## Host

An app that embeds the library: it loads space data and definitions, owns parameter values and decides what selecting a node does. The navigator and the Obsidian plugin are hosts.
