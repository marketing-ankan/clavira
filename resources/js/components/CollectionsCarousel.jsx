import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';

// "Our Collections" — a carousel with a large lead card and the next
// collections peeking beside it, driven by arrows + dot pagination. (ZOYA-style.)
export default function CollectionsCarousel({ collections }) {
    const trackRef = useRef(null);
    const [active, setActive] = useState(0);

    const goTo = useCallback((i) => {
        const el = trackRef.current;
        if (!el) return;
        const clamped = Math.max(0, Math.min(i, el.children.length - 1));
        setActive(clamped); // immediate feedback; scroll listener refines on manual swipe
        const card = el.children[clamped];
        if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' });
    }, []);

    const onScroll = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        let nearest = 0;
        let min = Infinity;
        [...el.children].forEach((c, i) => {
            const d = Math.abs(c.offsetLeft - el.offsetLeft - el.scrollLeft);
            if (d < min) { min = d; nearest = i; }
        });
        setActive(nearest);
    }, []);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [onScroll]);

    if (!collections?.length) return null;

    return (
        <section className="py-20 bg-ivory-dark/40 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
                <Reveal className="mb-10">
                    <p className="eyebrow text-gold mb-3">Special Collections</p>
                    <h2 className="font-display text-3xl md:text-5xl">Our Collections</h2>
                </Reveal>

                <div
                    ref={trackRef}
                    className="flex gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2"
                >
                    {collections.map((col) => (
                        <Link
                            key={col.id}
                            to={`/collections/${col.slug}`}
                            className="group relative shrink-0 w-[82%] sm:w-[62%] lg:w-[46%] snap-center"
                        >
                            <div className="img-zoom aspect-[3/4] sm:aspect-[4/3] bg-ivory-dark relative">
                                {col.hero_image && (
                                    <img src={`/${col.hero_image}`} alt={col.name} loading="lazy" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />
                                <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 text-white">
                                    {col.badge && <p className="text-[10px] uppercase tracking-[0.22em] text-gold-light mb-1.5">{col.badge}</p>}
                                    <h3 className="font-display text-2xl md:text-3xl leading-tight">{col.name}</h3>
                                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-gold-light mt-3 group-hover:gap-3 transition-all">
                                        Explore <span>→</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Arrows + dots */}
                <div className="flex items-center justify-center gap-5 mt-8">
                    <CarouselBtn dir={-1} onClick={() => goTo(active - 1)} disabled={active === 0} />
                    <div className="flex items-center gap-2" role="tablist" aria-label="Collections">
                        {collections.map((c, i) => (
                            <button
                                key={c.id}
                                onClick={() => goTo(i)}
                                aria-label={`Go to ${c.name}`}
                                aria-selected={i === active}
                                role="tab"
                                className={`h-1.5 rounded-full transition-all duration-400 ${i === active ? 'w-7 bg-gold' : 'w-2 bg-charcoal/20 hover:bg-charcoal/40'}`}
                            />
                        ))}
                    </div>
                    <CarouselBtn dir={1} onClick={() => goTo(active + 1)} disabled={active === collections.length - 1} />
                </div>
            </div>
        </section>
    );
}

function CarouselBtn({ dir, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={dir < 0 ? 'Previous' : 'Next'}
            className="w-11 h-11 rounded-full border border-gold/40 flex items-center justify-center text-charcoal hover:bg-gold hover:text-white hover:border-gold transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}
