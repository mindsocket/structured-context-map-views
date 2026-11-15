#!/usr/bin/env bash
# Pack the plugin, install the tarball into an empty project next to structured-context, and render a
# space through `sctx render`, so a broken build, a missing file or a plugin core can't load fails
# here rather than after `npm publish`.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cd "$root"
bun run build >/dev/null
npm pack --silent --pack-destination "$tmp" >/dev/null

cd "$tmp"
echo '{ "type": "module" }' >package.json
bun add ./sctx-map-views-*.tgz structured-context >/dev/null

mkdir space
echo '{ "spaces": [{ "name": "smoke", "path": "space", "schema": "strategy_general.json", "plugins": { "sctx-map-views": {} } }] }' >.sctx.json
printf -- '---\ntype: vision\n---\n# Smoke\n' >space/smoke.md
node_modules/.bin/sctx render smoke map-views.html -o out.html >/dev/null
grep -q 'id="sctx-snapshots"' out.html || { echo "rendered page carries no snapshot"; exit 1; }
grep -q 'sctx-map-view://core/strategy-tree' out.html || { echo "rendered page lacks the bundled definitions"; exit 1; }
