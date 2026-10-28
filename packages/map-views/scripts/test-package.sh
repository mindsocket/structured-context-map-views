#!/usr/bin/env bash
# Pack the package, install the tarball into an empty project, typecheck a consumer without
# skipLibCheck and import both entry points, so a broken build, a missing file or a declaration
# that needs a package the consumer doesn't have fails here rather than after `npm publish`.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cd "$root"
bun run build >/dev/null
npm pack --silent --pack-destination "$tmp" >/dev/null

cd "$tmp"
echo '{ "type": "module" }' >package.json
bun add ./structured-context-map-views-*.tgz react react-dom structured-context typescript @types/react @types/react-dom @types/node >/dev/null

cat >consumer.tsx <<'EOF2'
import {
  MapView,
  type MapViewDefinition,
  mapViewsForSchema,
  ParameterControls,
  type ParameterValues,
  parseMapViewDefinition,
  selectionFilter,
} from 'structured-context-map-views';
import { loadMapViewDefinitions } from 'structured-context-map-views/node';
import 'structured-context-map-views/styles.css';

declare const graph: Parameters<typeof MapView>[0]['graph'];
declare const values: ParameterValues;
const definitions: MapViewDefinition[] = loadMapViewDefinitions({ spaces: [] });
const [definition] = mapViewsForSchema(definitions, 'sctx://core/strategy_general');
parseMapViewDefinition('inline', '{}');
export const element = (
  <>
    <ParameterControls definition={definition!} values={values} onChange={() => {}} />
    <MapView definition={definition!} graph={graph} values={values} onNodeSelect={() => {}} />
  </>
);
export const filter = selectionFilter(definition!, values);
EOF2
echo '{ "compilerOptions": { "strict": true, "module": "esnext", "moduleResolution": "bundler", "target": "es2022", "jsx": "react-jsx", "noEmit": true, "skipLibCheck": false, "types": ["node"] }, "include": ["consumer.tsx", "*.d.ts"] }' >tsconfig.json
echo 'declare module "*.css";' >css.d.ts
node_modules/.bin/tsc -p .

cat >smoke.mjs <<'EOF2'
import { loadMapViewDefinitions } from 'structured-context-map-views/node';
import { MapView, parseMapViewDefinition } from 'structured-context-map-views';
const ids = loadMapViewDefinitions({ spaces: [] }, { configDir: process.cwd() }).map((d) => d.id);
if (!ids.includes('sctx-map-view://core/strategy-tree')) throw new Error(`bundled definitions missing: ${ids}`);
if (typeof MapView !== 'function' || typeof parseMapViewDefinition !== 'function') throw new Error('root exports missing');
EOF2
bun smoke.mjs
echo "package ok"
