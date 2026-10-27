# structured-context-map-views

Declarative map views of structured-context spaces: the definition format, the rendering library and the navigator app. Review [docs/concepts.md](docs/concepts.md) before new work and use its terms in code, tests, comments and docs.

## Layout

- `src/map-views/core`: framework-agnostic. Definitions, parameters, graph helpers and the projections. No React, DOM, Node or runtime structured-context imports (type-only is fine); `tests/module-boundaries.test.ts` enforces this.
- `src/map-views/layouts`: React components and the SVG edge overlay. Don't import host code from here.
- `src/map-views/node`: Node-only definition discovery (`loadMapViewDefinitions`), shipped as its own entry point. Core and layouts must not import it.
- `src/navigator`: the standalone host (Vite app plus dev-server middleware calling the structured-context API).
- `map-views/*.json5`: definitions bundled here, only for structured-context's bundled schemas (`$id` `sctx-map-view://core/<name>`). Plugins ship their own; personal ones go in a `map-views/` folder next to the structured-context config.
- `src/map-views/core/schemas/*.ts`: the definition format's JSON Schemas (`as const`), the source of truth. Types derive from them (`FromSchema`); `bun run generate:schemas` writes `schemas/generated/latest/`, and a test fails if those are stale; `--release` (run when cutting a release) also freezes `schemas/generated/<version>/` if the format changed. `$id`s are the published https URLs (`schema-url.ts`). Use absolute `${SCHEMA_URL}/…` refs: `FromSchema` doesn't resolve relative refs inside referenced schemas.
- `samples/launch-playbook/`: a public sample space. `tests/fixtures/launch-playbook.json` is captured from it with `bun scripts/capture-fixtures.ts launch-playbook=samples/launch-playbook/.sctx.json`.
- The Obsidian plugin is the second host. It consumes the library build (`bun run build:map-views`) through a `file:` dependency.

## Checks

```bash
bun test && bun run typecheck && bun run lint
bun run build:map-views   # needed before building the Obsidian plugin
```

## Ways of working

- **Simple, not sloppy.** Prefer the smallest design that does the job over speculative generality. Untagged code is expected to be at production standard for its scope.
- **Mark the loose parts.** Where careful review is traded for speed, say so in place with a `PROTOTYPE:` comment explaining the shortcut and what a proper treatment needs. `grep -rn PROTOTYPE: src` is the register.
- **Last responsible moment.** Don't add intermediate structures, grammars, limits or presets until a concrete need forces them.
- **No private data.** This repo will be public. Fixtures, samples and definitions must come from public or synthetic spaces.
- Work and open questions are tracked as GitHub issues on this repo.

## Definition of done

Review and update with any change:

| Change | Check |
|---|---|
| Definition format (`core/schemas`) | `docs/definitions.md`; regenerated `schemas/generated/`; definitions in `map-views/` |
| New or renamed term | `docs/concepts.md` |
| Exports or component props | `docs/api.md` |
| Module structure, rendering, styling | `docs/architecture.md`, this file |
| Anything user-visible | `README.md` (kept short; detail goes in `docs/`) |

Docs describe what the code does now. Decision history and plans don't go in docs.

## Running and verifying in a browser

- `bun run dev --port <port>` runs Vite under Bun. That's intentional: structured-context targets Bun or a bundler.
- Spaces come from the structured-context config. A relative `SCTX_CONFIG` inherited from another repo fails here; run with `env -u SCTX_CONFIG` to use the global config, or pass an absolute path. The fixtures are always listed as `fixture:<name>`.
- In a Chrome tab driven by an agent, the tab is usually hidden (`document.visibilityState === "hidden"`). Hidden tabs run no `ResizeObserver` or `requestAnimationFrame` callbacks, so edge redraws on resize can't be checked there. Taking a screenshot forces a frame, and DOM measurements remain reliable.
- React-controlled `<select>`s need the native value setter plus a bubbling `change` event when driven from script.
- Check edge alignment by comparing each `svg path`'s endpoint with the centre of its target card.

## Styling

Utilities are Tailwind with the `mv` prefix and no preflight. They are deliberately unlayered, because host CSS outside a cascade layer beats anything inside one. Avoid native elements that hosts style globally (e.g. `<button>`; cards are `div role="button"`). Hosts theme through the `--mv-color-*` variables.
