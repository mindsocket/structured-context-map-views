# structured-context-map-views

Declarative visualisations of [structured-context](https://github.com/mindsocket/structured-context) spaces.

A **map view** is a short JSON5 definition that projects a space into a visual form, such as a tree, nested containers or a network ([layouts](docs/layouts.md)). The same space can be shown several ways, and readers can switch settings such as orientation or grouping through parameters the definition declares. Definitions are found the way structured-context finds plugin schemas: bundled here, in plugins, or in the `.sctx/map-views/` folder beside your content.

```json5
{
  $schema: 'https://raw.githubusercontent.com/mindsocket/structured-context-map-views/main/schemas/generated/latest/definition.json',
  $id: 'sctx-map-view://strategy-tree',
  title: 'Strategy tree',
  schema: 'sctx://core/strategy_general',
  regions: [{ id: 'main', layout: { type: 'tree', orientation: 'vertical' } }],
}
```

This repo holds:

- **The library** (`packages/map-views`, package `structured-context-map-views`): React components that render a map view inside any host app, using the browser's own layout engine plus an SVG overlay for connectors.
- **An `export` command** (`structured-context-map-views export <space>`): a JSON snapshot of a space (graph, validation results, map view definitions) for rendering a map view in a host that can't run structured-context.
- **A Claude artifact host** (`dist/artifact.html`, `dist/artifact.js`): publishes a space's map views as a private artifact whose data lives in the artifact database.
- **A render plugin** (`packages/sctx-map-views`, package `sctx-map-views`): `sctx render <space> map-views.html` writes a space and its map views as one self-contained interactive HTML file.
- **The navigator** (`apps/navigator`, not published): a standalone app for browsing your spaces through their map views.

Pre-1.0. Docs:

- [Concepts](docs/concepts.md): the terms
- [Definitions](docs/definitions.md): writing a map view definition
- [Layouts](docs/layouts.md): the layouts and their settings
- [Architecture](docs/architecture.md): how the library is put together
- [API](docs/api.md): embedding map views in a host

## Development

```bash
bun install
bun run dev        # the navigator, reading spaces from your structured-context config
bun test && bun run typecheck && bun run lint
bun run test:package   # packs the library and the plugin, installs each in an empty project, typechecks a consumer and renders a page
```

Licence: MIT.
