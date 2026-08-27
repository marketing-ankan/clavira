#!/usr/bin/env bash
#
# Bring the site up locally, from a fresh clone or a half-set-up one.
# Safe to re-run: it only does the steps that are actually missing.
#
#   bash scripts/local.sh          # set up (if needed) and serve on :8801
#   bash scripts/local.sh --fresh  # also rebuild the database from seed
#
# Local runs on SQLite so there is no MySQL to install — production keeps
# using MySQL via the server's own .env, which this never touches.
#
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PORT="${PORT:-8801}"
FRESH=0
[ "${1:-}" = "--fresh" ] && FRESH=1

say() { printf '\n>> %s\n' "$*"; }

say "1/5 environment"
if [ ! -f .env ]; then
  # Same file as production, with the DB block switched to SQLite.
  sed -e 's|^DB_CONNECTION=mysql|DB_CONNECTION=sqlite|' \
      -e 's|^DB_HOST=|# DB_HOST=|' -e 's|^DB_PORT=|# DB_PORT=|' \
      -e 's|^DB_DATABASE=clavira|# DB_DATABASE=clavira|' \
      -e 's|^DB_USERNAME=|# DB_USERNAME=|' -e 's|^DB_PASSWORD=|# DB_PASSWORD=|' \
      .env.example > .env
  echo "   wrote .env (SQLite)"
else
  echo "   .env already present — left alone"
fi
grep -q '^APP_KEY=base64:' .env || php artisan key:generate --force

say "2/5 php dependencies"
if [ -f vendor/autoload.php ]; then
  echo "   vendor/ ships in the repo (Hostinger has no Composer) — nothing to do"
else
  composer install --no-interaction --prefer-dist
fi

say "3/5 database"
touch database/database.sqlite
if [ "$FRESH" = "1" ]; then
  php artisan migrate:fresh --seed --force
  php artisan db:seed --class=D2ImageSeeder --force
else
  php artisan migrate --force   # pending migrations only — never drops data
  # Seed only into an empty catalog; re-seeding a populated one duplicates it.
  products="$(php artisan tinker --execute='echo \App\Models\Product::count();' 2>/dev/null | tr -dc '0-9')"
  if [ "${products:-0}" = "0" ]; then
    php artisan db:seed --force
    php artisan db:seed --class=D2ImageSeeder --force
  else
    echo "   catalog already has ${products} products — skipping seed"
  fi
fi

say "4/5 front-end"
[ -d node_modules ] || npm install --no-audit --no-fund
npm run build

say "5/5 serving on http://127.0.0.1:${PORT}"
echo "   screenshot it with:  node scripts/preview.mjs"
exec php artisan serve --host=127.0.0.1 --port="$PORT"
