# Clavira — Fine Jewellery

Luxury jewellery e-commerce for the Indian market (NRI-ready). Lab-grown IGI-certified
diamonds and Jadau Kundan heritage in BIS-hallmarked gold.

## Stack

- **Backend:** Laravel 12 (PHP 8.2+), MySQL
- **Frontend:** React 19 + Vite 7 SPA, Tailwind CSS 4, Framer Motion
- **Payments:** Razorpay (behind a gateway abstraction; Stripe/PayPal-ready for NRI)

## Local setup

```bash
composer install
npm install
cp .env.example .env        # then set DB + (optional) Razorpay keys
php artisan key:generate
php artisan migrate --seed                    # catalog seeded from the brochure
php artisan db:seed --class=D2ImageSeeder     # promote curated photography
npm run build                # or: npm run dev
php artisan serve --port=8801
```

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
