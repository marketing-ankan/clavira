/*
 * Clavira service worker.
 *
 * Deliberately conservative: this is a live shop, and a service worker that
 * serves a stale price or a stale cart is far worse than no service worker.
 *
 * The rules, in order of how much damage a mistake would do:
 *   - Anything that is not a GET, and anything under /api, /admin, /checkout,
 *     /account or /order-success, is never touched. It goes straight to the
 *     network with no cache read and no cache write.
 *   - Hashed build assets (/build/assets/*) are immutable by construction, so
 *     they are cache-first and never revalidated.
 *   - Images are stale-while-revalidate: showing last week's photograph for a
 *     moment is fine, blocking the page on it is not.
 *   - Page navigations are network-first, falling back to the cached shell and
 *     then to /offline.html — so a flaky connection degrades instead of failing.
 */

const VERSION = 'clavira-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = '/offline.html';

const IMAGE_CACHE_LIMIT = 60;

/** Paths the worker must stay entirely out of. */
const BYPASS = [/^\/api\//, /^\/admin(\/|$)/, /^\/checkout(\/|$)/, /^\/account(\/|$)/, /^\/order-success(\/|$)/];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll([OFFLINE_URL]))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
            ))
            .then(() => self.clients.claim()),
    );
});

/** Let the page tell a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Third-party (fonts, Razorpay) and every private path: hands off.
    if (url.origin !== self.location.origin) return;
    if (BYPASS.some((re) => re.test(url.pathname))) return;

    if (url.pathname.startsWith('/build/assets/')) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    if (request.destination === 'image') {
        event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstPage(request));
    }
});

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    if (hit) return hit;

    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);

    const network = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone()).then(() => trim(cacheName, IMAGE_CACHE_LIMIT));
            }
            return response;
        })
        .catch(() => hit);

    return hit || network;
}

async function networkFirstPage(request) {
    const cache = await caches.open(SHELL_CACHE);

    try {
        const response = await fetch(request);
        // Only the shell of an indexable page is worth keeping.
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
    }
}

/** Keep the image cache from growing without bound on a 93-product catalogue. */
async function trim(cacheName, limit) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= limit) return;

    for (const key of keys.slice(0, keys.length - limit)) {
        await cache.delete(key);
    }
}
