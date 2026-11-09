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

3. The tag push starts the Release workflow (`.github/workflows/release.yml`). It reruns the CI checks, publishes `packages/map-views` to npm with provenance, attests the tarball and creates a GitHub release. Watch it:
   ```
   for i in $(seq 12); do id=$(gh run list --workflow release.yml --branch "v$v" --limit 1 --json databaseId --jq '.[0].databaseId'); [ -n "$id" ] && break; sleep 5; done
   gh run watch "$id" --exit-status
   ```
   If it fails, show the user `gh run view "$id" --log-failed`. For a transient failure, offer `gh run rerun "$id" --failed`. If the code needs a fix, fix it on `main` and cut a new patch release; never move or reuse a tag.

4. Wait for the registry to serve the new version, polling for up to 5 minutes:
   ```
   for i in $(seq 20); do [ "$(npm view structured-context-map-views@$v version 2>/dev/null)" = "$v" ] && break; sleep 15; done
   npm view structured-context-map-views dist-tags
   ```
   If `latest` is not the new version after 5 minutes, stop and tell the user.

5. Schema freeze: check whether `schemas/generated/<version>/` exists. If it does, say its URLs are now frozen. If not, say the format didn't change.
