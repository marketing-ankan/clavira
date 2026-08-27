#!/usr/bin/env bash
#
# Ongoing auto-deploy for Hostinger, run by cron.
# Pulls main; if the live tree is not already at that commit, applies
# migrations, refreshes the built assets at the web root, and rebuilds
# caches. No Composer or Node needed (vendor/ and public/build ship in
# the repo).
#
# Cron command:
#   /bin/bash /home/USER/websites/SITE/public_html/laravel/deploy/hostinger-deploy.sh
#
# SELF-PULL SAFETY: this script git-pulls itself mid-run. Bash reads a script
# lazily, by byte offset, so a plain top-to-bottom script can be misparsed the
# moment it rewrites itself. Wrapping the whole body in { ... } forces bash to
# read and parse every byte before running any of it, and the exit inside the
# block means it never seeks back into the file. Keep the braces.
{
set -e
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

LARAVEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCROOT="$(dirname "$LARAVEL_DIR")"
cd "$LARAVEL_DIR"

# Log to file here (Hostinger's cron field rejects shell redirects). Trim
# before opening it: this runs every few minutes forever, and an unbounded
# log on shared hosting eventually becomes someone's disk-quota problem.
LOG="$LARAVEL_DIR/storage/logs/deploy.log"
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 2000 ]; then
  tail -n 500 "$LOG" > "$LOG.trim" && mv "$LOG.trim" "$LOG"
fi
exec >> "$LOG" 2>&1

# The commit this server last deployed *completely*, plus when. This — not
# git HEAD — is what decides whether there is work to do, so a run that dies
# half-way (failed migrate, killed process) is retried on the next tick
# instead of being silently skipped because the pull already moved HEAD.
STAMP="$LARAVEL_DIR/storage/app/deployed-sha"
# Readable from the web via the docroot images symlink, so "did my push go
# live?" is one URL away. Deliberately boring: commit sha and timestamps only.
STATUS="$LARAVEL_DIR/public/images/deploy-status.txt"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

stamp_sha()  { cut -d' ' -f1  < "$STAMP" 2>/dev/null || true; }
stamp_when() { cut -d' ' -f2- < "$STAMP" 2>/dev/null || true; }

publish_status() {   # $1 = optional extra line (e.g. a failure note)
  local sha when
  sha="$(stamp_sha)"; when="$(stamp_when)"
  {
    printf 'deployed %s at %s\n' "${sha:-none}" "${when:-never}"
    printf 'cron last ran %s\n' "$(date '+%F %T')"
    if [ -n "${1:-}" ]; then printf '%s\n' "$1"; fi
  } > "$STATUS" 2>/dev/null || true
}

PREV="$(git rev-parse HEAD)"
git pull --ff-only --quiet origin main   # --quiet: a no-op tick logs nothing
HEAD_SHA="$(git rev-parse HEAD)"
LAST_OK="$(stamp_sha)"

if [ "$HEAD_SHA" = "$LAST_OK" ]; then
  publish_status          # heartbeat: proves cron is alive even with no changes
  exit 0                  # nothing new, last deploy finished cleanly — stay quiet
fi

log "deploying ${LAST_OK:-<none>} -> $HEAD_SHA"

# --- migrations -------------------------------------------------------------
# The one failure that can take the store down: new code against an old schema.
# Roll the code back to the last good commit so the site keeps serving, and
# leave the stamp untouched so the next push retries from a known-good base.
if ! php artisan migrate --force; then
  ROLLBACK="${LAST_OK:-$PREV}"
  log "MIGRATE FAILED on $HEAD_SHA — rolling back to $ROLLBACK"
  git reset --hard "$ROLLBACK"
  php artisan config:cache || true
  php artisan route:cache || true
  php artisan view:clear || true
  publish_status "FAILED migrate on $HEAD_SHA, rolled back to $ROLLBACK at $(date '+%F %T')"
  exit 1
fi

# --- front-end assets -------------------------------------------------------
# Stage beside the live folder and swap, rather than delete-then-copy: a shopper
# loading the page mid-deploy would otherwise get HTML with no CSS or JS behind
# it. The swap itself is a rename, so the gap is a single filesystem operation.
rm -rf "$DOCROOT/build.new" "$DOCROOT/build.old"
cp -r "$LARAVEL_DIR/public/build" "$DOCROOT/build.new"
if [ -d "$DOCROOT/build" ]; then mv "$DOCROOT/build" "$DOCROOT/build.old"; fi
mv "$DOCROOT/build.new" "$DOCROOT/build"
rm -rf "$DOCROOT/build.old"

# Keep the images symlink in place (admin uploads + catalog)
[ -L "$DOCROOT/images" ] || { rm -rf "$DOCROOT/images"; ln -sfn "$LARAVEL_DIR/public/images" "$DOCROOT/images"; }

# --- web-root front controller ----------------------------------------------
# $DOCROOT/index.php is a path-patched copy of public/index.php (the app sits
# one level deeper here). A framework upgrade changes the original, and a
# stale copy is a white screen — so re-derive it, and only install the result
# if it still points at the app. A patch that stops matching leaves the live
# file alone rather than breaking the site.
PATCHED="$(mktemp)"
sed "s#__DIR__\.'/\.\./#__DIR__.'/laravel/#g" "$LARAVEL_DIR/public/index.php" > "$PATCHED"
if grep -q "laravel/vendor/autoload.php" "$PATCHED"; then
  if ! cmp -s "$PATCHED" "$DOCROOT/index.php"; then
    cp "$PATCHED" "$DOCROOT/index.php"
    log "refreshed web-root index.php"
  fi
else
  log "WARN: index.php no longer matches the expected shape — web root left untouched"
fi
rm -f "$PATCHED"

# --- caches -----------------------------------------------------------------
php artisan config:cache
php artisan route:cache
php artisan view:clear

# Only now is this commit really deployed.
mkdir -p "$(dirname "$STAMP")"
printf '%s %s\n' "$HEAD_SHA" "$(date '+%F %T')" > "$STAMP"
publish_status
log "deploy complete"
exit 0
}
