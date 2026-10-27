# API

The library is pre-1.0 and unpublished; hosts consume a local build (`bun run build:map-views`) through a `file:` dependency. Its exports may change between minor versions.

| Entry point | Contents |
|---|---|
| `structured-context-navigator/map-views/core` | Definition parsing, parameters, graph helpers and projections. No React or DOM |
| `structured-context-navigator/map-views/layouts` | React components |
| `structured-context-navigator/map-views/node` | Finding definitions on disk. Node only |
| `structured-context-navigator/map-views/styles.css` | Prebuilt styles, required by the components |

React 19 is a peer dependency.

## Rendering a map view

```tsx
import { MapView, ParameterControls } from 'structured-context-navigator/map-views/layouts';
import 'structured-context-navigator/map-views/styles.css';

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

- `loadMapViewDefinitions(config, { configDir?, bundledDir? })` (from `/node`): every definition available with a structured-context config, checked for namespaced, unique `$id`s (see [where definitions are found](definitions.md#where-definitions-are-found)). `bundledDir` is for hosts that bundle the module and so can't locate this package's `map-views/` folder. Browser-only hosts get the result from a server.
- `parseMapViewDefinition(name, text)`: parses and validates JSON5 text (`name` labels error messages), throwing `MapViewDefinitionError` with the problems found. A `MapViewDefinition`'s `id` is its `$id`.
- `mapViewsForSchema(definitions, schemaId)`: the definitions that apply to a schema.
- `resolveParameterValues(definition, values)`: the effective value of every parameter.
- `selectionFilter(definition, values)`: the first region's `select.filter`, for a host to apply when loading the space.
- `MAP_VIEW_SCHEMAS`: the format's JSON Schemas.

## Data

Map views take structured-context's `SpaceGraph`. A Node host (such as the Obsidian plugin) passes the graph `assembleSpaceGraph` returns. A host whose server and browser are separate sends the wire format: `exportSpaceGraph` on the server, `spaceGraphFrom` (from `structured-context/browser`) in the browser; see `src/navigator/server/load-space.ts`. To pick definitions, hosts also need the space's schema id (`context.schema.$id`).

## Theming

Override the `--mv-color-*` variables (`surface`, `card`, `ink`, `muted`, `edge`, `accent`) on an ancestor of the map view, for example mapping them onto the host's theme variables.
