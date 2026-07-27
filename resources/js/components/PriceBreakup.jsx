import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '../format';

const GST_RATE = 0.03; // 3% GST on jewellery (matches checkout)

const RATE_KEY = { 24: 'rate_24k', 22: 'rate_22k', 18: 'rate_18k', 14: 'rate_14k' };

/**
 * Collapsible price transparency panel (Angara-style "Price Breakup").
 *
 * `price` is the SELECTED item value excluding GST — i.e. base_price plus the
 * chosen variant's delta. That distinction is the whole difficulty here: the
 * composition columns are stored per PRODUCT, so naively printing them beside a
 * variant-adjusted price shows components that visibly fail to add up.
 *
 * So the itemisation is built to reconcile by construction, or it is not shown
 * at all. Two ways it can reconcile:
 *   1. Live — gold is valued at today's published rate for the selected purity
 *      (grams x rate), making charge is the stored figure, and the stone is the
 *      remainder. Sums to `price` exactly, and moves with the daily rate.
 *   2. Stored — the metal/making/stone trio, shown only when it actually agrees
 *      with the configured price (i.e. no variant delta is in play).
 * Otherwise the panel falls back to a clean item + GST + total.
 */
export default function PriceBreakup({ price, components = {}, goldRate = null, purity = null }) {
    const [open, setOpen] = useState(false);
    const gst = Math.round(price * GST_RATE);
    const total = price + gst;

    const { metal_value, making_charge, stone_value, gross_weight_g } = components;

    const perGram = goldRate && purity ? goldRate[RATE_KEY[purity]] : null;
    const grams = gross_weight_g > 0 ? gross_weight_g : null;

    let rows = null;
    let live = false;

    // 1. Live valuation against today's published rate.
    if (grams && perGram > 0) {
        const gold = Math.round(grams * perGram);
        const making = making_charge > 0 ? Math.round(making_charge) : 0;
        const stone = Math.round(price) - gold - making;
        if (gold > 0 && gold <= price && stone >= 0) {
            rows = [
                ['Gold value', gold, `${grams}g at ${formatPrice(perGram)}/g today`],
                ...(stone > 0 ? [['Diamond / stone value', stone, null]] : []),
                ...(making > 0 ? [['Making charges', making, null]] : []),
            ];
            live = true;
        }
    }

    // 2. Stored composition — only when it genuinely matches this configuration.
    if (!rows) {
        const trio = [metal_value, making_charge, stone_value];
        if (trio.every((v) => v != null)) {
            const sum = trio.reduce((a, b) => a + b, 0);
            if (Math.abs(sum - price) <= 1) {
                rows = [
                    ...(metal_value > 0 ? [['Gold value', metal_value, null]] : []),
                    ...(stone_value > 0 ? [['Diamond / stone value', stone_value, null]] : []),
                    ...(making_charge > 0 ? [['Making charges', making_charge, null]] : []),
                ];
            }
        }
    }

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
                            {rows && (
                                <div className="space-y-1.5 pb-3 border-b border-gold/15 mb-3">
                                    {rows.map(([label, value, note]) => (
                                        <Row key={label} label={label} value={value} note={note} muted />
                                    ))}
                                </div>
                            )}
                            <Row label="Item value (excl. GST)" value={price} />
                            <Row label="GST (3%)" value={gst} muted />
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gold/20">
                                <span className="font-medium">Total payable</span>
                                <span className="font-display text-xl text-gold">{formatPrice(total)}</span>
                            </div>
                            <p className="text-[11px] text-charcoal/40 mt-3 leading-relaxed">
                                {live ? (
                                    <>
                                        Gold is valued at the{' '}
                                        <Link to="/gold-rate" className="text-gold/70 underline underline-offset-2">
                                            rate published today
                                        </Link>{' '}
                                        and moves with it. Final amount is confirmed at order.
                                    </>
                                ) : (
                                    'Making charges are included in the item value. Final invoice confirmed at order.'
                                )}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Row({ label, value, note = null, muted = false }) {
    return (
        <div className="flex justify-between items-baseline gap-4 py-0.5">
            <span className={muted ? 'text-charcoal/55' : 'text-charcoal/80'}>
                {label}
                {note && (
                    <span className="block text-[11px] text-charcoal/40 mt-0.5">{note}</span>
                )}
            </span>
            <span className={`shrink-0 ${muted ? 'text-charcoal/55' : 'text-charcoal'}`}>
                {formatPrice(value)}
            </span>
        </div>
    );
}
