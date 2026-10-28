# structured-context-map-views

Declarative map views of [structured-context](https://github.com/mindsocket/structured-context) spaces: a short JSON5 definition projects a space into a tree, nested containers or an XY plot, rendered by React components.

```bash
npm install structured-context-map-views react react-dom structured-context
```

```tsx
import { MapView, ParameterControls } from 'structured-context-map-views';
import 'structured-context-map-views/styles.css';

<MapView definition={definition} graph={graph} values={values} onNodeSelect={(node) => open(node)} />
```

`structured-context-map-views/node` finds definitions on disk (`loadMapViewDefinitions`). React 19 and `structured-context` are peer dependencies. Pre-1.0: exports may change between minor versions.

See the [documentation](https://github.com/mindsocket/structured-context-map-views#readme): [concepts](https://github.com/mindsocket/structured-context-map-views/blob/main/docs/concepts.md), [writing definitions](https://github.com/mindsocket/structured-context-map-views/blob/main/docs/definitions.md) and [the API](https://github.com/mindsocket/structured-context-map-views/blob/main/docs/api.md).

Licence: MIT.
