import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Educational "Guide" popovers linked beside each configurator option
// (Angara's Stone Guide / Metal Guide / Size Guide pattern).
export const GUIDES = {
    size: {
        title: 'Ring Size Guide',
        intro: 'Indian ring sizes run from 4 to 30. Use one of these methods to find yours.',
        rows: [
            ['Measure an existing ring', 'Place a ring you already wear over a ruler and measure the inner diameter in mm.'],
            ['Wrap method', 'Wrap a strip of paper around the base of your finger, mark where it meets, and measure the length in mm.'],
            ['Best time to measure', 'Measure at the end of the day when fingers are warm — never when cold.'],
            ['Between sizes?', 'Choose the larger size, especially for wider bands.'],
        ],
        footer: 'Free resizing on your first order within 30 days.',
    },
    metal: {
        title: 'Metal & Karat Guide',
        intro: 'Karat (kt) denotes gold purity out of 24. Higher karat is purer and richer in colour; lower karat is more durable for everyday wear.',
        rows: [
            ['22kt (91.6%)', 'Traditional, deep-yellow richness. Best for heritage and bridal pieces.'],
            ['18kt (75%)', 'The fine-jewellery standard — ideal balance of purity and strength; suits diamond settings.'],
            ['14kt (58.5%)', 'Most durable and scratch-resistant. Great for daily-wear and delicate designs.'],
            ['Yellow / White / Rose', 'The same gold alloyed differently — white with palladium, rose with copper.'],
        ],
        footer: 'Every piece is BIS-hallmarked, certifying its stated purity.',
    },
    diamond: {
        title: 'Diamond Guide — The 4Cs',
        intro: 'A diamond’s brilliance is graded on four attributes. Clavira uses IGI-certified stones at VVS clarity and E–F colour.',
        rows: [
            ['Cut', 'How well facets return light — the biggest driver of sparkle.'],
            ['Colour (E–F)', 'Near-colourless, at the top of the scale. E and F appear icy-white.'],
            ['Clarity (VVS)', 'Very-Very-Slightly included — inclusions invisible to the naked eye.'],
            ['Carat', 'The diamond’s weight. Larger carats are rarer and priced steeply higher.'],
            ['Lab-grown vs natural', 'Identical chemically and optically; lab-grown offers exceptional value and is fully IGI-certified.'],
        ],
        footer: 'Every diamond ships with its IGI certificate.',
    },
};

export default function GuideModal({ guide, onClose }) {
    const g = guide ? GUIDES[guide] : null;

    return createPortal(
        <AnimatePresence>
            {g && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-[80]"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed z-[90] inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-lg bg-ivory p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
                        initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: '-50%', x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}
                        style={{ left: '50%' }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        role="dialog" aria-modal="true" aria-label={g.title}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="font-display text-2xl">{g.title}</h3>
                            <button onClick={onClose} aria-label="Close" className="p-1 text-charcoal/50 hover:text-gold">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                            </button>
                        </div>
                        <p className="text-sm text-charcoal/70 leading-relaxed">{g.intro}</p>
                        <dl className="mt-5 space-y-3">
                            {g.rows.map(([term, desc]) => (
                                <div key={term} className="border-l-2 border-gold/40 pl-4">
                                    <dt className="font-medium text-sm">{term}</dt>
                                    <dd className="text-sm text-charcoal/60 mt-0.5 leading-relaxed">{desc}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-gold border-t border-gold/20 pt-4">{g.footer}</p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}
