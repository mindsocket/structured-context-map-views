# API

The library is pre-1.0: its exports may change between minor versions.

| Entry point | Contents |
|---|---|
| `structured-context-map-views` | `MapView`, the parameter controls, definition parsing, parameter and validation-result helpers, and their types |
| `structured-context-map-views/node` | Finding definitions on disk. Node only |
| `structured-context-map-views/styles.css` | Prebuilt styles, required by the components |

## Rendering a map view

```tsx
import { MapView, ParameterControls } from 'structured-context-map-views';
import 'structured-context-map-views/styles.css';

<ParameterControls definition={definition} values={values} onChange={(name, value) => setValues({ ...values, [name]: value })} />
<MapView definition={definition} graph={graph} values={values} onNodeSelect={(node) => open(node)} />
```

`graph` is a structured-context `SpaceGraph` (see [Data](#data)); `values` and the controls' `onChange` belong to the host. Pass `annotations` to show validation results (see [Validation results](#validation-results)).

A host that lays out the controls itself builds them from `useParameterControls` and `ParameterInput`.

## Definitions

A Node host loads definitions with `loadMapViewDefinitions` (from `/node`; see [where definitions are found](definitions.md#where-definitions-are-found)) and lists those for the space's schema with `mapViewsForSchema(definitions, context.schema.$id)`. Browser-only hosts get the result from a server. After the reader picks a view and its parameters, apply `selectionFilter(definition, values)` when loading the space, and skip validation when `viewValidationLevel(definition, values)` is `off`.

## Data

Map views take structured-context's `SpaceGraph`. A Node host (such as the Obsidian plugin) passes the graph `assembleSpaceGraph` returns. A host whose server and browser are separate sends the wire format: `exportSpaceGraph` on the server, `spaceGraphFrom` (from `structured-context/browser`) in the browser; see `apps/navigator/src/server/load-space.ts`.

## The `export` command

`structured-context-map-views [--config <file>] export <space> [options]` prints a JSON snapshot of a space (its graph, validation results and applicable map view definitions), so a host that can't run structured-context can render a map view from it.

In the output, `graph` is the wire format above and `validation` is what `annotationsFrom` takes.

## Publishing as a Claude artifact

Publish `dist/artifact.html`, unedited, as a Claude artifact declaring the `db` capability. Write each space as `spaces/<space>` from the `export` document: `{ schemaId, graph, validation, definitions }`, the last three as JSON strings. One artifact shows every space in the collection, and refreshing is writing the documents again.

## Rendering to an HTML file

`sctx-map-views` is a structured-context plugin. Name it in a space's `plugins`, or put it in the config root's plugins folder, and `sctx render <space> map-views.html -o map.html` writes one HTML file with the page, its scripts and the space's data inlined. Validation takes the `-d` options `semantic`, `depth`, `ruleFilter` (comma-separated) and `includeGated`.

## Validation results

`annotationsFrom(input, graph)` attaches structured-context's validation issues to the graph's nodes. Pass its `annotations` to `MapView`. The definition's `nodes.validation` and `nodes.validationSources` choose which show.

The library draws the badge, and the host lists the messages. See `AnnotationList` in `apps/navigator/src/NodeDetails.tsx`.

## Drawing a tree yourself

A host that cannot mount React, such as a Claude Code mod, can draw a tree from `buildTree(graph, regionId, dag)`, the tree layout's projection, with `annotationsFrom` for the validation results.

## Theming

Override the `--mv-color-*` variables (`surface`, `card`, `ink`, `muted`, `edge`, `accent`, and `error`, `warning`, `info` for validation badges) on an ancestor of the map view, for example mapping them onto the host's theme variables.
