# API

The library is pre-1.0: its exports may change between minor versions. Until the first release is published, hosts consume a local build (`bun run build` in `packages/map-views`) through a `file:` dependency on that folder.

| Entry point | Contents |
|---|---|
| `structured-context-map-views` | `MapView`, the parameter controls, definition parsing, parameter and validation-result helpers, and their types |
| `structured-context-map-views/node` | Finding definitions on disk. Node only |
| `structured-context-map-views/styles.css` | Prebuilt styles, required by the components |

React 19 and `structured-context` are peer dependencies, so the host's copy of each is the one used. Layouts, node cards, the edge overlay and the projections are internal; exports are added when a host needs one.

## Rendering a map view

```tsx
import { MapView, ParameterControls } from 'structured-context-map-views';
import 'structured-context-map-views/styles.css';

<ParameterControls definition={definition} values={values} onChange={(name, value) => setValues({ ...values, [name]: value })} />
<MapView definition={definition} graph={graph} values={values} onNodeSelect={(node) => open(node)} />
```

### `MapView`

| Prop | Type | Meaning |
|---|---|---|
| `definition` | `MapViewDefinition` | A parsed definition |
| `graph` | `SpaceGraph` | The space to render, as structured-context's `assembleSpaceGraph` or `spaceGraphFrom` returns it |
| `values` | `ParameterValues` | Current parameter values, owned by the host. Missing values use defaults |
| `annotations` | `AnnotationIndex` | Validation results by node (see [Validation results](#validation-results)). Drawn only when the region's `nodes.validation` isn't `off` |
| `onNodeSelect` | `(node: SpaceNode) => void` | Called when the reader selects a node |

`MapView` sizes to its container and scrolls within it.

### Parameter controls

`ParameterControls` is a ready-made row of controls generated from the definition's parameters; it renders nothing when there are none. `values` holds the host's current values (missing or stale ones show as the default), and `onChange` receives the parameter name and new value.

A host that wants its own layout builds from smaller parts: `useParameterControls(definition, values, onChange)` returns each parameter with its current value and a setter, with no markup, and `ParameterInput` renders the right input for a parameter. The typed inputs (`ToggleParameterInput`, `SelectParameterInput`, `MultiSelectParameterInput`) are exported for hosts that want one kind of input without the dispatch.

## Definitions

- `loadMapViewDefinitions(config, { configDir? })` (from `/node`): every definition available with a structured-context config, checked for namespaced, unique `$id`s (see [where definitions are found](definitions.md#where-definitions-are-found)). The library's own definitions are embedded in the module, so it works in a host's bundle. Browser-only hosts get the result from a server.
- `parseMapViewDefinition(name, text)`: parses and validates JSON5 text (`name` labels error messages), throwing `MapViewDefinitionError` with the problems found. A `MapViewDefinition`'s `id` is its `$id`.
- `mapViewsForSchema(definitions, schemaId)`: the definitions that apply to a schema.
- `resolveParameterValues(definition, values)`: the effective value of every parameter.
- `selectionFilter(definition, values)`: the first region's `select.filter`, for a host to apply when loading the space.
- `viewValidationLevel(definition, values)`: the first region's `nodes.validation`, so a host can skip running validation when it is `off`.
- `MAP_VIEW_SCHEMAS`: the format's JSON Schemas.

## Data

Map views take structured-context's `SpaceGraph`. A Node host (such as the Obsidian plugin) passes the graph `assembleSpaceGraph` returns. A host whose server and browser are separate sends the wire format: `exportSpaceGraph` on the server, `spaceGraphFrom` (from `structured-context/browser`) in the browser; see `apps/navigator/src/server/load-space.ts`. To pick definitions, hosts also need the space's schema id (`context.schema.$id`).

## The `export` command

`structured-context-map-views [--config <file>] export <space> [options]` prints a JSON snapshot of a space (its graph, validation results and applicable map view definitions), so a host that can't run structured-context can render a map view from it. The validation options (see `--help`) mean what they do for `sctx validate`.

```json
{
  "space": "name",
  "schemaId": "sctx://…",
  "graph": { "formatVersion": 1 },
  "validation": { "nodeErrors": [], "hierarchyViolations": [], "ruleViolations": [] },
  "definitions": []
}
```

`graph` is the wire format described above and `validation` is what `annotationsFrom` takes.

## Publishing as a Claude artifact

`dist/artifact.html` is a page that needs no edits: publish it as a Claude artifact declaring the `db` capability, then write each space as `spaces/<space>` from the `export` document: `{ schemaId, graph, validation, definitions }`, the last three as JSON strings. The page lists the `spaces` collection, so one artifact can show several spaces, and refreshing is writing the documents again. The page pins this package's version (loaded from jsDelivr) and carries the styles inline. Comments on a card report its accessible name, `<view>/<nodeId>: <type> <title>`; the node id resolves in the stored graph.

## Validation results

Hosts that validate a space can show the results on the nodes. Pass `annotationsFrom(input, graph)` structured-context's `ValidationResult`, or just the parts a host has (`ruleViolations`, `hierarchyViolations` and `nodeErrors` are each optional, so a host that runs only some checks passes only those). It returns `{ annotations, unattached }`: an `AnnotationIndex` (results by node id) to pass to `MapView`, and the results with no node on the graph for the host to surface itself.

structured-context names a result's node by `nodeId`. A result is attached when that node is in the graph. It is `unattached` when it has no `nodeId` (a global-scope rule) or its node isn't in the graph, such as a node of an unknown type. Nodes with field errors stay in the graph, so their schema errors attach. An unattached result keeps its `nodeId` and, for schema errors, its source `location`.

Each annotation has a `severity` (`error`, `warning` or `info`), a `source` (`schema`, `hierarchy` or `rule`) and a `message`. Schema and hierarchy results are errors; rule results carry the rule's severity. Which show, and the lowest severity drawn, are the definition's `nodes.validation` and `nodes.validationSources` settings.

### Showing the messages

The library draws the badge and leaves the messages to the host, because a message list takes its markup and styling from the host (the navigator's side panel and a Claude artifact's differ). The pattern is the same everywhere: keep the `annotations` index you passed to `MapView`, and when a card is selected list `annotations.get(node.id)`, one row per result with its `severity`, its `source` (plus `ruleId` for rule results) and its `message`. List `unattached` separately, grouped by `nodeId`. `NodeAnnotation` and `UnattachedAnnotation` are exported for typing. See `AnnotationList` in `apps/navigator/src/NodeDetails.tsx`.

## Theming

Override the `--mv-color-*` variables (`surface`, `card`, `ink`, `muted`, `edge`, `accent`, and `error`, `warning`, `info` for validation badges) on an ancestor of the map view, for example mapping them onto the host's theme variables.
