# Concepts

Terms used across map views, their code and their docs. structured-context's own terms (space, node, schema, hierarchy, relationship, filter view) are defined in its [concepts](https://github.com/mindsocket/structured-context/blob/main/docs/concepts.md).

## Map view

A declarative way to visualise spaces of one schema, and the rendering it produces. Always qualified: a bare "map" is left for content that is itself a map, such as a Wardley map. "View" alone is avoided because structured-context (filter views), Obsidian (`ItemView`) and MVC all use it differently.

## Definition

The JSON5 file that declares a map view: the schema it applies to, its parameters and its regions. A definition applies to every space whose schema `$id` equals its `schema`, or to every space when it names none. Its own `$id` (`sctx-map-view://…`) identifies it, namespaced by where it's found: bundled, a plugin, or a config folder. See [Definitions](definitions.md).

## Region

A part of a map view with its own node selection, layout, node style and edge setting. A definition holds a list of regions; only the first is rendered for now.

## Layout

The arrangement a region uses, chosen from a fixed catalogue. Each layout carries its own opinions (spacing, card sizes, colours). Definitions choose and configure a layout; they don't compose one. [Layouts](layouts.md) describes each one.

## Projection

The step some layouts need to decide what is shown: it turns a space graph and the region's settings into occurrences and connectors, for example placing a node with several parents in a tree. Arranging and drawing is the layout component's work.

## Occurrence

One rendered appearance of a space node. A node can occur more than once, for example under each of its parents in a tree; the later occurrences are repeats. Every occurrence has a key built from its path (region, then ancestors, then the node), so repeats stay distinct.

## Node component

What every layout draws for an occurrence: a clickable node in the region's node style (a card with its title and fields, or a compact shape), with its validation badge. "Card" alone means the `card` style, not the component.

## Connector

The line drawn for an edge of the space graph, between two occurrences. "Edge" is the hierarchy or relationship reference in the data; "link" is left for structured-context's links between notes.

## Focus

The node a layout centres on. Hosts can set it; otherwise the reader's picks move it.

## Parameter

A setting the reader can change. A definition declares each parameter once, as a JSON Schema with a default, and binds it to settings with `{ "$param": "<name>" }`. Hosts generate controls from the declared parameters and own the current values.

## Annotation

A validation result attached to a node: a severity, a source (the kind of check, such as `schema`, `hierarchy` or `rule`) and a message. Hosts supply annotations; a region's `nodes.validation` and `nodes.validationSources` settings choose which are drawn.

## Host

An app that embeds the library: it loads space data and definitions, owns parameter values and decides what selecting a node does. [Architecture](architecture.md#hosts) lists the hosts.

## Snapshot

A space as plain JSON: its graph, validation results and the definitions for its schema. It is what a host that can't run structured-context renders from.
