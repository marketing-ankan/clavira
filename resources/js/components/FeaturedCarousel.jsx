import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { diamondLabel, formatPrice } from '../format';
import WishlistButton from './WishlistButton';
import Reveal from './Reveal';

// Fanned/overlapping card slider (ZOYA "Our Collections" style): a large lead
// card with the next pieces peeking behind it to the right, advanced by arrows
// + dots. Position per card is a function of its distance from the active one.
// Lead card at x:0, with three peeking cards fanning out to the right so the
// deck stretches toward the far edge (ZOYA-style). Offsets are % of card width.
const POS = (offset) => {
    if (offset < 0) return { x: '-60%', y: 0, scale: 0.92, opacity: 0, zIndex: 0 };
    if (offset === 0) return { x: '0%', y: 0, scale: 1, opacity: 1, zIndex: 40 };
    if (offset === 1) return { x: '58%', y: 30, scale: 0.92, opacity: 0.96, zIndex: 30 };
    if (offset === 2) return { x: '113%', y: 58, scale: 0.84, opacity: 0.88, zIndex: 20 };
    if (offset === 3) return { x: '164%', y: 84, scale: 0.76, opacity: 0.68, zIndex: 10 };
    return { x: '164%', y: 84, scale: 0.76, opacity: 0, zIndex: 5 }; // further back — hidden behind #3
};

export default function FeaturedCarousel({ products = [], eyebrow = 'Signature Pieces', title = 'Exceptional Stones. Exceptional Settings.' }) {
    const [active, setActive] = useState(0);
    const n = products.length;
    if (!n) return null;
    const go = (i) => setActive(Math.max(0, Math.min(i, n - 1)));

    return (
        <section className="bg-ivory-dark/40 py-20 lg:py-28 overflow-hidden">
            <div className="grid lg:grid-cols-[300px_1fr] xl:grid-cols-[360px_1fr] gap-8 lg:gap-4 items-center pl-6 sm:pl-10 lg:pl-16">
                {/* Left: title, pinned to the far left */}
                <Reveal variant="left" className="max-w-sm pr-4">
                    <p className="eyebrow text-gold mb-3">{eyebrow}</p>
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl leading-tight">{title}</h2>
                    <p className="text-charcoal/55 mt-5 text-sm leading-relaxed">
                        A rotating showcase of our most exceptional creations — each a study in
                        light, precision and rare, certified stones.
                    </p>
                </Reveal>

                {/* Right: fanned deck stretching to the far-right edge */}
                <div className="relative h-[440px] sm:h-[540px] lg:h-[620px] xl:h-[680px]">
                    {products.map((p, i) => {
                        const offset = i - active;
                        return (
                            <motion.div
                                key={p.id}
                                className="absolute top-0 left-0 h-full aspect-[4/5]"
                                initial={false}
                                animate={POS(offset)}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                style={{ pointerEvents: offset === 0 ? 'auto' : 'none' }}
                            >
                                <BigCard product={p} />
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Controls — centered under the whole section */}
            <div className="flex flex-col items-center gap-4 mt-10">
                <div className="flex items-center gap-5">
                    <Ctrl dir={-1} onClick={() => go(active - 1)} disabled={active === 0} />
                    <Ctrl dir={1} onClick={() => go(active + 1)} disabled={active === n - 1} />
                </div>
                {/* dash pagination */}
                <div className="flex items-center gap-2" role="tablist" aria-label="Signature pieces">
                    {products.map((p, i) => (
                        <button
                            key={p.id}
                            onClick={() => go(i)}
                            aria-label={`Go to ${p.name}`}
                            aria-selected={i === active}
                            role="tab"
                            className="group py-2"
                        >
                            <span className={`block h-px transition-all duration-500 ${i === active ? 'w-9 bg-gold' : 'w-6 bg-charcoal/25 group-hover:bg-charcoal/50'}`} />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

function BigCard({ product }) {
    return (
        <div className="relative group">
            <WishlistButton productId={product.id} floating />
            <Link to={`/product/${product.slug}`} className="block img-zoom aspect-[4/5] bg-ivory-dark relative shadow-2xl">
                {product.image && <img src={`/${product.image}`} alt={product.name} className="w-full h-full object-cover" />}
                {product.is_jadau && (
                    <span className="absolute top-3 left-3 bg-maroon text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1">Jadau</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold-light">{diamondLabel[product.diamond_type]}</p>
                    <h3 className="font-display text-2xl md:text-3xl leading-tight mt-1">{product.name}</h3>
                    <p className="text-gold-light mt-1.5">{formatPrice(product.price)}</p>
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-gold-light mt-3 group-hover:gap-3 transition-all">
                        View Piece <span>→</span>
                    </span>
                </div>
            </Link>
        </div>
    );
}

function Ctrl({ dir, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={dir < 0 ? 'Previous' : 'Next'}
            className="p-1.5 text-charcoal/55 hover:text-gold transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}
