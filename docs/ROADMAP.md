# Clavira — Roadmap & Phases

_Last updated: 2026-07-16_

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
| SMTP mailbox credentials in server `.env` (mailbox in hPanel, e.g. noreply@clavira.in) | Email delivery (invites, login alerts, order emails) |

**Buildable now without client input:** Phases 12 (SEO/PWA), 13 (NRI), 14 (accessibility/tests), 16 (monitoring/backups).
