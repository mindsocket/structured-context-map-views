# Architecture

A space graph and a definition go in; a DOM layout with an SVG overlay comes out. The browser's layout engine (Flexbox, Grid, absolute positioning) does the spatial work; there is no custom layout engine and no intermediate scene graph.

```mermaid
flowchart LR
  space[structured-context space] -->|host assembles| graph[SpaceGraph]
  def[definition .json5] -->|parseMapViewDefinition| mvd[MapViewDefinition]
  graph --> proj[projection]
  mvd --> proj
  proj --> dom[layout component<br>DOM + SVG overlay]
```

## Modules

All but the last two rows are folders of `packages/map-views/src`.

| Module | Holds | May import |
|---|---|---|
| `core` | Definitions and parameters, annotations, and each layout's settings schema and projection, if it has one (`core/layouts/<name>/`). Runs in a browser, Node or a worker | Types from structured-context. No React, DOM or Node |
| `components` | `MapView` and what it draws with: a component per layout, node components, the connector overlay, parameter controls | core, React |
| `viewer` | The page-filling UI that hosts share. What is specific to a host comes in as an option | core, components, React, `structured-context/browser` |
| `node` | What needs a filesystem: finding definitions, snapshotting a space, filling the self-contained page | core, Node, structured-context |
| `artifact`, `page` | The two hosts the library ships. Nothing imports them | Anything above |
| `packages/sctx-map-views` | The structured-context render plugin. It works through the render callbacks, so its bundle imports nothing from structured-context | The library and its `/html` entry |
| `apps/navigator` | The standalone host: a Vite app plus dev-server middleware | Anything |

Modules import each other directly, with no barrel files. The entry points are `src/index.ts` (the package root), `src/node/index.ts` (`/node`), `src/node/html.ts` (`/html`, which imports nothing from structured-context's API) and `src/node/cli.ts` (the bin). `tests/module-boundaries.test.ts` enforces the import rules.

The library build puts core, apart from definition parsing, in a chunk of its own. A host that bundles only a projection from the package root gets neither React nor ajv.

Core is tested without a DOM, against fixtures captured from spaces (`tests/fixtures/`).

## Data in

Hosts pass the library structured-context's `SpaceGraph`: nodes keyed by id, the main hierarchy, and every hierarchy and relationship edge with its metadata, readable in both directions (`parentEdges`, `childEdges`). The Obsidian plugin assembles it in-process; the navigator's server sends the wire format (`exportSpaceGraph`) and its browser rebuilds the graph (`spaceGraphFrom`). The graph keeps edges to nodes outside it; the helpers in `core/layouts/helpers.ts` drop them, so a filtered space stays consistent.

Hosts can also pass validation results as an `AnnotationIndex` (`core/annotations.ts`): results by node id, built by `annotationsFrom` from structured-context's validation issues. `MapView` narrows it by the region's `nodes.validation` and `nodes.validationSources` and provides the result to node components through React context, so layouts don't thread it through. Every layout draws nodes with `NodeComponent`, which draws the badge.

## Projections

A layout has up to three parts:

1. Its settings schema (`core/layouts/<name>/schema.ts`) validates the region's `layout` when the definition is parsed.
2. Its projection (`core/layouts/<name>/projection.ts`), where working out what is shown takes logic of its own: a pure function from the graph and the resolved settings to occurrences and connectors. A layout that shows the space graph as it is, like the graph layout, has none.
3. Its component (`components/`) arranges and draws: with the browser's layout engine, or for the graph layout a d3-force simulation. A projection returns a position only where the data gives one, as the XY layout's field values do.

[Layouts](layouts.md) describes each layout.

## Rendering

Layout components render occurrences as DOM, sizing to their container rather than the viewport. Data-driven positions (XY coordinates) are inline styles; everything else is Tailwind utilities.

Connectors are drawn by `ConnectorOverlay`: a single `<svg>` over the layout container. Each layout keeps a map from occurrence key to element (marked with a `data-occurrence` attribute), measures source and target with `getBoundingClientRect`, and redraws when the container resizes (`ResizeObserver`). DOM `id`s aren't used, so several map views can render side by side.

Node cards and shapes carry `data-node-id` (the node's id, repeat occurrences included), so a host can find the node behind an element. It is markup for hosts, not API.

## Styling

Utilities use Tailwind with the `mv` prefix and no preflight, so nothing global leaks into the host. They are deliberately unlayered: host CSS outside a cascade layer beats anything inside one, and an Obsidian `button { … }` rule would otherwise override them. For the same reason, components avoid native elements that hosts style globally (cards are `div role="button"`, not `<button>`).

Hosts theme map views through the `--mv-color-*` variables ([API](api.md#theming)).

## Hosts

- **Navigator** (`apps/navigator`): dev-server middleware serves spaces (from the structured-context config), the definitions `loadMapViewDefinitions` finds, and, when a map view asks for them, validation results (`validateSpace`, expression rules only), as JSON. What the reader chose lives in the query string, so a reload restores it. Selecting a node opens a side panel with its fields, content and validation results.
- **Claude artifact** (`packages/map-views/src/artifact`): a host with no server. The publishing agent runs the `export` command and writes each space to the artifact's database; the page reads that collection and shows it in the `Viewer` ([API](api.md#publishing-as-a-claude-artifact)). Claude's artifact viewer allows scripts only from a few CDNs and blocks external stylesheets, so the page carries its CSS inline and loads `dist/artifact.js` and its dependencies from jsDelivr through an import map. The host names each card so that a comment left in the artifact viewer identifies its node (`commentLabel`).
- **Self-contained page** (`packages/map-views/src/page`): a host that needs no server or network. The build inlines it, React and the CSS into the template `dist/page.html`, and `fillPage` writes snapshots into it. The `sctx-map-views` plugin bundles that template.
- **Obsidian plugin** ([obsidian-structured-context](https://github.com/mindsocket/obsidian-structured-context)): renders map views in a pane, builds the data in-process, opens the source note on selection and keeps parameter values in the view state.
