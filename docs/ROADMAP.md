# Clavira — Roadmap & Phases

_Last updated: 2026-07-15_

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

---

## Partially done

### Phase 7 — Content & brand finalisation 🟡
- [x] Policy pages (shipping, returns, exchange, privacy, terms)
- [x] Real Clavira logo + favicon
- [ ] **Original product photography** (client) — current imagery is curated placeholders
- [ ] **Final prices & SKUs** sign-off (client)
- [ ] Legal review of policy copy (client)

### Phase 15 — Deploy to Hostinger 🟡
- [x] Live on a **temporary Hostinger domain**
- [x] Deploy scripts + `vendor/`/`public/build` shipping via git
- [ ] Point the **real domain**; confirm cron auto-pull
- [ ] Production `.env` (Razorpay keys, SMTP creds, `ADMIN_OWNERS`/`ADMIN_ALLOWED_DOMAINS`), SSL

---

## Remaining

### Phase 10 — Payments go-live ⛔ (needs live keys)
- [ ] Live Razorpay keys in server `.env`; enable `RAZORPAY_ENABLED`
- [ ] Webhook URL + secret in Razorpay dashboard; live UPI/card/netbanking tests
- [ ] Refund / cancellation flow; order-confirmation emails (email pipeline already built)

### Phase 11 — Engagement & conversion 🔷 (in progress)
- [ ] WhatsApp enquiry button
- [ ] Product reviews & ratings (moderated)
- [ ] Consultation / appointment booking (bridal & bespoke)
- [ ] Newsletter capture, made-to-order request flow

### Phase 12 — SEO, performance & PWA ⬜
- [ ] Meta tags / sitemap / Product structured data
- [ ] Image tuning (srcset/WebP), Lighthouse pass, installable PWA
- [ ] Analytics (GA4 / Meta Pixel) + consent banner

### Phase 13 — NRI activation ⬜ (architecture already in place)
- [ ] Multi-currency display; international shipping rates + duties messaging; country tax

### Phase 14 — QA, accessibility & security ⬜/🟡
- [x] Admin security hardened + threat-tested
- [ ] Full accessibility pass (WCAG AA); automated cart/checkout/verify tests; cross-browser QA

### Phase 16 — Post-launch ⬜
- [ ] Monitoring, backups; automated IBJA gold-rate fetch; ongoing iteration

---

## Blocked on you (summary)

| Need | Unblocks |
|---|---|
| Original product photography + final prices/SKUs | Phase 7 (launch quality) |
| Live Razorpay keys | Phase 10 (real payments) |
| Real domain + SMTP mailbox credentials | Phase 15 (go-live) + email delivery |

**Buildable now without client input:** Phases 11 (engagement), 12 (SEO/PWA), 13 (NRI), 14 (accessibility/tests).
