Structured Context Navigator: navigating structured-context spaces through **map views**. Read `docs/Briefing.md` (what and why), `docs/Plan.md` (phases, build-quality stance, shortcuts register) and `docs/Decision Log.md` before design work.

## Layout

- `src/map-views/core`: framework-agnostic. Map view definitions, the space index and projections such as the tree. No React, DOM, Node or runtime structured-context imports (type-only is fine); `tests/module-boundaries.test.ts` enforces this.
- `src/map-views/layouts`: React components and the SVG edge overlay. Don't import host code from here.
- `src/navigator`: the standalone host (Vite app plus a dev-server middleware calling the sctx API).
- `map-views/*.json5`: map view definitions, matched to spaces by schema `$id`.
- `src/map-views/core/schemas/*.ts`: the definition format's JSON Schemas (`as const`), the source of truth. Types derive from them (`FromSchema`); `bun run generate:schemas` writes `schemas/generated/*.json`, and a test fails if those are stale. Use absolute `sctx-map-view://…` refs: `FromSchema` doesn't resolve relative refs inside referenced schemas.
- The Obsidian plugin is the second host. It consumes the library build (`bun run build:map-views`) through a `file:` dependency.

## Checks

```bash
bun test && bun run typecheck && bun run lint
bun run build:map-views   # needed before building the Obsidian plugin
```

Mark shortcuts with `PROTOTYPE:` and add them to the shortcuts register in `docs/Plan.md`.

## Running and verifying in a browser

- `bun run dev --port <port>` runs Vite under Bun. That's intentional: structured-context targets Bun or a bundler.
- Spaces come from the structured-context config. The repo's `SCTX_CONFIG=config.json` is relative and fails from this folder. Run with `env -u SCTX_CONFIG` to use the global config, which includes the `playbook` and personal spaces, or pass an absolute path.
- In a Chrome tab driven by an agent, the tab is usually hidden (`document.visibilityState === "hidden"`). Hidden tabs run no `ResizeObserver` or `requestAnimationFrame` callbacks, so edge redraws on resize can't be checked there. Taking a screenshot forces a frame, and DOM measurements remain reliable.
- React-controlled `<select>`s need the native value setter plus a bubbling `change` event when driven from script.
- Check edge alignment by comparing each `svg path`'s endpoint with the centre of its target card.

## Styling

Utilities are Tailwind with the `mv` prefix and no preflight. They are deliberately unlayered, because host CSS outside a cascade layer beats anything inside one. Avoid native elements that hosts style globally (e.g. `<button>`; cards are `div role="button"`). Hosts theme through the `--mv-color-*` variables.
