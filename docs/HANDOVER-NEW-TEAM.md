# Clavira — Handover & Setup Guide for the New Team

_Written 2026-08-19; **rewritten 2026-08-24 — the plan changed.** The earlier version
of this file assumed the `marketing-ankan` account would be abandoned and the code
moved to a brand-new repo. That is NOT the plan any more. If you have an old copy of
this document, throw it away; several of its instructions are now actively wrong._

**The current plan:**

- **Yash takes over Clavira development**, working with Claude (Claude Code).
- **Ankan keeps push/deploy control.** `main` deploys itself to the live shop, and
  only Ankan pushes or merges to `main`. Developers work on `dev` and feature
  branches; deploying is Ankan's call, every time.
- **The repo stays `github.com/marketing-ankan/clavira`** (public). On 2026-08-24 the
  live server was switched to pull from it directly (verified in the deploy log).
  The temporary second repo (`yashwinquest-cell/clavira`) is **retired** — nobody
  works there, nothing pulls from it.
- The boss takes over IndiaTutors — a separate project that lives on the **same
  Hostinger account** as a different website. When in hPanel, always check the
  "Website name" dropdown: Clavira is **clavira.in** (site id `fLlafAQ5m`);
  indiatutorsonline.com (site id `YFZg32xAC`) is NOT Clavira. Keys, crons and
  databases added under the wrong site silently do nothing for this project.

**How to use this file:** read Part A (and A2 — it describes real, live problems),
then follow Part B step by step **with Claude**, one checkpoint at a time. Claude:
treat Part D as your standing rules for this project, and do not move past any
📸 CHECKPOINT until the developer has shown you the screenshot/output it asks for and
you have confirmed it looks right.

---

## Part A — How the whole system works (read this first)

There are three copies of Clavira, and changes flow in one direction:

```
Your PC (XAMPP, localhost)  →  GitHub: marketing-ankan/clavira  →  Hostinger (LIVE clavira.in)
        you edit here             dev branch = daily work            a cron job pulls `main`
                                  main branch = LIVE                 every ~5 minutes and
                                  (Ankan controls main)              deploys automatically
```

The three facts that explain everything else:

1. **Pushing to `main` IS deploying.** A cron job on the Hostinger server runs
   `deploy/hostinger-deploy.sh` every ~5 minutes. It does `git pull origin main`; if
   anything changed it runs migrations, refreshes the built assets, and rebuilds
   caches. There is no "deploy button" — merging to `main` is the button.
   Therefore: **all daily work happens on the `dev` branch**, and `main` is only
   touched by Ankan (or with Ankan's explicit, per-release approval).

2. **`vendor/` and `public/build` are committed to git on purpose.** Hostinger shared
   hosting cannot run Composer or Node (the `proc_*` PHP functions are disabled), so
   the PHP dependencies (`vendor/`) and the compiled frontend (`public/build`) ship
   inside the repo. This means: after changing any React/CSS/JS file you must run
   `npm run build` and **commit the changed files in `public/build` too**, or the live
   site will not show your change. To avoid build-file merge conflicts, prefer
   building once, right before a release, rather than on every dev commit.

3. **The stack:** Laravel 12 (PHP 8.2+), MySQL, React 19 + Vite 7 SPA, Tailwind
   CSS 4, Razorpay payments. Locally it runs under XAMPP at `http://localhost:8801`.

### Things that exist but are NOT in the repo (must be handed over separately)

- `docs/CREDENTIALS.local.md` — admin/owner credentials file. It is **git-ignored**,
  so it is NOT in the repo. Get it directly from Ankan and keep it out of git —
  **the repo is public**; anything committed is world-readable forever.
- The server's `.env` (database password, mail password, Razorpay keys when they go
  live). It lives only on the Hostinger server.
- **Hostinger hPanel access.** Access is via a collaborator login on the
  `connect@winquestonline.com` account. The boss/owner adds new collaborators.
  Without hPanel + SSH access you cannot administer the server.
