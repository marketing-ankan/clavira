/**
 * Consent-gated measurement.
 *
 * Nothing in this file contacts Google or Meta until `enable()` is called with
 * a positive consent decision, and `enable()` is only ever called by the
 * consent provider. Events fired before that are dropped, not queued — a queue
 * that flushes on consent would smuggle pre-consent behaviour into the tag.
 */

const config = () => window.__CLAVIRA ?? {};

let analyticsOn = false;
let marketingOn = false;
let gaLoaded = false;
let pixelLoaded = false;

function injectScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.async = true;
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function loadGa4(id) {
    if (gaLoaded || !id) return;
    gaLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // IP anonymisation is the default in GA4; ads signals are not, and must
    // stay off unless the visitor accepted marketing.
    window.gtag('config', id, {
        send_page_view: false,
        allow_google_signals: marketingOn,
        allow_ad_personalization_signals: marketingOn,
    });

    injectScript(`https://www.googletagmanager.com/gtag/js?id=${id}`).catch(() => {
        gaLoaded = false;
    });
}

function loadPixel(id) {
    if (pixelLoaded || !id) return;
    pixelLoaded = true;

    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', id);
}

/** Called by the consent provider — the only entry point that starts a tag. */
export function enable({ analytics, marketing }) {
    analyticsOn = !!analytics;
    marketingOn = !!marketing;

    const { ga4, meta_pixel: metaPixel } = config();

    if (analyticsOn) loadGa4(ga4);
    if (marketingOn) loadPixel(metaPixel);
}

/**
 * Consent withdrawn. The vendor scripts cannot be un-loaded from a live
 * document, so we reload — the only honest way to guarantee they stop.
 */
export function disableAndReload() {
    analyticsOn = false;
    marketingOn = false;
    window.location.reload();
}

export function hasTags() {
    const { ga4, meta_pixel: metaPixel } = config();

    return !!(ga4 || metaPixel);
}

// ------------------------------------------------------------------ events

function ga(event, params) {
    if (analyticsOn && typeof window.gtag === 'function') window.gtag('event', event, params);
}

function pixel(event, params) {
    if (marketingOn && typeof window.fbq === 'function') window.fbq('track', event, params);
}

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const track = {
    pageView(path, title) {
        ga('page_view', { page_path: path, page_title: title });
        pixel('PageView');
    },

    viewItem(product) {
        if (!product) return;
        const value = money(product.base_price ?? product.price);
        ga('view_item', {
            currency: 'INR',
            value,
            items: [{ item_id: product.sku ?? product.slug, item_name: product.name, price: value }],
        });
        pixel('ViewContent', { content_ids: [product.sku ?? product.slug], content_type: 'product', value, currency: 'INR' });
    },

    addToCart(item) {
        if (!item) return;
        const value = money(item.unit_price ?? item.price);
        ga('add_to_cart', {
            currency: 'INR',
            value,
            items: [{ item_id: item.sku ?? item.product_id, item_name: item.name, price: value, quantity: item.qty ?? 1 }],
        });
        pixel('AddToCart', { content_ids: [item.sku ?? item.product_id], content_type: 'product', value, currency: 'INR' });
    },

    beginCheckout(cart) {
        if (!cart) return;
        const value = money(cart.total);
        ga('begin_checkout', {
            currency: 'INR',
            value,
            items: (cart.items ?? []).map((i) => ({
                item_id: i.sku ?? i.product_id, item_name: i.name, price: money(i.unit_price), quantity: i.qty,
            })),
        });
        pixel('InitiateCheckout', { value, currency: 'INR', num_items: (cart.items ?? []).length });
    },

    purchase(order) {
        if (!order?.order_no) return;
        const value = money(order.total);
        ga('purchase', { transaction_id: order.order_no, currency: 'INR', value });
        pixel('Purchase', { value, currency: 'INR' });
    },
};
