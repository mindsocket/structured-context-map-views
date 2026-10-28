# Fixtures

Spaces captured in the shape the navigator's server sends them (`schemaId` plus structured-context's graph format), so the projections are tested without a live space. Rewrite them with `bun run capture-fixtures <name>=<config path>` in `apps/navigator`.

- `launch-playbook.json`: captured from [`samples/launch-playbook`](../../../../samples/launch-playbook), an invented open-source launch playbook.
- `tea-shop.json`: the tea shop, the standard introductory example in [Online Wardley Maps](https://onlinewardleymaps.com/), parsed by the structured-context Wardley mapping plugin.

Fixtures that are not meant to be committed go in `.gitignore`; the navigator lists everything in this folder.
