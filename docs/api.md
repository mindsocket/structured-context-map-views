# API

The library is pre-1.0: its exports may change between minor versions. Until the first release is published, hosts consume a local build (`bun run build` in `packages/map-views`) through a `file:` dependency on that folder.

| Entry point | Contents |
|---|---|
| `structured-context-map-views` | `MapView`, `ParameterControls`, definition parsing and parameter helpers, and their types |
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
| `onNodeSelect` | `(node: SpaceNode) => void` | Called when the reader selects a node |

`MapView` sizes to its container and scrolls within it.

### `ParameterControls`

Controls generated from the definition's parameters. Renders nothing when there are none.

| Prop | Type | Meaning |
|---|---|---|
| `definition` | `MapViewDefinition` | |
| `values` | `ParameterValues` | Missing or stale values show as the default, matching what renders |
| `onChange` | `(name: string, value: unknown) => void` | |

## Definitions

- `loadMapViewDefinitions(config, { configDir? })` (from `/node`): every definition available with a structured-context config, checked for namespaced, unique `$id`s (see [where definitions are found](definitions.md#where-definitions-are-found)). The library's own definitions are embedded in the module, so it works in a host's bundle. Browser-only hosts get the result from a server.
- `parseMapViewDefinition(name, text)`: parses and validates JSON5 text (`name` labels error messages), throwing `MapViewDefinitionError` with the problems found. A `MapViewDefinition`'s `id` is its `$id`.
- `mapViewsForSchema(definitions, schemaId)`: the definitions that apply to a schema.
- `resolveParameterValues(definition, values)`: the effective value of every parameter.
- `selectionFilter(definition, values)`: the first region's `select.filter`, for a host to apply when loading the space.
- `MAP_VIEW_SCHEMAS`: the format's JSON Schemas.

## Data

Map views take structured-context's `SpaceGraph`. A Node host (such as the Obsidian plugin) passes the graph `assembleSpaceGraph` returns. A host whose server and browser are separate sends the wire format: `exportSpaceGraph` on the server, `spaceGraphFrom` (from `structured-context/browser`) in the browser; see `apps/navigator/src/server/load-space.ts`. To pick definitions, hosts also need the space's schema id (`context.schema.$id`).

## Theming

Override the `--mv-color-*` variables (`surface`, `card`, `ink`, `muted`, `edge`, `accent`) on an ancestor of the map view, for example mapping them onto the host's theme variables.
