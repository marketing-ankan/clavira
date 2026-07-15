# Clavira — Build Log (Phase 1–6)

_Last updated: 2026-07-15 · Status: v1 storefront complete & verified locally, not yet deployed._

This document records everything built so far. For what remains, see [ROADMAP.md](ROADMAP.md).

---

## 1. Discovery & decisions

**Source material analysed**
- `CLAVIRA BROCHURE (3).pdf` (61 pages) — brand story, promises, 7 product categories, 10 special "Edits", craftsmanship narrative, NRI positioning.
- `Clavira_suggested_website links.txt` — 5 reference sites:
  - **angara.com** → product-configurator UX (metal / purity / diamond type / size / carat)
  - **hastmilap.co.in** → catalog structure + "Verify Report" certificate lookup
  - **pld.live** → lab-grown diamond positioning
  - **ibjarates.com** → live gold-rate display
  - **gjc.org.in** → industry council (trust/credibility)

**Stack chosen** (confirmed with client): Laravel + React + MySQL + Tailwind + Razorpay.
Rationale: runs natively on the existing Hostinger plan (no Node/Java server needed),
reuses the proven IndiaTutors deploy pipeline, fastest path for a CRUD+content+checkout site.

> Note: Laravel **12** was used rather than 11 — every Laravel 11 release is blocked by a
> Composer security advisory. Same framework family, patched.

---

## 2. Architecture

```
Laravel 12 (PHP 8.2)                     React 19 SPA (Vite 7)
├── routes/web.php                       ├── resources/js/
│   ├── /api/* … JSON endpoints          │   ├── App.jsx (router)
│   └── /{any} → SPA (React Router)      │   ├── store.jsx (cart context)
├── app/Http/Controllers/                │   ├── api.js (axios + CSRF)
│   ├── CatalogController                │   ├── components/ (Header, Footer,
│   ├── CartController                   │   │   CartDrawer, ProductCard, Reveal…)
│   ├── CheckoutController               │   └── pages/ (Home, Category, Product,
│   ├── CertificateController            │       Collections, Craftsmanship, NRI,
│   └── EnquiryController                │       Verify, Checkout, OrderSuccess,
├── app/Services/RazorpayGateway.php     │       Search, Contact)
├── app/Models/ (14 models)              └── Tailwind 4 + Framer Motion
└── MySQL (clavira)
```

- **SPA model:** Laravel serves a single Blade shell; React Router owns all non-`/api` routes.
- **State:** cart lives in a React context, persisted server-side by session token.
- **Design system:** charcoal / ivory / champagne-gold palette, Cormorant Garamond + Jost
  typefaces, Framer Motion scroll reveals — original design, no template.

---

## 3. Database schema (13 migrations → tables)

| Group | Tables |
|---|---|
| Catalog | `categories`, `collections`, `products`, `collection_product`, `product_images`, `product_variants` |
| Commerce | `carts`, `cart_items`, `orders`, `order_items`, `payments`, `wishlist_items`, `addresses`, `enquiries` |
| Content | `certificates` (IGI/BIS verify), `gold_rates` |

**NRI-ready from day one:** prices stored in INR with a currency column, international
address schema (ISO country + phone country code), so multi-currency/shipping can switch on later.

---

## 4. Catalog data (seeded from the brochure)

- **7 categories:** Rings, Earrings, Bracelets, Bangles, Necklaces, Pendants, Pendant Sets
- **10 curated "Edits":** Diamond Bridal, Solitaire Diamond, Heritage Kundan, NRI Fusion,
  Mangalsutra & Maang Tikka, Kundan Pendant Set, Necklace Grand, Gold & Diamond Mixed,
  Marigold Ring, Golden Bangle & Bracelet
- **~93 products** with real brochure copy, **1,296 configurator variants**
  (metal × purity × diamond type, with price deltas — e.g. natural diamond ≈ +85%)
- **73 IGI certificates** for the certificate-verification feature
- Gold-rate seed (manual fallback, INR/gram by purity)

---

## 5. Storefront pages (all built & verified)

| Page | Highlights |
|---|---|
| **Home** | Cinematic hero, category grid, featured pieces, Jadau heritage band, gold/diamond promise blocks, Edits rail, NRI band |
| **Category (PLP)** | Filters (diamond type), sort, pagination |
| **Product (PDP)** | **Angara-style configurator** (metal swatches, 14/18/22kt, lab-grown↔natural, ring size), live price recalculation, gallery, certification/shipping accordions, related products |
| **Collections / Edit** | Grid of Edits + per-Edit product pages |
| **Craftsmanship** | CAD/CNC/laser/finishing story from the brochure, atelier gallery |
| **NRI** | Global-Indian positioning, shipping assurance, NRI Fusion Edit |
| **Verify Certificate** | IGI/BIS lookup → full verified report card |
| **Cart / Checkout / Order Success** | Slide-out cart, address form (country-aware), Razorpay, confirmation |
| **Search / Contact** | Product search, enquiry form |

**Trust signals throughout:** BIS Hallmarked · IGI Certified · VVS E–F · Zero deduction ·
98% gold return · 70% diamond return · gold-rate ticker in the header.

---

## 6. Commerce & payment security

- **Gateway abstraction** (`RazorpayGateway`): Razorpay when configured; a clearly-labelled
  **demo mode** otherwise, so the full checkout is testable before live keys exist.
  Stripe/PayPal can be added for NRI without touching checkout logic.
- **PCI posture:** card/UPI data never touches our server — Razorpay Checkout collects it
  client-side. Server only creates gateway orders and **verifies signatures (timing-safe HMAC)**.
- **Webhook:** signed `/api/webhooks/razorpay` endpoint (CSRF-exempt, HMAC-authenticated) for
  `payment.captured` / `payment.failed`.
- **Tax:** 3% GST on jewellery applied at cart/checkout.
- **Orders:** human-readable numbers (`CLV-2026-000001`), full item + address snapshots.

**Verified end-to-end:** configurator repricing, cart + GST, demo checkout →
order `CLV-2026-000003` → success page; certificate `IGI600100001` returns a full report.

---

## 7. Imagery

Two sources, both **reference/inspiration imagery** (not yet original Clavira photography):

1. **Brochure PDF** → 212 images extracted & web-optimized.
2. **Synology "Jewelry Services" → "Design 2"** (447 images the client copied to Desktop).

**Curation policy (client-approved "clean only"):** a large share of both sets carry other
jewellers' watermarks (Manubhai, Navrathan, Kalasha, PNG, Nexaro, Tanishq, supplier codes) or
are Pinterest/Instagram/WhatsApp screenshots. Those were **excluded**. From Design 2, **146
clean, unbranded shots** were hand-picked, categorised, optimised, and promoted to each
product's primary image (brochure images kept as gallery alternates).

> **Hard boundary:** competitor watermarks are never removed, and competitor photos are never
> presented as Clavira's. **Original photography is required before launch.**

---

## 8. Verification done

- Full purchase flow driven end-to-end (configurator → cart → checkout → order).
- All curated images serve (HTTP 200) and decode as valid JPEGs across every category.
- **Responsive sweep 360 → 2560px** (incl. 768 / 1024) — zero horizontal overflow on any page.
- No console errors.

## 9. Version control

- Initial commit `8f15658` on `main` (463 files).
- `.env`, `vendor/`, `node_modules/` correctly excluded; 358 catalog images committed.
- No remote configured yet (not pushed/deployed).
