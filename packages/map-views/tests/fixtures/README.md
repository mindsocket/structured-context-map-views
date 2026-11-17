# Fixtures

Spaces captured in the shape a host's server sends them (`schemaId` plus structured-context's graph format), so the projections are tested without a live space. Rewrite them with `bun run capture-fixtures <name>=<config path>` in `packages/map-views`.

- `launch-playbook.json`: captured from [`samples/launch-playbook`](../../../../samples/launch-playbook), an invented open-source launch playbook.
- `tea-shop.json`: the tea shop, the standard introductory example in [Online Wardley Maps](https://onlinewardleymaps.com/), parsed by the structured-context Wardley mapping plugin.
- `sdlc/`: an invented software delivery lifecycle space, as a folder of `schema.json` and `nodes.jsonl` (parsed nodes, one per line, as `sctx dump` prints them; line order is the space order). Made by writing the notes as markdown and running `sctx dump <space> | jq -c '.nodes[]'`, then ordering the lines. Loaded by `jsonlFixtureGraph` in `tests/fixture-graph.ts`.
