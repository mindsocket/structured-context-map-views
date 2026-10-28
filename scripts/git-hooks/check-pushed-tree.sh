#!/usr/bin/env bash
# Runs lint, typecheck and tests against the commits being pushed rather than the
# working tree, so uncommitted work in progress can neither mask a problem nor block
# a good push.
#
# The checks run in a detached worktree at HEAD, created in a temp directory, with the
# workspace's node_modules directories symlinked in. A linked worktree nested inside the
# main checkout has none of its own, so fall back to the main checkout's.
#
# Lefthook does not forward git's pre-push stdin, so the pushed ref is taken as
# HEAD. Pushing a ref other than the current branch checks HEAD instead.
set -uo pipefail

root="$(git rev-parse --show-toplevel)" || exit 1
cd "$root" || exit 1

tmp="$(mktemp -d)"
wt="$tmp/pushed-tree"
cleanup() {
  git -C "$root" worktree remove --force "$wt" >/dev/null 2>&1
  git -C "$root" worktree prune >/dev/null 2>&1
  rm -rf "$tmp"
}
trap cleanup EXIT

if ! git worktree add --detach "$wt" HEAD >/dev/null 2>&1; then
  echo "could not create a worktree for the pushed commits; skipping checks"
  exit 0
fi

main_root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
if [ ! -d "$root/node_modules" ] && [ ! -d "$main_root/node_modules" ]; then
  echo "no node_modules found (run bun install); skipping checks"
  exit 0
fi
# A stale node_modules (installed before a lockfile change) fails or passes with
# tool versions the pushed code doesn't expect. Refresh it first; a no-op install
# is quick.
if ! bun install --frozen-lockfile >/dev/null 2>&1; then
  echo "bun install --frozen-lockfile failed; fix dependencies before pushing"
  exit 1
fi

# Workspaces keep their dependencies in per-package node_modules directories.
for rel in . packages/map-views apps/navigator; do
  src="$root/$rel/node_modules"
  [ -d "$src" ] || src="$main_root/$rel/node_modules"
  [ -d "$src" ] && ln -s "$src" "$wt/$rel/node_modules"
done
cd "$wt" || exit 1

status=0
echo "checking $(git rev-parse --short HEAD), not the working tree"

bun run lint || status=1
bun run typecheck || status=1
bun run test || status=1

exit "$status"
