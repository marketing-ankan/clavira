# Clavira — Roadmap & Phases

_Last updated: 2026-07-29_

Legend: ✅ done · 🟡 partially done · 🔷 next up · ⬜ planned · ⛔ blocked on client input

For detail on completed work, see [BUILD-LOG.md](BUILD-LOG.md).

---

## Completed

| # | Phase | Status |
|---|---|---|
| 1 | **Foundation & database** — Laravel 12 + React 19 + Vite + Tailwind, MySQL, 13-table schema | ✅ |
| 2 | **Catalog data** — 7 categories, 10 Edits, ~93 products, 1,296 variants, 73 certs | ✅ |
| 3 | **Storefront UI** — all pages, luxury design system, responsive 360–2560 | ✅ |
| 4 | **Commerce core & payments** — cart, checkout, Razorpay abstraction (demo mode), orders, GST, webhook | ✅ |
| 5 | **Imagery (v1)** — curated 146 clean images (placeholders) | ✅ |
| 6 | **Version control** — Git repo, GitHub remote, dev + main branches | ✅ |
| 8 | **Admin panel** — dashboard, product/order/enquiry/gold-rate/certificate management | ✅ |
| 8+ | **Admin access control** — owner allowlist + invite-only creation, hardened gate, threat-tested | ✅ |
| 8+ | **SMTP email pipeline** — branded Mailable, resilient send, `clavira:mail-test` command | ✅ |
| 9 | **Customer accounts & wishlist** — register/login, order history, addresses, wishlist (guest→login merge) | ✅ |
| 11 | **Engagement & conversion** — WhatsApp button, moderated reviews & ratings, consultation booking, newsletter capture + admin moderation pages | ✅ |
| 12 | **SEO, performance & PWA** — server-rendered per-route meta/canonical/OG, sitemap.xml + robots route, Product/Breadcrumb/Organization JSON-LD, installable PWA, consent-gated GA4 + Meta Pixel | ✅ |
| 16 | **Backups & monitoring** — `clavira:backup` (nightly, gzipped, 14-day retention, owner alert on failure), `/api/health` for uptime pingers, automated gold-rate fetch | ✅ |
| 15 | **Deploy & go-live** — LIVE at **clavira.in** (SSL incl. www); cron auto-pull from `main` every 5 min; session/CSRF fixed for the real domain; production `.env` (APP_URL, ADMIN_OWNERS); 3 owner logins set & verified; legacy default admin revoked | ✅ |

---

## Partially done

### Phase 7 — Content & brand finalisation 🟡
- [x] Policy pages (shipping, returns, exchange, privacy, terms)
- [x] Real Clavira logo + favicon
- [ ] **Original product photography** (client) — current imagery is curated placeholders
- [ ] **Final prices & SKUs** sign-off (client)
- [ ] Legal review of policy copy (client)

---

## Remaining

### Phase 10 — Payments go-live ⛔ (needs live keys)
- [ ] Live Razorpay keys in server `.env`; enable `RAZORPAY_ENABLED`
- [ ] Webhook URL + secret in Razorpay dashboard; live UPI/card/netbanking tests
- [ ] Refund / cancellation flow; order-confirmation emails (email pipeline already built)

### Phase 13 — NRI activation ⬜ (architecture already in place)
- [ ] Multi-currency display; international shipping rates + duties messaging; country tax

### Phase 13 — NRI activation ✅ (2026-07-29)
- [x] Multi-currency display (7 markets, daily keyless FX, "≈ AED 1,890 · indicative" hints; charging stays INR)
- [x] International shipping rates (config/countries.php, flat INR per market — placeholder figures pending courier quotes)
- [x] Country-aware tax: GST only for India; exports zero-rated with a duties note at checkout

### Phase 14 — QA, accessibility & security 🟡
- [x] Admin security hardened + threat-tested
- [x] **Accessibility pass (WCAG AA)** — button/text contrast fixed to AA, skip link,
      pause controls on both auto-advancing regions (2.2.2 Level A), off-screen carousel
      slides made `inert`, accessible names on every control, misleading tab ARIA removed
- [x] Responsive sweep 360–2560px re-verified; root `overflow-x: clip` kills the
      scroll-reveal overflow that gave the home page ~24px of horizontal scroll under 1024px
- [x] **Automated test suite** — 39 tests / 169 assertions on sqlite :memory: (checkout incl. guest-block
      + export pricing, refunds/cancellation, password reset, invoices, admin gate, gold-rate freshness,
      FX, SEO shell, health, certificate verify, wishlist merge). Run with `php artisan test`
      (never `config:cache` first). The suite already caught one real bug: the password-reset
      admin guard ran after the broker had saved the new password
- [ ] Cross-browser QA (Safari/iOS in particular)

### Phase 17 — GST invoice PDF ✅ (2026-07-29)
- [x] barryvdh/laravel-dompdf; branded TAX/EXPORT INVOICE with HSN 7113, CGST/SGST vs IGST split
      by buyer state, zero-rated exports, fiscal-year number series (CLV-INV-2627-000001),
      customer + admin download buttons. Watermarked PROVISIONAL until `SELLER_GSTIN` is set —
      fill the SELLER_* env vars before real orders. **Deploy note: commit the vendor/ diff.**

### Fixed 2026-07-29 (second pass)
- **Checkout now requires an account** — guests could previously place orders no one could ever
  see again. The guest cart survives sign-in; checkout bounces to `/account/login?next=/checkout`.
- **Gold rate is live** — the ticker was showing a static seeded ₹7,502/g. Now fetched from a
  keyless feed (goldprice.org, ₹12,406/g today) with a lazy self-heal on every rate read, an
  hourly-cooldown lock, and the 20% sanity guard intact.

---

## Blocked on you (summary)

| Need | Unblocks |
|---|---|
| Original product photography + final prices/SKUs | Phase 7 (launch quality) |
| Live Razorpay keys | Phase 10 (real payments) |
| SMTP mailbox credentials in server `.env` (mailbox in hPanel, e.g. noreply@clavira.in) | Email delivery (invites, login alerts, order emails) |

**Buildable now without client input:** the automated test suite, the GST invoice PDF, and
Phase 13 (NRI multi-currency).

**Two live-site defects fixed on 2026-07-29:** the order-success page promised a confirmation
email that was never sent (no `OrderPlacedMail` existed), and customers had no password-reset
path at all (broker configured, no route or controller). Refunds and cancellation also went in —
previously an admin could change an order's status but could not return a customer's money.
