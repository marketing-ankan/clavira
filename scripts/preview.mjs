#!/usr/bin/env node
//
// Screenshot the locally-running site so changes can be reviewed as pictures
// (the dev box has no browser of its own). Assumes `php artisan serve` is up
// on APP port 8801 — scripts/local.sh starts it.
//
//   node scripts/preview.mjs                    # the default page set
//   node scripts/preview.mjs / /craftsmanship   # specific paths
//   node scripts/preview.mjs --mobile /         # 390px-wide viewport
//   node scripts/preview.mjs --viewport /       # above the fold only
//   node scripts/preview.mjs --retina /         # 2x PNG, for inspecting detail
//
// Images land in storage/app/preview/ (gitignored) — one per path.

import { chromium } from 'playwright';
import { mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Use a browser that is already on the box when there is one — the sandbox
// ships Chromium at a fixed path that may not match Playwright's expected
// build number, and downloading is blocked.
const PRESET = process.env.PREVIEW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const launchOpts = existsSync(PRESET) ? { executablePath: PRESET } : {};

const BASE = process.env.PREVIEW_BASE ?? 'http://127.0.0.1:8801';
const OUT = 'storage/app/preview';

const argv = process.argv.slice(2);
const mobile = argv.includes('--mobile');
const full = !argv.includes('--viewport'); // full-page unless asked otherwise
// These get sent to a phone for review, so default to a JPEG at 1x: a retina
// full-page shot of a long landing page runs to double-digit megabytes and
// bounces off attachment limits. --retina when you need to inspect detail.
const retina = argv.includes('--retina');
const paths = argv.filter((a) => !a.startsWith('--'));

const DEFAULT_PAGES = ['/', '/category/rings', '/collections', '/craftsmanship'];
const targets = paths.length ? paths : DEFAULT_PAGES;

// A path becomes a filename: "/" -> home, "/category/rings" -> category-rings
const nameFor = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-'));

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: retina ? 2 : 1,
});

// Surface anything the app logs as an error — a blank-looking screenshot is
// almost always a JS exception, and silent PNGs hide that.
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));

// Sections animate in with framer-motion's `whileInView` (see Reveal.jsx), so
// anything never scrolled past stays at opacity 0 and photographs as a blank
// band. Walk the page down a screen at a time to trip every reveal — they are
// `once: true`, so they stay visible — then return to the top to shoot.
async function revealAll() {
    const step = (await page.viewportSize()).height * 0.6;
    // Re-measure each step: revealed sections and late images grow the page.
    for (let y = 0, guard = 0; guard < 200; guard++) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        if (y > height) break;
        await page.evaluate((to) => window.scrollTo(0, to), y);
        await page.waitForTimeout(260);
        y += step;
    }

    // Second pass for stragglers: anything still transparent gets scrolled to
    // directly, which is what the observer needs to fire.
    const stuck = await page.$$eval('*', (nodes) =>
        nodes
            .filter((n) => {
                const s = getComputedStyle(n);
                return parseFloat(s.opacity) < 0.9 && n.getBoundingClientRect().height > 20;
            })
            .map((n, i) => {
                n.dataset.previewStuck = String(i);
                return i;
            })
    );
    for (const i of stuck) {
        const el = await page.$(`[data-preview-stuck="${i}"]`);
        if (el) {
            await el.scrollIntoViewIfNeeded().catch(() => {});
            await page.waitForTimeout(200);
        }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000); // let the last transitions settle
}

for (const target of targets) {
    const url = new URL(target, BASE).href;
    problems.length = 0;
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // The SPA paints after its first fetch resolves; give lazy imagery a beat.
    await page.waitForTimeout(700);
    if (full) await revealAll();
    const ext = retina ? 'png' : 'jpg';
    const file = path.join(OUT, `${nameFor(target)}${mobile ? '-mobile' : ''}.${ext}`);
    await page.screenshot({
        path: file,
        fullPage: full,
        ...(retina ? {} : { type: 'jpeg', quality: 82 }),
    });
    const status = res?.status() ?? '???';
    const kb = Math.round((await stat(file)).size / 1024);
    console.log(`${status} ${target} -> ${file} (${kb} KB)`);
    for (const p of problems) console.log(`      ! ${p}`);
}

await browser.close();
