# sctx-map-views

A [structured-context](https://github.com/mindsocket/structured-context) plugin that renders a space and its [map views](https://github.com/mindsocket/structured-context-map-views#readme) as one self-contained, interactive HTML file.

Install it next to structured-context and name it in the space's `plugins`:

```json
{
  "spaces": [{ "name": "my-space", "path": "content", "schema": "my_schema.json", "plugins": { "sctx-map-views": {} } }]
}
```

```bash
sctx render my-space map-views.html -o my-space.html
```

The file carries its scripts, styles and data, so it opens from disk and can be shared as it is. It holds the map views whose `schema` matches the space's schema, from the library, plugins and the config root's `.sctx/map-views/` folder ([where definitions are found](https://github.com/mindsocket/structured-context-map-views/blob/main/docs/definitions.md#where-definitions-are-found)).

Validation results come from `sctx validate`. Pass its options with `-d`:

| Option | Meaning |
|---|---|
| `semantic` or `semantic=<provider>` | Evaluate semantic rules |
| `depth=<n>` | Validate only nodes within n levels of the top |
| `ruleFilter=severity=error,type=goal` | Evaluate only rules matching these comma-separated `dimension=value` filters |
| `includeGated` | Evaluate rules on nodes gated by an upstream failure |
