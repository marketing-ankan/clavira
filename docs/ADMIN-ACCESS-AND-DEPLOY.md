# Clavira — Admin Access & Deployment Guide

_A practical, keep-handy reference for the owners (Dinesh & Seema) and whoever deploys._

---

## 1. The admin dashboard — where to go

| | URL |
|---|---|
| **Admin login** | `https://YOUR-DOMAIN/admin` |
| Live temp site (until the real domain is pointed) | `https://olivedrab-butterfly-264768.hostingersite.com/admin` |

Bookmark it. It is **deliberately not linked** anywhere on the public shop — a normal shopper never sees it.

> If the "secret door" is switched on (see §4), `/admin` will show **404**. In that case bookmark your
> secret knock URL instead: `https://YOUR-DOMAIN/<your-secret-key>` — opening it reveals the login.

---

## 2. First-time sign-in (owners)

There is **no default password** by design. Each owner sets their own via a one-time link.

1. On the server, after deploy, the admin seeder prints a **set-password link** for each owner
   (`dinesh@winquestonline.com`, `seema@winquestonline.com`). It looks like:
   `https://YOUR-DOMAIN/admin/set-password/XXXXXXXX`
2. Open your link, choose a password, submit — your account is now active.
3. Go to `/admin`, sign in with your email + the password you just set.

To re-issue a link at any time, run on the server:
```bash
php artisan db:seed --class=AdminSeeder --force   # prints fresh links for owners who haven't set a password
```

---

## 3. Adding another admin (invite-only)

Only owners can add admins, and only **@winquestonline.com** email addresses are allowed.

1. Sign in → **Admins** in the sidebar → **Invite an admin**.
2. Enter their name + company email → **Send invite**.
3. They receive a set-password link by email (once SMTP is live — see §5). Until email is configured,
   the link is also shown to you in the panel so you can share it securely.
4. Owners (Dinesh & Seema) can never be revoked; anyone else can be revoked from the same page.

---

## 4. Security features (all optional, safe defaults)

Set these in the server `.env` (see §5 for the full list):

- **Login alerts** — `ADMIN_LOGIN_ALERTS=true` (default). Both owners get an email on every admin sign-in
  (who, when, IP, device). Needs SMTP to actually deliver.
- **Secret admin URL** — `ADMIN_GATE_KEY=some-secret-path`. When set, `/admin` returns 404 until you first
  open `https://YOUR-DOMAIN/some-secret-path` (which quietly unlocks it for your browser for 30 days).
  Leave **blank** to keep `/admin` reachable directly. Set-password invite links always work regardless.

> Do **not** host the admin on a separate domain — it breaks the same-origin session/CSRF setup on shared
> hosting for no real security gain. The secret URL + server-side allowlist already lock it down.

---

## 5. Production `.env` — the values to set on the server

Everything below lives ONLY in the server's `.env` (never in git). Full templates are in `.env.example`.

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR-DOMAIN

# Database (from hPanel → Databases)
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

# Admin allowlist (who may EVER be an admin)
ADMIN_OWNERS=dinesh@winquestonline.com,seema@winquestonline.com
ADMIN_ALLOWED_DOMAINS=winquestonline.com
ADMIN_LOGIN_ALERTS=true
ADMIN_GATE_KEY=            # optional secret path, e.g. studio-9f3a

# Email (create a mailbox in hPanel, e.g. noreply@clavira.in)
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_SCHEME=smtps
MAIL_USERNAME=noreply@clavira.in
MAIL_PASSWORD=...          # the mailbox password
MAIL_FROM_ADDRESS="noreply@clavira.in"
MAIL_FROM_NAME="Clavira"

# Payments — set when going live with real payments
RAZORPAY_ENABLED=false
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Brand contact
CLAVIRA_WHATSAPP=919XXXXXXXXX   # intl format, no + or spaces; blank hides the WhatsApp button
CLAVIRA_PHONE="+91 9XXXX XXXXX"
CLAVIRA_EMAIL=care@clavira.in
```

After editing `.env`, always run:
```bash
php artisan config:cache && php artisan route:cache
```

Verify email works:
```bash
php artisan clavira:mail-test you@example.com          # plain test
php artisan clavira:mail-test you@example.com --invite # branded sample
```

---

## 6. Deploying / updating the live site

The app deploys from **git** — Hostinger has no Composer or Node, so `vendor/` and `public/build` are
committed to the repo and shipped as-is.

**Pipeline:** work on `dev` → merge to `main` → the server's cron pulls `main` and updates automatically.

- **Update the live site** = get the new code onto `main` and pushed:
  ```bash
  git checkout main
  git merge dev            # fast-forward when dev is ahead
  git push origin main
  ```
  The cron on Hostinger (`deploy/hostinger-deploy.sh`) then runs `git pull`, applies any new migrations,
  refreshes the built assets, and rebuilds caches — within a minute or two.

- **First-time server setup** (once): `deploy/hostinger-setup.sh` writes `.env`, generates the app key,
  migrates + seeds, wires the web root to `laravel/public`, and blocks the app folder from the web.

- **After a deploy that adds an admin/owner or changes the allowlist**, re-run the admin seeder on the
  server to (re)issue owner set-password links (§2).

---

## 7. Quick reference — day-to-day

| Task | Where |
|---|---|
| Sign in | `/admin` (or your secret knock URL) |
| Add/edit products, prices, images | Admin → Products |
| See & update orders | Admin → Orders |
| Publish the day's gold rate | Admin → Settings |
| Approve customer reviews | Admin → Reviews |
| See consultation bookings & subscribers | Admin → Consultations |
| Add another staff admin | Admin → Admins |
| Verify a certificate (public) | `/verify` |

_Last updated: 2026-07-15._
