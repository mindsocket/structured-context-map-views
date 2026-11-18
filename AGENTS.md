# structured-context-map-views

Declarative map views of structured-context spaces: the definition format, the rendering library and the navigator app.

Before new work, read [docs/concepts.md](docs/concepts.md) for the terms (and the layout's section of [docs/layouts.md](docs/layouts.md) when working on one layout) and [docs/architecture.md](docs/architecture.md#modules) for the modules and what each may import.

## Checks

```bash
bun test && bun run typecheck && bun run lint
bun run test:package      # packs the library and the plugin, installs each in an empty project, typechecks a consumer and renders a page
bun run build             # the library, then the navigator
```

## Principles

- **Simple, not sloppy.** Prefer the smallest design that does the job. Don't add structures, grammars, limits or presets until a concrete need forces them.
- **One term per concept.** A thing has the same name in the definition format, the docs, comments and code. Add, rename or refine terms in `docs/concepts.md`, or in `docs/layouts.md` for a term only one layout uses. Don't rename another package's term: use structured-context's own word and type.
- **One home per fact.** Decide which doc owns a fact, state it there once, and link from elsewhere. Docs don't list what the code already lists (layouts, exports, props, files, variables): a list like that goes stale with the next change.
- **A setting's type says how many behaviours it has.** A boolean for on or off, when no third option is expected. An enum when there are two or more behaviours, each value naming one (`dag: 'repeat' | 'cross-edge'`).
- **A setting lives at the narrowest scope where it can differ and still make sense.** Per region: how that region presents its nodes (`nodes.style`, `nodes.validation`). Never in a definition: data the host supplies (such as validation results), where a definition only chooses how to show it.
- **Export only what another module imports.** A type used in one place is written inline. A type used in one file isn't exported. Derive types (from the schemas, `Parameters`, `ReturnType`, `Pick`) instead of restating a shape. When two modules need the same shape, they share one type.
- **The public surface is `src/index.ts`, `src/node/index.ts` and `src/node/html.ts`.** Add an export there only when a host needs it, and say which host.
- **Comments say what the code can't.** A reason, a constraint, a trap. Never the signature, the parameter list or the next line.
- **No barrel files.** Modules import each other directly. A small helper joins the file it serves; it gets its own file when it has several users and a concept of its own.
- **Tests assert the behaviour they name.** Derive expected values from the fixture or the code under test. Don't hard-code a list that grows with the code, and don't assert things that only happen to be true.
- **A test earns its place by proving something no other test does.** Before adding one, look for a test that already covers the behaviour. Don't re-test what a JSON Schema enforces; test the checks the schema can't express. Once an input covers a code path, another input down the same path adds nothing. Don't assert what the test's own config makes true.
- **Mark the loose parts.** Where careful review is traded for speed, say so in place with a `PROTOTYPE:` comment giving the shortcut and what a proper treatment needs. `grep -rn PROTOTYPE: packages apps` is the register. Untagged code is at production standard for its scope.
- **Fix the pattern, not the line.** When a review comment names a habit, search for every instance before replying, and check the result before saying it's fixed.
- **No private data.** This repo is public. Fixtures, samples and definitions come from public or synthetic spaces.

Work and open questions are tracked as GitHub issues on this repo.

## Adding a layout

A layout is a folder in `packages/map-views/src/core/layouts/<name>/` (`schema.ts`, and `projection.ts` only when deciding what is shown takes logic of its own) and a component in `src/components/`. It is registered in two lists: `core/layouts/schemas.ts` (its schema, and a check for any rule the schema can't express) and `LAYOUTS` in `components/MapView.tsx`. The definition format and the `LayoutConfig<'name'>` type follow from the first. It is documented in `docs/layouts.md` only. A projection decides what is shown; positions, sizes and anything a layout library computes belong in the component.

## Generated files

- `schemas/generated/latest/` comes from the schemas in `core/schema/` and each layout's `schema.ts` (`bun run generate:schemas`). Use absolute `${SCHEMA_URL}/…` refs there: `FromSchema` doesn't resolve relative refs inside referenced schemas. Never edit the frozen `schemas/generated/<version>/` folders or run `generate:schemas --release` by hand.
- `packages/map-views/src/node/bundled-definitions.ts` comes from `packages/map-views/map-views/*.json5` (`bun run generate:definitions`).
- `packages/map-views/tests/fixtures/` is captured from spaces; see its README.

Tests fail when the first two are stale.

## Releases

Releases go through the `/release <major|minor|patch>` skill. Its tag push runs `.github/workflows/release.yml`, which publishes both packages to npm.

## Definition of done

Review and update with any change:

| Change | Check |
|---|---|
| Definition format (`core/schema`, `core/layouts/*/schema.ts`) | `docs/definitions.md`, or `docs/layouts.md` for layout settings; regenerated `schemas/generated/latest/`; definitions in `map-views/` |
| New or renamed term | `docs/concepts.md`; and `docs/layouts.md` for a term of one layout |
| Exports or component props | `docs/api.md` |
| Module structure, rendering, styling | `docs/architecture.md` |
| Anything user-visible | `README.md` (kept short; detail goes in `docs/`) |

Docs describe what the code does now. Decision history, plans and how things used to work don't go in docs: git history records changes, and release notes record the breaking ones.

## Running and verifying in a browser

- `bun run dev --port <port>` runs Vite under Bun. That's intentional: structured-context targets Bun or a bundler.
- Spaces come from the structured-context config. A relative `SCTX_CONFIG` inherited from another repo fails here; run with `env -u SCTX_CONFIG` to use the global config, or pass an absolute path.
- In a Chrome tab driven by an agent, the tab is usually hidden (`document.visibilityState === "hidden"`). Hidden tabs run no `ResizeObserver` or `requestAnimationFrame` callbacks, so connector redraws on resize can't be checked there. Taking a screenshot forces a frame, and DOM measurements remain reliable.
- React-controlled `<select>`s need the native value setter plus a bubbling `change` event when driven from script.
- Check connector alignment by comparing each `svg path`'s endpoint with the centre of its target card.

## Styling

Utilities are Tailwind with the `mv` prefix and no preflight, and deliberately unlayered. Avoid native elements that hosts style globally (e.g. `<button>`; cards are `div role="button"`). Hosts theme through the `--mv-color-*` variables.
