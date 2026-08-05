/**
 * Service-worker registration.
 *
 * Registered after first paint so it never competes with the initial render,
 * and only on secure origins (localhost counts). When a new worker is waiting
 * we activate it and reload once — a half-updated shop, where the HTML is new
 * and the JS bundle is last week's, is a class of bug worth spending one reload
 * to avoid.
 */
export default function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // The dev server serves modules straight from Vite; a worker caching them
    // would fight HMR for no benefit.
    if (import.meta.env.DEV) return;

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

            registration.addEventListener('updatefound', () => {
                const incoming = registration.installing;
                if (!incoming) return;

                incoming.addEventListener('statechange', () => {
                    // `controller` is null on the very first install — that is a
                    // fresh visitor, not an update, and must not trigger a reload.
                    if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
                        incoming.postMessage('SKIP_WAITING');
                    }
                });
            });

            let reloading = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (reloading) return;
                reloading = true;
                window.location.reload();
            });
        } catch {
            // A failed registration must never break the storefront.
        }
    });
}