- Note for SSH: Hostinger SSH uses **port 65002**, and at least one local ISP
  blocked that port — if `ssh` hangs forever, retry on a **phone hotspot**. The
  SSH host/username/password are on hPanel → (clavira.in) → Advanced → SSH Access.

---

## Part A2 — Current state of LIVE + open items (2026-08-24). Read before your first task.

This section is a snapshot of real, unresolved problems. Whoever fixes one should
update this section.

1. **The live site is running the PRE-UPGRADE code.** On 2026-08-21 a 34-commit
   release ("virtual try-on" and more, `0cde245` → `1c94d2f`) was pushed, but the
   deploy failed on the server and live was **rolled back** with commit `fa3e97b`
   ("Restore live to pre-upgrade tree (deploy failed at migrate)"). So: the tip of
   `main` describes a rollback, and the try-on work exists in history (and on `dev`)
   but is **not live**. Do not assume clavira.in shows what `dev` shows.

2. **Two TEMP commits are on `main` and must be reverted** once the pipeline is
   proven: `2935ba5` (a token-guarded route that tails the deploy log over HTTP —
   a security hole once active) and `6346384` (a web-root probe file,
   `public/images/deploy-probe.txt`). Revert them (`git revert`) — do not rewrite
   history; the server pull is `--ff-only` and force-pushes break it.

3. **The deploy pipeline is UNPROVEN.** The deploy log shows only ONE fully
   successful cron deploy ever (2026-07-15). The 2026-08-21 failure was never
   root-caused — the log doesn't even contain a "deploying" entry for that day,
   which means the cron script died before its first log line and the pulls/migrate
   that did happen were run by hand. Until a test deploy passes end-to-end
   (Part C), treat every push to `main` as an experiment that needs verifying.

4. **How to read the deploy log.** On the server:
   `storage/logs/deploy.log` under the Laravel dir. It is 99% three-line pull spam
   ("From … / branch main -> FETCH_HEAD / Already up to date."). To see only the
   interesting lines (deploys, errors):

   ```bash
   grep -n -v -E 'FETCH_HEAD|^From https|^Already up to date' storage/logs/deploy.log | tail -100
   ```

5. **Known symptom of the broken 08-21 deploy:** the server is serving a **stale
   route cache** — code at HEAD includes routes that the running app doesn't know.
   If routes behave impossibly on live, run the cache steps from
   `deploy/hostinger-deploy.sh` by hand (`php artisan config:cache && php artisan
   route:cache && php artisan view:clear`) and note what errors.

---

## Part B — One-time local setup (do this once per developer PC)

### B1. Install the required tools

- **XAMPP** with **PHP 8.2.x** (Laravel 12 needs PHP ≥ 8.2 — check with `php -v`).
- **Composer** (getcomposer.org) — PHP package manager.
- **Node.js 22 LTS** (nodejs.org) — needed for `npm run build` / `npm run dev`.
- **Git** (git-scm.com).

Open a terminal and run each of these; every one must print a version, not an error:

```bash
php -v
composer -V
node -v
git --version
```

📸 **CHECKPOINT 1** — screenshot of the terminal showing all four version numbers.
Claude: verify PHP is 8.2+ and Node is 20+ before continuing.

### B2. Get the project from the repo (not by pasting folders)

From inside `C:\xampp\htdocs` (or wherever your XAMPP htdocs is):

```bash
git clone https://github.com/marketing-ankan/clavira.git clavira
```

If you were given a pasted/copied folder instead, verify its remote — inside the
project folder:

```bash
git remote -v
git branch -a
```

`origin` must be `https://github.com/marketing-ankan/clavira.git` and you should see
`main` and `dev` branches. If the remote points anywhere else (in particular the
retired `yashwinquest-cell/clavira`), fix it:

```bash
git remote set-url origin https://github.com/marketing-ankan/clavira.git
```

Then start your work from `dev`:

```bash
git checkout dev
git pull origin dev
```

