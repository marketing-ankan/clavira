import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '../format';

const GST_RATE = 0.03; // 3% GST on jewellery (matches checkout)

/**
 * Collapsible price transparency panel (Angara-style "Price Breakup").
 * `price` is the selected item value EXCLUSIVE of GST. When the product carries
 * metal/making/stone components they're shown as an itemised composition;
 * otherwise a clean item + GST + total is shown. GST is always added on top.
 */
export default function PriceBreakup({ price, components = {} }) {
    const [open, setOpen] = useState(false);
    const gst = Math.round(price * GST_RATE);
    const total = price + gst;

    const { metal_value, making_charge, stone_value } = components;
    const hasComposition = [metal_value, making_charge, stone_value].some((v) => v != null && v > 0);

    return (
        <div className="mt-4 border border-gold/25">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                aria-expanded={open}
            >
                <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/70 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
                        <path d="M4 7h16M4 12h16M4 17h10" />
                    </svg>
                    Price Breakup
                </span>
                <span className="text-gold text-lg leading-none">{open ? '−' : '+'}</span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 text-sm">
                            {hasComposition && (
                                <div className="space-y-1.5 pb-3 border-b border-gold/15 mb-3">
                                    {metal_value > 0 && <Row label="Gold value" value={metal_value} muted />}
                                    {stone_value > 0 && <Row label="Diamond / stone value" value={stone_value} muted />}
                                    {making_charge > 0 && <Row label="Making charges" value={making_charge} muted />}
                                </div>
                            )}
                            <Row label="Item value (excl. GST)" value={price} />
                            <Row label="GST (3%)" value={gst} muted />
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gold/20">
                                <span className="font-medium">Total payable</span>
                                <span className="font-display text-xl text-gold">{formatPrice(total)}</span>
                            </div>
                            <p className="text-[11px] text-charcoal/40 mt-3 leading-relaxed">
                                {hasComposition
                                    ? 'Gold value moves with the live daily rate; final amount is confirmed at order.'
                                    : 'Making charges are included in the item value. Final invoice confirmed at order.'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Row({ label, value, muted = false }) {
    return (
        <div className="flex justify-between items-center py-0.5">
            <span className={muted ? 'text-charcoal/55' : 'text-charcoal/80'}>{label}</span>
            <span className={muted ? 'text-charcoal/55' : 'text-charcoal'}>{formatPrice(value)}</span>
        </div>
    );
}
