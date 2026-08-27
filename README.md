# Clavira — Fine Jewellery

Luxury jewellery e-commerce for the Indian market (NRI-ready). Lab-grown IGI-certified
diamonds and Jadau Kundan heritage in BIS-hallmarked gold.

## Stack

- **Backend:** Laravel 12 (PHP 8.2+), MySQL
- **Frontend:** React 19 + Vite 7 SPA, Tailwind CSS 4, Framer Motion
- **Payments:** Razorpay (behind a gateway abstraction; Stripe/PayPal-ready for NRI)

## Local setup

```bash
bash scripts/local.sh          # env + database + assets, then serves on :8801
bash scripts/local.sh --fresh  # same, but rebuilds the database from seed
```

The script is re-runnable and only does the steps that are missing. It defaults to
**SQLite**, so there is no MySQL to install locally; production keeps using MySQL
through the server's own `.env`. Set `RAZORPAY_*` in `.env` if you need live
payments — checkout runs in demo mode until you do.

Screenshot the running site (handy on a machine with no browser):

```bash
node scripts/preview.mjs                    # a default set of pages
node scripts/preview.mjs /product/<slug>    # specific paths, --mobile for 390px
```

## Deploying

```bash
bash scripts/ship.sh "what changed"
```

Merges the current branch into `main` and pushes; the Hostinger cron deploys from
there. Full detail — including how to check a release landed — in
`docs/ADMIN-ACCESS-AND-DEPLOY.md` §6.

## Key features

- 7 categories + 10 curated "Edits"; ~93 products, 1,296 configurator variants
- Angara-style product configurator (metal / purity / diamond type / size)
- Cart + checkout with Razorpay (demo mode until live keys are set) and 3% GST
- Live gold-rate ticker; IGI/BIS certificate verification
- Craftsmanship, NRI, and Bridal landing sections

## Payment security

Card/UPI data never touches this server — Razorpay Checkout collects it client-side.
The server only creates gateway orders and verifies signatures (timing-safe HMAC),
plus a signed webhook endpoint (`/api/webhooks/razorpay`).

## Notes

- Catalog imagery is currently curated reference photography (placeholders).
  Replace with original Clavira photography before launch.
- Deploys to Hostinger shared hosting (no Composer/Node on server) — commit `vendor/`
  and `public/build/` at deploy time, mirroring the established pipeline.