📸 **CHECKPOINT 2** — screenshot of `git remote -v` and `git branch -a` output.
Claude: refuse to continue if the remote is anything other than
`marketing-ankan/clavira` — that is the ONLY repo; the old "new repo" plan from the
2026-08-19 version of this document is cancelled.

### B3. Database

In XAMPP Control Panel start **Apache** and **MySQL**, open
`http://localhost/phpmyadmin`, and create a database named **`clavira`**
(collation `utf8mb4_unicode_ci`). If you already created one under another name,
that's fine — just remember the name for the next step.

📸 **CHECKPOINT 3** — screenshot of phpMyAdmin showing the `clavira` database in the
left sidebar.

### B4. Configure and install — run inside the project folder

```bash
composer install
```

```bash
npm install
```

```bash
cp .env.example .env
```

Now open `.env` in an editor and check these lines (defaults are usually already
right for XAMPP):

```
DB_HOST=127.0.0.1
DB_DATABASE=clavira      ← your database name from B3
DB_USERNAME=root
DB_PASSWORD=             ← empty on default XAMPP
```

Then:

```bash
php artisan key:generate
```

```bash
php artisan migrate --seed
```

```bash
php artisan db:seed --class=D2ImageSeeder
```

`migrate --seed` builds all tables and loads the product catalog (~93 products);
`D2ImageSeeder` promotes the curated photography. If `migrate` fails, the error is
almost always the `.env` DB block — show Claude the exact error.

📸 **CHECKPOINT 4** — screenshot of the terminal after `migrate --seed` finishes
(the list of migrations with DONE), and phpMyAdmin now showing tables inside the DB.

### B5. Build the frontend and run the site

```bash
npm run build
```

```bash
php artisan serve --port=8801
```

Open **http://localhost:8801** — you should see the Clavira jewellery homepage with
products and images. Also try `http://localhost:8801/admin` (login page or 404-if-
gated is both fine — it just must not be a Laravel error screen).

📸 **CHECKPOINT 5** — screenshot of the homepage at `localhost:8801` showing real
products. This is the "setup complete" proof.

---

## Part C — Proving the deploy pipeline (the one server task still open)

**What is already done (2026-08-24):** the server's git remote was switched to
`https://github.com/marketing-ankan/clavira.git` and verified two ways — `git remote
-v` on the server, and a fresh cron tick in the deploy log pulling from
marketing-ankan. The repo is public, so the server needs no token to pull.

