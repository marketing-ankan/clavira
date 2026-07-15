# Clavira — Roadmap & Phases

_Last updated: 2026-07-15_

Legend: ✅ done · 🔷 next up · ⬜ planned · ⛔ blocked on client input

For detail on completed work, see [BUILD-LOG.md](BUILD-LOG.md).

---

## Completed

| # | Phase | Status |
|---|---|---|
| 0 | **Discovery & stack** — brochure + reference analysis, stack confirmed | ✅ |
| 1 | **Foundation** — Laravel 12 + React 19 + Vite + Tailwind, MySQL, 13-table schema | ✅ |
| 2 | **Catalog data** — 7 categories, 10 Edits, ~93 products, 1,296 variants, 73 certs | ✅ |
| 3 | **Storefront UI** — all pages, luxury design system, responsive 360–2560 | ✅ |
| 4 | **Commerce core** — cart, checkout, Razorpay abstraction, orders, GST, webhook | ✅ |
| 5 | **Imagery v1** — curated 146 clean images swapped into catalog | ✅ |
| 6 | **Version control** — initial commit | ✅ |

---

## Remaining

### Phase 7 — Content & brand finalisation ⛔ (needs client input)
The single most important pre-launch phase.
- [ ] **Original product photography** to replace reference placeholders
- [ ] Real product list, SKUs, and **pricing sign-off** (current prices are indicative)
- [ ] Final brand copy review (taglines, product descriptions, policy pages)
- [ ] Logo/brand assets (favicon, OG images), legal pages (T&C, privacy, returns, shipping)

### Phase 8 — Admin panel 🔷 (recommended next)
So staff manage the store without code.
- [ ] Product / variant / image CRUD
- [ ] Order management (status, fulfilment, invoice)
- [ ] Enquiry inbox, certificate management, gold-rate update
- [ ] Admin auth + roles
- _Approach: Filament admin (fast) or a custom React admin._

### Phase 9 — Customer accounts ⬜
- [ ] Register / login (schema already present)
- [ ] Order history & tracking
- [ ] **Wishlist UI** (table already exists)
- [ ] Saved addresses (schema ready)

### Phase 10 — Payments go-live ⛔ (needs live keys)
- [ ] Live Razorpay keys in server `.env`; enable `RAZORPAY_ENABLED`
- [ ] Configure webhook URL + secret in Razorpay dashboard
- [ ] Live test transactions (UPI / card / netbanking)
- [ ] Refund / cancellation flow
- [ ] Order-confirmation emails/SMS

### Phase 11 — Engagement & conversion ⬜
- [ ] **WhatsApp enquiry button** (high value for jewellery)
- [ ] Appointment / virtual-consultation booking
- [ ] Product reviews & ratings
- [ ] Newsletter capture, "notify me", recently-viewed
- [ ] Custom-design / made-to-order request flow

### Phase 12 — SEO, performance & PWA ⬜
- [ ] Server-rendered meta tags / sitemap / structured data (Product schema)
- [ ] Image lazy-loading polish, `srcset`/WebP, Lighthouse pass
- [ ] Installable PWA + offline shell (mirrors IndiaTutors)
- [ ] Analytics (GA4 / Meta Pixel) + consent banner

### Phase 13 — NRI activation ⬜ (architecture already in place)
- [ ] Multi-currency display (USD/GBP/AED/…)
- [ ] International shipping rates + duties/customs messaging
- [ ] Country-based tax handling, geo currency default

### Phase 14 — QA, accessibility & security ⛔/⬜
- [ ] Full responsive + cross-browser QA
- [ ] Accessibility pass (WCAG AA)
- [ ] Security review (input validation, rate limiting, headers, payment edge cases)
- [ ] Automated tests for cart/checkout/verify

### Phase 15 — Deploy to Hostinger ⛔ (needs remote + domain)
- [ ] Provide Hostinger git remote / SSH + domain (or temp subdomain)
- [ ] Commit `vendor/` + `public/build/` (server has no Composer/Node)
- [ ] dev → main → cron auto-pull pipeline (mirrors IndiaTutors)
- [ ] Production `.env`, `APP_KEY`, SSL, DB migrate + seed on server
- [ ] Smoke test on live domain → go-live

### Phase 16 — Post-launch ⬜
- [ ] Uptime + error monitoring, DB backups
- [ ] Gold-rate automation (IBJA fetch via cron)
- [ ] Iterate on analytics, add collections/campaigns

---

## Blocked on you (summary)

| Need | Unblocks |
|---|---|
| Original product photography + final prices/SKUs | Phase 7 (launch quality) |
| Live Razorpay keys | Phase 10 (real payments) |
| Hostinger git remote/SSH + domain | Phase 15 (deploy) |

## Suggested order

**Phase 8 (Admin)** → **Phase 9 (Accounts + Wishlist)** → **Phase 11 (WhatsApp/engagement)**
can all proceed **now** without client inputs. Phases 7/10/15 run in parallel as you supply
photography, keys, and hosting.
