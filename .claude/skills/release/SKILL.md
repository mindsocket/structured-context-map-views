---
name: release
description: Cut an npm release of the structured-context-map-views library. Use when the user asks to cut a release, publish a new version, or run /release <major|minor|patch>.
---

## Task

Cut a **$ARGUMENTS** release (major, minor, or patch) of the library in `packages/map-views`. The navigator app is private and isn't released.

1. Verify the branch is `main` and the working tree is clean. If not, stop and tell the user. `bun pm version` also refuses untracked files: if there are any, run `git stash push --include-untracked` before step 2 and `git stash pop` after it, whether step 2 passes or fails.

2. Bump the version from `packages/map-views`. This runs the checks (generators, lint, tests and the packed-package test `test:package`) and freezes `schemas/generated/<version>/` if the definition format changed. `bun pm version` skips git when run from a subfolder, so commit, tag and push yourself:
   ```
   (cd packages/map-views && bun pm version --no-git-tag-version $ARGUMENTS)
   v=$(jq -r .version packages/map-views/package.json)
   git add -A && git commit -m "v$v" && git tag -a "v$v" -m "v$v" && git push --follow-tags
   ```
   If any check fails, stop and report the errors.

3. Publish from `packages/map-views`. npm may need browser or OTP authentication that Claude cannot handle; if `npm publish` asks for it, tell the user to run this in their terminal:
   ```
   npm login && npm publish
   ```

4. Once the package is published, wait for the registry to serve the new version, polling for up to 5 minutes:
   ```
   v=$(jq -r .version packages/map-views/package.json)
   for i in $(seq 20); do [ "$(npm view structured-context-map-views@$v version 2>/dev/null)" = "$v" ] && break; sleep 15; done
   npm view structured-context-map-views dist-tags
   ```
   If `latest` is not the new version after 5 minutes, stop and tell the user.

5. Tell the user which hosts to update to the new version (the Obsidian plugin depends on the published package), and that the schema URLs under `schemas/generated/<version>/` are now frozen.
