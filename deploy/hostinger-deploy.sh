#!/usr/bin/env bash
#
# Ongoing auto-deploy for Hostinger, run by cron.
# Pulls main; if anything changed, applies migrations, refreshes the
# built assets at the web root, and rebuilds caches. No Composer needed
# (vendor/ ships in the repo).
#
# Cron command:
#   /bin/bash /home/USER/websites/SITE/public_html/laravel/deploy/hostinger-deploy.sh
#
# NOTE: this script git-pulls itself mid-run, so edits must be APPENDED
# (keep all earlier bytes identical) or bash may misread the running file.
set -e
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

LARAVEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCROOT="$(dirname "$LARAVEL_DIR")"
cd "$LARAVEL_DIR"

# Log to file here (Hostinger's cron field rejects shell redirects)
exec >> "$LARAVEL_DIR/storage/logs/deploy.log" 2>&1

BEFORE="$(git rev-parse HEAD)"
git pull --ff-only origin main
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  exit 0   # nothing new — stay quiet
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] deploying $BEFORE -> $AFTER"

# Apply any new migrations (safe: only runs pending ones — never fresh/refresh)
php artisan migrate --force

# Refresh built front-end assets exposed at the web root
rm -rf "$DOCROOT/build"
cp -r "$LARAVEL_DIR/public/build" "$DOCROOT/build"

# Keep the images symlink in place (admin uploads + catalog)
[ -L "$DOCROOT/images" ] || { rm -rf "$DOCROOT/images"; ln -sfn "$LARAVEL_DIR/public/images" "$DOCROOT/images"; }

# Rebuild caches against the new code
php artisan config:cache
php artisan route:cache
php artisan view:clear

echo "[$(date '+%Y-%m-%d %H:%M:%S')] deploy complete"
