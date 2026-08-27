# Clavira — working notes for Claude

Luxury jewellery storefront: Laravel 12 API + React 19 SPA, deployed to Hostinger
shared hosting. See `README.md` for the stack and `docs/ADMIN-ACCESS-AND-DEPLOY.md`
for admin access and server details.

## The working agreement

**Local first, then main on request.** Every change is built and reviewed locally.
Nothing reaches the live site until the owner says "push to main" (or equivalent) —
main is the deploy trigger, so pushing it *is* releasing.

1. Work on a branch (never commit directly to `main`).
2. Make the change, run it locally, and show screenshots.
3. Wait. Only on an explicit go-ahead: `bash scripts/ship.sh`.

## Running it locally

```bash
bash scripts/local.sh            # set up if needed, then serve on :8801
bash scripts/local.sh --fresh    # also rebuild the DB from seed
```

Local uses **SQLite** (`database/database.sqlite`) so there is no MySQL to install.
Production stays on MySQL through the server's own `.env`, which nothing here touches.

## Showing the change

The dev box has no browser, so review happens through screenshots:

```bash
node scripts/preview.mjs                       # home, a category, collections, craftsmanship
node scripts/preview.mjs /product/some-slug    # specific pages
node scripts/preview.mjs --mobile /            # 390px viewport
node scripts/preview.mjs --retina /            # 2x PNG when detail matters
```

Images land in `storage/app/preview/` (gitignored) — JPEGs by default, because
retina full-page shots run to double-digit megabytes and will not attach. Send
them to the owner: a described change is not a reviewed change. Two caveats:

- Sections fade in on scroll (`Reveal.jsx`), so the script scrolls the whole page
  before shooting. If a band comes out blank, the reveal did not fire — re-run.
- Google Fonts is usually blocked from this sandbox, so the display serif falls
  back to a system font in previews. It renders correctly on the live site.

## Shipping to main

```bash
bash scripts/ship.sh ["merge note"]
```

It rebuilds the front-end, commits the built assets, merges the branch into main
and pushes. The Hostinger cron pulls main on its next tick and deploys.

**Why the script and not `git push`:** the server has no Node and no Composer, so
`vendor/` and `public/build/` travel *in the repo*. Pushing PHP changes without a
fresh `npm run build` ships new backend code against stale JS/CSS, and the live
site keeps showing the old interface with no error anywhere. Always ship through
the script.

## Checking a release landed

`https://<site>/images/deploy-status.txt` — written by the deploy itself:

```
deployed <sha> at <when>      <- the commit actually live
cron last ran <when>          <- updated every tick, so a stale line means dead cron
FAILED ...                    <- only present when a deploy was rolled back
```

The full deploy log is at `/ops/<OPS_LOG_KEY>/deploy-log`, and only when
`OPS_LOG_KEY` is set in the **server** `.env`. This repo is public — never commit
a value for it.

## Things that will bite

- **`vendor/` and `public/build/` are committed on purpose.** Not a mistake, do
  not "clean them up" — they are how the code reaches a server with no toolchain.
- **Never force-push or rewrite `main`.** The deploy pulls with `--ff-only` and a
  rewritten history stops it dead.
- **Never commit `.env`.** Real keys (Razorpay, SMTP, `OPS_LOG_KEY`) live only on
  the server.
- **Migrations run automatically on deploy.** A migration that fails rolls the live
  site back to the previous commit (see `deploy/hostinger-deploy.sh`) and retries
  every tick until it is fixed — so test migrations locally before shipping.
- **`deploy/hostinger-deploy.sh` git-pulls itself mid-run.** Its whole body sits
  inside `{ ... }` so bash parses the file before executing. Keep the braces.
- Catalog imagery is placeholder reference photography, pending real Clavira shots.
