#!/usr/bin/env bash
#
# Ship the current work branch to main. The Hostinger cron picks main up on
# its next tick and deploys it — this script is the only thing that should
# ever move main.
#
#   bash scripts/ship.sh                      # merge current branch -> main, push
#   bash scripts/ship.sh "release note"       # same, with a merge-commit message
#
# Why a script and not a plain `git push`: the server has no Node, so the
# built front-end has to travel in the commit. Anything that pushes main
# without a fresh `npm run build` ships new PHP against stale JS/CSS, and the
# live site silently keeps showing the old interface. This rebuilds first,
# every time, and refuses to push if the tree is not clean.
#
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MSG="${1:-}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

die() { printf '\n!! %s\n' "$*" >&2; exit 1; }
say() { printf '\n>> %s\n' "$*"; }

[ "$BRANCH" = "main" ] && die "You are on main. Work on a branch; this script merges it in."

# Uncommitted source edits are the caller's to resolve — shipping half a change
# is worse than not shipping. Built assets are excluded: we rebuild them below.
if [ -n "$(git status --porcelain -- . ':(exclude)public/build')" ]; then
  git status --short -- . ':(exclude)public/build'
  die "Uncommitted changes above. Commit them first, then ship."
fi

say "1/4 rebuilding front-end assets"
[ -d node_modules ] || npm install --no-audit --no-fund
npm run build
[ -f public/build/manifest.json ] || die "build produced no manifest — aborting"

if [ -n "$(git status --porcelain -- public/build)" ]; then
  git add public/build
  git commit -m "Rebuild front-end assets for deploy"
  echo "   committed refreshed assets"
else
  echo "   assets already current"
fi

say "2/4 pushing $BRANCH"
git push -u origin "$BRANCH"

say "3/4 merging into main"
git fetch origin main
git checkout main
git merge --ff-only origin/main            # local main mirrors the remote
if ! git merge --ff-only "$BRANCH" 2>/dev/null; then
  git merge --no-ff "$BRANCH" -m "${MSG:-Merge $BRANCH into main}"
fi

say "4/4 pushing main"
git push origin main
SHA="$(git rev-parse --short HEAD)"
git checkout "$BRANCH"

cat <<DONE

main is now at $SHA — the Hostinger cron deploys it on its next run.

Check it landed (give the cron a minute or two):
  https://olivedrab-butterfly-264768.hostingersite.com/images/deploy-status.txt
     "deployed $SHA... at <time>"  -> live
     an older sha, or a stale "cron last ran" -> not deployed yet
     a "FAILED ..." line            -> the deploy rolled back; read it
DONE
