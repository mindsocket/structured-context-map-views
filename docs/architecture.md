# Architecture

A space graph and a definition go in; a DOM layout with an SVG overlay comes out. The browser's layout engine (Flexbox, Grid, absolute positioning) does the spatial work; there is no custom layout engine and no intermediate scene graph.

```mermaid
flowchart LR
  space[structured-context space] -->|host assembles| graph[SpaceGraph]
  def[definition .json5] -->|parseMapViewDefinition| mvd[MapViewDefinition]
  graph --> proj[projection<br>tree · landscape · xy]
  mvd --> proj
  proj --> dom[layout component<br>DOM + SVG overlay]
```

## Modules

| Module | Holds | May import |
|---|---|---|
| `packages/map-views/src/core` | Definition parsing and validation, parameter resolution, graph helpers, and the projections (`buildTree`, `buildLandscape`, `buildXYPlot`) | Types from structured-context only. No React, DOM or Node |
| `packages/map-views/src/layouts` | `MapView`, the layout components, `NodeCard`, `EdgeOverlay`, `ParameterControls`, styles | core, React |
| `packages/map-views/src/node` | `loadMapViewDefinitions`: finding definitions in the library (embedded at build time from `packages/map-views/map-views/`), plugins and config folders | core, Node, structured-context |
| `apps/navigator` | The standalone host: a Vite app plus dev-server middleware calling the structured-context API | Anything |

`packages/map-views/src/index.ts` is the published entry point and re-exports the few things hosts need; `src/node` is the second entry point. `packages/map-views/tests/module-boundaries.test.ts` enforces the core and layouts rules, including that neither imports the Node module. Core runs anywhere (browser, Node, worker) and is tested without a DOM, against fixtures captured from spaces (`packages/map-views/tests/fixtures/`, written by `apps/navigator/scripts/capture-fixtures.ts`). The public sample space in `samples/launch-playbook/` is the source of `launch-playbook.json`.

## Data in

Hosts pass the library structured-context's `SpaceGraph`: nodes keyed by id, the main hierarchy, and every hierarchy and relationship edge with its metadata, readable in both directions (`parentEdges`, `childEdges`). The Obsidian plugin assembles it in-process; the navigator's server sends the wire format (`exportSpaceGraph`) and its browser rebuilds the graph (`spaceGraphFrom`). The graph keeps edges to nodes outside it; the helpers in `core/graph.ts` drop them, so a filtered space stays consistent.

## Projections

Each layout has a pure projection in core that turns the graph and the region's resolved settings into occurrences and links:

- **Tree**: walks the hierarchy from the root type. A node with several parents is repeated (subtree once) or placed once with cross-links. Cycles end in a repeat.
- **Landscape**: walks the grouping levels, joining node levels by edges in either direction, through `via` chains or by field values.
- **XY**: normalises two numeric fields to percentages within each axis's domain and lists the nodes it can't place.

Occurrence keys are paths (region, ancestors, node), so a node appearing several times gets distinct keys.

## Rendering

Layout components render occurrences as DOM, sizing to their container rather than the viewport. Data-driven positions (XY coordinates) are inline styles; everything else is Tailwind utilities.

Connectors are drawn by `EdgeOverlay`: a single `<svg>` over the layout container. Each layout keeps a map from occurrence key to element (marked with a `data-occurrence` attribute), measures source and target with `getBoundingClientRect`, and redraws when the container resizes (`ResizeObserver`). DOM `id`s aren't used, so several map views can render side by side.

## Styling

Utilities use Tailwind with the `mv` prefix and no preflight, so nothing global leaks into the host. They are deliberately unlayered: host CSS outside a cascade layer beats anything inside one, and an Obsidian `button { … }` rule would otherwise override them. For the same reason, components avoid native elements that hosts style globally (cards are `div role="button"`, not `<button>`).

Hosts theme map views through six variables: `--mv-color-surface`, `--mv-color-card`, `--mv-color-ink`, `--mv-color-muted`, `--mv-color-edge` and `--mv-color-accent`.

## Hosts

- **Navigator** (`apps/navigator`): dev-server middleware serves spaces (from the structured-context config, plus the fixtures as `fixture:<name>`) and the definitions `loadMapViewDefinitions` finds, as JSON. Selecting a node opens a side panel with its fields. Parameter values live in memory.
- **Obsidian plugin** ([obsidian-structured-context](https://github.com/mindsocket/obsidian-structured-context)): renders map views in a pane, builds the data in-process, opens the source note on selection and keeps parameter values in the view state.
