# structured-context-map-views

Declarative visualisations of [structured-context](https://github.com/mindsocket/structured-context) spaces.

A **map view** is a short JSON5 definition that projects every space of one schema into a visual form: a tree, nested containers, or an XY plot. The same space can be shown several ways, and readers can switch settings such as orientation or grouping through parameters the definition declares.

```json5
{
  $schema: 'sctx-map-view://definition.json',
  title: 'Strategy tree',
  schema: 'sctx://core/strategy_general',
  regions: [{ id: 'main', layout: { type: 'tree', orientation: 'vertical' } }],
}
```

This repo holds:

- **The library**: React components that render a map view inside any host app, using the browser's own layout engine plus an SVG overlay for connectors.
- **The navigator**: a standalone app for browsing your spaces through their map views.

Pre-1.0 and not yet published. Docs:

- [Concepts](docs/concepts.md): map views, regions, layouts, occurrences, parameters
- [Definitions](docs/definitions.md): writing a map view definition
- [Architecture](docs/architecture.md): how the library is put together
- [API](docs/api.md): embedding map views in a host

## Development

```bash
bun install
bun run dev        # the navigator, reading spaces from your structured-context config
bun test && bun run typecheck && bun run lint
```

Licence: MIT.
