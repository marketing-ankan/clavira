#!/usr/bin/env bash
#
# Point the LIVE site at a new domain — WITHOUT touching the database.
# (deploy/hostinger-setup.sh runs migrate:fresh and would wipe data; never
#  use it for a domain change on a site that's already live.)
#
# Run on the Hostinger server after the domain is connected in hPanel and its
# SSL certificate has been issued:
#
#   cd ~/websites/<site-id>/public_html/laravel
#   bash deploy/set-domain.sh https://clavira.in
#
set -e

APP_URL="${1:?Usage: bash deploy/set-domain.sh https://your-domain.tld}"
DOMAIN="$(echo "$APP_URL" | sed -E 's#^https?://##; s#/.*##')"

LARAVEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$LARAVEL_DIR"
[ -f .env ] || { echo "ERROR: .env not found in $LARAVEL_DIR" >&2; exit 1; }

# Update an existing key in-place, or append it if missing. '#' delimiter so
# the URL's slashes don't need escaping.
set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s#^${key}=.*#${key}=${val}#" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

set_env APP_URL "$APP_URL"
# null => no Domain attribute on the cookie, so the session binds to whichever
# host served the page (temp host, clavira.in, or www) with no per-domain edit.
set_env SESSION_DOMAIN null

php artisan config:cache
php artisan route:cache
php artisan view:clear

echo "OK — app now points at ${APP_URL} (host ${DOMAIN})."
echo "Open ${APP_URL} to confirm. If www should share sessions, set SESSION_DOMAIN=.${DOMAIN} instead."
