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
| `packages/map-views/src/layouts` | `MapView`, the layout components, `NodeCard`, `EdgeOverlay`, the parameter controls (`useParameterControls`, the typed inputs and the default `ParameterControls` layout), styles | core, React |
| `packages/map-views/src/node` | `loadMapViewDefinitions`: finding definitions in the library (embedded at build time from `packages/map-views/map-views/`), plugins and config folders; `exportSnapshot` and the `export` bin, which snapshot a space for browser-only hosts | core, Node, structured-context |
| `apps/navigator` | The standalone host: a Vite app plus dev-server middleware calling the structured-context API | Anything |

`packages/map-views/src/index.ts` is the published entry point and re-exports the few things hosts need (modules import each other directly, with no barrel files); `src/node` is the second entry point, and `src/node/cli.ts` is the bin. `packages/map-views/tests/module-boundaries.test.ts` enforces the core and layouts rules, including that neither imports the Node module. Core runs anywhere (browser, Node, worker) and is tested without a DOM, against fixtures captured from spaces (`packages/map-views/tests/fixtures/`, written by `packages/map-views/scripts/capture-fixtures.ts`). The public sample space in `samples/launch-playbook/` is the source of `launch-playbook.json`.

## Data in

Hosts pass the library structured-context's `SpaceGraph`: nodes keyed by id, the main hierarchy, and every hierarchy and relationship edge with its metadata, readable in both directions (`parentEdges`, `childEdges`). The Obsidian plugin assembles it in-process; the navigator's server sends the wire format (`exportSpaceGraph`) and its browser rebuilds the graph (`spaceGraphFrom`). The graph keeps edges to nodes outside it; the helpers in `core/graph.ts` drop them, so a filtered space stays consistent.

Hosts can also pass validation results as an `AnnotationIndex` (`core/annotations.ts`): results by node id, derived from structured-context's `ValidationResult` types. `MapView` narrows it by the region's `nodes.validation` and `nodes.validationSources` and provides the result to node cards through React context, so layouts don't thread it through. Every layout draws nodes with `NodeCard`, which draws the badge.

## Projections

Each layout has a pure projection in core that turns the graph and the region's resolved settings into occurrences and links:

- **Tree**: walks the hierarchy from the root type. A node with several parents is repeated (subtree once) or placed once with cross-links. Cycles end in a repeat.
- **Landscape**: walks the grouping levels, joining node levels by edges in either direction, through `via` chains or by field values.
- **XY**: normalises two numeric fields to percentages within each axis's domain and lists the nodes it can't place.

Occurrence keys are paths (region, ancestors, node), so a node appearing several times gets distinct keys.

## Rendering

Layout components render occurrences as DOM, sizing to their container rather than the viewport. Data-driven positions (XY coordinates) are inline styles; everything else is Tailwind utilities.

Connectors are drawn by `EdgeOverlay`: a single `<svg>` over the layout container. Each layout keeps a map from occurrence key to element (marked with a `data-occurrence` attribute), measures source and target with `getBoundingClientRect`, and redraws when the container resizes (`ResizeObserver`). DOM `id`s aren't used, so several map views can render side by side.

Node cards and shapes carry `data-node-id` (the node's id, repeat occurrences included), so a host can find the node behind an element. It is markup for hosts, not API.

## Styling

Utilities use Tailwind with the `mv` prefix and no preflight, so nothing global leaks into the host. They are deliberately unlayered: host CSS outside a cascade layer beats anything inside one, and an Obsidian `button { … }` rule would otherwise override them. For the same reason, components avoid native elements that hosts style globally (cards are `div role="button"`, not `<button>`).

Hosts theme map views through nine variables: `--mv-color-surface`, `--mv-color-card`, `--mv-color-ink`, `--mv-color-muted`, `--mv-color-edge` and `--mv-color-accent`, plus `--mv-color-error`, `--mv-color-warning` and `--mv-color-info` for validation badges.

## Hosts

- **Navigator** (`apps/navigator`): dev-server middleware serves spaces (from the structured-context config), the definitions `loadMapViewDefinitions` finds, and, when a map view asks for them, validation results (`validateSpace`, expression rules only), as JSON. The chosen space, map view and parameter values live in the query string, so a reload restores them. Selecting a node opens a side panel with its fields, content and validation results.
- **Claude artifact** (`packages/map-views/src/artifact`, shipped as `dist/artifact.js` with its page `dist/artifact.html`): a host with no server. The publishing agent runs the `export` command and writes each space to the artifact's database (`spaces/<space>`: `schemaId`, and `graph`, `validation` and `definitions` as JSON strings). The page lists that collection, offers the spaces and their map views, renders `MapView` with the parameter controls, and lists a card's validation results in a side panel. It declares only the `db` capability and shows a message when the database is unavailable, empty or slow (10 s). The viewer allows scripts only from a few CDNs and blocks external stylesheets, so `scripts/build-artifact-page.ts` writes a page that carries the CSS inline and loads `dist/artifact.js` (pinned to this package's version) and its dependencies from jsDelivr through an import map; `react` and `react-dom` are pinned to one version so the page runs one React. Cards are given an accessible name `[<index>] <title> · <view>` (from `data-node-id`), where the index is the node's position in the stored graph's `nodes` array, because the viewer's comment mode reads a comment's location from it (cut at about 45 characters, too short for a node id), so a comment tells an agent which node it concerns. Refreshing the data is writing the documents again; the page doesn't change.
- **Obsidian plugin** ([obsidian-structured-context](https://github.com/mindsocket/obsidian-structured-context)): renders map views in a pane, builds the data in-process, opens the source note on selection and keeps parameter values in the view state.