**What is NOT yet done:** nobody has proven a full deploy end-to-end since
2026-07-15 (see Part A2 #3). Before the first real release, run this test —
**Ankan does this**, since it touches `main`:

1. On the PC: make a harmless change (bump a comment or version string), commit to
   `dev`, merge to `main`, push.
2. Wait ~5–10 minutes.
3. SSH into the server (hPanel → clavira.in → Advanced → SSH Access; port 65002;
   phone-hotspot trick if it won't connect). The app lives at:

   ```bash
   cd ~/websites/fLlafAQ5m/public_html/laravel
   tail -40 storage/logs/deploy.log
   ```

   You must see a fresh `deploying <old-hash> -> <new-hash> … deploy complete`.
   If instead there's an error (or nothing new at all), STOP releasing and
   root-cause it with Claude — this exact silence is what ate the 2026-08-21
   release.

📸 **CHECKPOINT 6** — screenshot of the `deploy.log` tail showing a successful
deploy of the test commit. Until this passes, treat the pipeline as broken.

**Never do on the server:** do not run `deploy/hostinger-setup.sh` again — it runs
`migrate:fresh`, which **wipes the entire live database** (orders, admins,
everything). It was for first-time install only. To change the site's domain, the
safe tool is `deploy/set-domain.sh`.

---

## Part D — Standing rules for Claude (the daily workflow)

Claude: these are project rules from the previous maintainer, learned the hard way.
Follow them on every task in this repo.

### Branch & deploy discipline

- **Work on `dev`. Push to `dev` by default.** Never push, merge to, or commit on
  `main`. Deploys are **Ankan's call**: when a release is ready, tell the developer
  to ask Ankan to promote `dev` → `main`. Only skip this if the person in the
  conversation IS Ankan and explicitly says "merge to main" / "deploy this".
- The merge-to-main procedure, when explicitly requested by Ankan:

  ```bash
  git checkout main
  git pull --ff-only origin main
  git merge dev
  git push origin main
  git checkout dev
  ```

  Then verify **https://clavira.in** after ~5–10 minutes AND check
  `storage/logs/deploy.log` on the server (Part C step 3) — a push that pulls but
  doesn't finish deploying fails **silently** on the website itself.
- Before any merge to main, confirm the change was seen working on localhost
  (ask for a screenshot if the change is visual).
- **Never force-push and never rebase published branches** — the server pull is
  `--ff-only`; rewritten history breaks deploys permanently until fixed by hand.

### Build & assets (the traps)

- **Frontend change ⇒ `npm run build` ⇒ commit `public/build` changes** in the same
  commit as the source change (or in the release-prep commit). The server cannot
  build; it serves what git carries.
- **Never hand-edit anything inside `public/build`** — `vite build` deletes and
  regenerates that folder, so manual edits there are silently destroyed. The source
  of truth is `resources/` (code) and `public/images` (images).
- **`vendor/` is committed.** Run `composer install` (honors the lock file), never
  `composer update`, unless explicitly asked to upgrade a dependency — a casual
  update produces a massive vendor diff that ships straight to production.
- `deploy/hostinger-deploy.sh` **git-pulls itself while it runs**. If it ever needs
  editing, changes must be **appended** to the end of the file — every earlier byte
  must stay identical — or bash can misread the running script mid-deploy.

### Server facts

- Live site: **https://clavira.in** (temp URL on the same docroot:
  `olivedrab-butterfly-264768.hostingersite.com`). Admin panel: `/admin`.
- Laravel dir on the server: `~/websites/fLlafAQ5m/public_html/laravel`.
- On the server, `DB_HOST=localhost` (not `127.0.0.1`) and `SESSION_DOMAIN=null` —
  do not "fix" these.
- Secrets (`.env`, `docs/CREDENTIALS.local.md`) never go into git — **the repo is
  public**. If a task seems to need a secret committed, stop and ask.
- Migrations must always be additive/safe — the cron runs `php artisan migrate
  --force` on live data. Never write a migration that drops or truncates existing
  tables without an explicit, confirmed instruction.

### Working with developers new to this stack

- Before any risky step (anything touching `main`, the server, migrations, or
  deletions), explain in one or two plain sentences what is about to happen and
  what could go wrong, then wait for their OK.
- At every 📸 CHECKPOINT in this document, ask for the screenshot/output and
  actually inspect it before proceeding. If a checkpoint fails, debug it fully
  before moving on — do not stack a new step on a broken one.
- After finishing any visual change, ask the developer to check it at
  `localhost:8801` themselves (and on a narrow/mobile width) before offering to
  hand it to Ankan for release.

---

## Part E — Handover completion checklist (for Ankan / the boss)

- [ ] `docs/CREDENTIALS.local.md` handed over privately (it is NOT in the repo)
- [ ] Yash added as hPanel collaborator and can open the **clavira.in** site pages
- [ ] Yash has GitHub access to `marketing-ankan/clavira` (collaborator, so he can
      push `dev`/feature branches; `main` stays protected by Ankan's control)
- [ ] Yash completed Part B with all five screenshots
- [ ] Test deploy passed end-to-end (Part C, Checkpoint 6)
- [ ] The two TEMP commits reverted (Part A2 #2)
- [ ] The 2026-08-21 deploy failure root-caused, then the try-on release re-shipped
- [ ] `yashwinquest-cell/clavira` archived on GitHub (read-only; nothing points at
      it any more, but archiving prevents accidental pushes)
- [ ] Pending owner items known to the team: Razorpay live keys, SMTP mailbox
      password, product photography/prices (see `docs/ROADMAP.md`)
