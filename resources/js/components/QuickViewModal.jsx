import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api';
import { diamondLabel, formatPrice, metalLabel } from '../format';
import { useCart } from '../store';
import WishlistButton from './WishlistButton';

const METAL_SWATCH = { yellow: '#d9b36c', white: '#dcdcdc', rose: '#dda583' };
const RING_SIZES = ['6', '8', '10', '12', '14', '16', '18'];

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Configurator-in-a-modal. The card's "Add to Cart" lands here rather than
// posting straight to the cart: every Clavira piece has variants, and natural
// vs lab-grown moves the price by ~85%, so the choice has to be visible.
export default function QuickViewModal({ slug, onClose }) {
    const [open, setOpen] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [metal, setMetal] = useState(null);
    const [purity, setPurity] = useState(null);
    const [diamond, setDiamond] = useState(null);
    const [size, setSize] = useState('');
    const [adding, setAdding] = useState(false);
    const [status, setStatus] = useState('');

    const panelRef = useRef(null);
    const restoreRef = useRef(null);
    const closingRef = useRef(false);
    const titleId = useId();
    const cartApi = useCart();

    // Kept in a ref so `close` stays referentially stable — it is a dependency
    // of the focus-trap effect, and a new identity per render would re-run the
    // trap, re-locking scroll and yanking focus back on every state change.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    // Unmount on a timer rather than AnimatePresence's onExitComplete: if the
    // animation engine is ever stalled (a backgrounded tab pauses rAF, so exit
    // callbacks never fire) the dialog would be stuck open with the page inert
    // behind it. The exit animation stays purely cosmetic.
    const close = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setOpen(false);
        window.setTimeout(() => onCloseRef.current(), 260);
    }, []);

    const product = data?.product;
    const variants = useMemo(() => product?.variants ?? [], [product]);

    useEffect(() => {
        let live = true;
        api.get(`/products/${slug}`)
            .then(({ data }) => {
                if (!live) return;
                const v = data.product.variants ?? [];
                // Land on a real variant immediately — the product's declared
                // defaults aren't guaranteed to be a combination that exists
                // (Jadau pieces, for one, are yellow gold only).
                const start =
                    v.find(
                        (x) =>
                            x.metal === data.product.default_metal &&
                            x.purity === data.product.default_purity &&
                            x.diamond_type === data.product.diamond_type
                    ) ?? v[0];
                setMetal(start?.metal ?? data.product.default_metal);
                setPurity(start?.purity ?? data.product.default_purity);
                setDiamond(start?.diamond_type ?? data.product.diamond_type);
                setData(data);
            })
            .catch(() => live && setError(true));
        return () => {
            live = false;
        };
    }, [slug]);

    // Focus trap, scroll lock, Escape, and focus restore. None of the existing
    // modals do this; without restore, closing a card deep in a 24-card grid
    // drops the user back at <body>.
    useEffect(() => {
        restoreRef.current = document.activeElement;
        const root = document.getElementById('root');
        root?.setAttribute('inert', '');

        const scrollY = window.scrollY;
        const prev = document.body.style.cssText;
        Object.assign(document.body.style, { position: 'fixed', top: `-${scrollY}px`, width: '100%' });

        panelRef.current?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                close();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const f = panelRef.current.querySelectorAll(FOCUSABLE);
            if (!f.length) return;
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        // Capture, so this beats the Header's window-level Escape handler.
        document.addEventListener('keydown', onKey, true);

        return () => {
            document.removeEventListener('keydown', onKey, true);
            root?.removeAttribute('inert');
            document.body.style.cssText = prev;
            window.scrollTo(0, scrollY);
            restoreRef.current?.focus?.();
        };
    }, [close]);

    const metals = useMemo(() => [...new Set(variants.map((v) => v.metal))], [variants]);
    const purities = useMemo(
        () => [...new Set(variants.map((v) => v.purity))].sort((a, b) => a - b),
        [variants]
    );
    const diamonds = useMemo(() => [...new Set(variants.map((v) => v.diamond_type))], [variants]);

    const selected = useMemo(
        () => variants.find((v) => v.metal === metal && v.purity === purity && v.diamond_type === diamond),
        [variants, metal, purity, diamond]
    );

    // Honour the option the user just touched; relax the others onto whatever
    // real variant supports it, so the picker can never sit on a dead combo.
    const choose = (key, value) => {
        const want = { metal, purity, diamond, [key]: value };
        const exact = variants.find(
            (v) => v.metal === want.metal && v.purity === want.purity && v.diamond_type === want.diamond
        );
        const field = key === 'diamond' ? 'diamond_type' : key;
        const next = exact ?? variants.find((v) => v[field] === value);
        if (!next) return;
        setMetal(next.metal);
        setPurity(next.purity);
        setDiamond(next.diamond_type);
    };

    const price = product ? product.base_price + (selected?.price_delta ?? 0) : 0;
    const isRing = product?.category?.slug === 'rings';

    const addToCart = async () => {
        if (!product || !cartApi || adding) return;
        setAdding(true);
        setStatus('');
        try {
            await cartApi.add(product.id, selected?.id ?? null, {
                metal: metalLabel[metal],
                purity,
                diamond: diamondLabel[diamond],
                size: size || undefined,
            });
            // Close on success: the cart drawer opens at z-50, which would sit
            // underneath this modal's z-[90] panel and read as "nothing happened".
            close();
        } catch {
            setStatus('Sorry — we could not add that to your cart. Please try again.');
            setAdding(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                // One keyed motion child. AnimatePresence cannot drive an exit on
                // a Fragment — it holds the subtree mounted waiting for an
                // animation that never completes, and the modal never closes.
                <motion.div
                    key="quick-view"
                    className="fixed inset-0 z-[80]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="absolute inset-0 bg-black/50" onClick={close} />
                    <div className="absolute inset-0 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                        <motion.div
                            ref={panelRef}
                            tabIndex={-1}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="pointer-events-auto w-full sm:max-w-3xl bg-ivory shadow-2xl max-h-[92vh] sm:max-h-[86vh] overflow-y-auto overscroll-contain focus:outline-none"
                        >
                            <div className="flex justify-end p-3 pb-0">
                                <button
                                    type="button"
                                    onClick={close}
                                    aria-label="Close quick view"
                                    className="p-1 text-charcoal/50 hover:text-gold transition-colors"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6L6 18" />
                                    </svg>
                                </button>
                            </div>

                            {error ? (
                                <div className="px-6 pb-10 text-center">
                                    <h2 id={titleId} className="font-display text-2xl">Unable to load</h2>
                                    <p className="text-sm text-charcoal/60 mt-2">
                                        Something went wrong fetching this piece. Please try again.
                                    </p>
                                </div>
                            ) : !product ? (
                                <div className="px-6 pb-10 grid sm:grid-cols-2 gap-6">
                                    <div className="aspect-square bg-ivory-dark animate-pulse" />
                                    <div className="space-y-3 pt-2">
                                        <div className="h-7 bg-ivory-dark animate-pulse w-3/4" />
                                        <div className="h-5 bg-ivory-dark animate-pulse w-1/3" />
                                        <div className="h-12 bg-ivory-dark animate-pulse w-full mt-8" />
                                    </div>
                                    <span id={titleId} className="sr-only">Loading piece</span>
                                </div>
                            ) : (
                                <div className="px-5 sm:px-8 pb-8 grid sm:grid-cols-2 gap-6 sm:gap-8">
                                    <div className="aspect-square bg-ivory-dark relative">
                                        {product.images?.[0] && (
                                            <img
                                                src={`/${product.images[0].path}`}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {product.is_jadau && (
                                            <span className="absolute top-3 left-3 bg-maroon text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                                                Jadau
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/65">
                                            {diamondLabel[product.diamond_type]}
                                        </p>
                                        <div className="flex items-start justify-between gap-3 mt-1.5">
                                            <h2 id={titleId} className="font-display text-2xl leading-tight">
                                                {product.name}
                                            </h2>
                                            <WishlistButton
                                                productId={product.id}
                                                productName={product.name}
                                                className="mt-1 shrink-0 text-charcoal/60 hover:text-gold"
                                            />
                                        </div>

                                        <p className="font-display italic text-2xl text-gold-ink mt-3">
                                            {formatPrice(price)}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal/50 mt-1">
                                            GST additional at checkout
                                        </p>

                                        <div className="mt-6 space-y-5">
                                            {metals.length > 1 && (
                                                <Field label={`Metal — ${metalLabel[metal]}`}>
                                                    {metals.map((m) => (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onClick={() => choose('metal', m)}
                                                            aria-label={metalLabel[m]}
                                                            aria-pressed={metal === m}
                                                            title={metalLabel[m]}
                                                            className={`w-9 h-9 rounded-full border-2 transition-transform ${
                                                                metal === m ? 'border-gold scale-110' : 'border-charcoal/20'
                                                            }`}
                                                            style={{ background: METAL_SWATCH[m] }}
                                                        />
                                                    ))}
                                                </Field>
                                            )}

                                            {purities.length > 1 && (
                                                <Field label="Gold Purity">
                                                    {purities.map((p) => (
                                                        <Pill key={p} active={purity === p} onClick={() => choose('purity', p)}>
                                                            {p}kt
                                                        </Pill>
                                                    ))}
                                                </Field>
                                            )}

                                            {diamonds.length > 1 && (
                                                <Field label="Diamond">
                                                    {diamonds.map((d) => (
                                                        <Pill key={d} active={diamond === d} onClick={() => choose('diamond', d)}>
                                                            {diamondLabel[d]}
                                                        </Pill>
                                                    ))}
                                                </Field>
                                            )}

                                            {isRing && (
                                                <Field label="Ring Size (Indian)">
                                                    {RING_SIZES.map((s) => (
                                                        <Pill key={s} active={size === s} onClick={() => setSize(s)}>
                                                            {s}
                                                        </Pill>
                                                    ))}
                                                </Field>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-gold w-full mt-7"
                                            onClick={addToCart}
                                            disabled={adding}
                                        >
                                            {adding ? 'Adding…' : 'Add to Cart'}
                                        </button>

                                        <Link
                                            to={`/product/${product.slug}`}
                                            onClick={close}
                                            className="block text-center text-[11px] uppercase tracking-[0.18em] text-charcoal/60 hover:text-gold transition-colors mt-4"
                                        >
                                            View full details
                                        </Link>

                                        {status && (
                                            <p className="text-[12px] text-maroon mt-3 text-center">{status}</p>
                                        )}
                                        <p role="status" aria-live="polite" className="sr-only">
                                            {status}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function Field({ label, children }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/65 mb-2">{label}</p>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Pill({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`px-3 py-2 border text-[12px] transition-colors ${
                active ? 'border-gold bg-gold-pale/50' : 'border-gold/30 hover:border-gold'
            }`}
        >
            {children}
        </button>
    );
}
