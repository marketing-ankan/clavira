import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';

// "Discover by Category" — an arrow-driven horizontal slider of category cards
// (image + name), with cards peeking at the edges. (ZOYA-style.)
export default function CategorySlider({ categories }) {
    const trackRef = useRef(null);

    const nudge = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        const card = el.querySelector('[data-card]');
        const step = card ? card.offsetWidth + 24 : 300;
        el.scrollBy({ left: dir * step, behavior: 'smooth' });
    };

    if (!categories?.length) return null;

    return (
        <section className="py-20 bg-ivory overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
                <Reveal className="text-center mb-12">
                    <p className="eyebrow text-gold mb-3">Explore</p>
                    <h2 className="font-display text-3xl md:text-5xl gold-rule">Discover by Category</h2>
                </Reveal>

                <div className="relative">
                    <Arrow dir={-1} onClick={() => nudge(-1)} className="left-0 -translate-x-1/2" />
                    <Arrow dir={1} onClick={() => nudge(1)} className="right-0 translate-x-1/2" />

                    <div
                        ref={trackRef}
                        className="flex gap-6 overflow-x-auto snap-x scroll-smooth no-scrollbar pb-2"
                    >
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                data-card
                                to={`/category/${cat.slug}`}
                                className="group shrink-0 w-[72%] sm:w-[46%] md:w-[30%] lg:w-[22.5%] snap-start"
                            >
                                <div className="img-zoom card-lift aspect-[4/5] bg-ivory-dark relative">
                                    {cat.hero_image && (
                                        <img src={`/${cat.hero_image}`} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/40 transition-colors duration-700 pointer-events-none" />
                                </div>
                                <div className="text-center mt-4">
                                    <h3 className="font-display text-xl">{cat.name}</h3>
                                    <span className="block h-px w-0 group-hover:w-10 bg-gold transition-all duration-500 mx-auto mt-2" />
                                </div>
                            </Link>
                        ))}
                        {/* All Jewellery card */}
                        <Link data-card to="/category/rings" className="group shrink-0 w-[72%] sm:w-[46%] md:w-[30%] lg:w-[22.5%] snap-start">
                            <div className="img-zoom card-lift aspect-[4/5] bg-charcoal flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(176,141,87,0.4),transparent_60%)]" />
                                <span className="relative font-display text-2xl text-gold-light text-center px-4">View All<br />Jewellery</span>
                            </div>
                            <div className="text-center mt-4">
                                <h3 className="font-display text-xl">All Jewellery</h3>
                                <span className="block h-px w-0 group-hover:w-10 bg-gold transition-all duration-500 mx-auto mt-2" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Arrow({ dir, onClick, className }) {
    return (
        <button
            onClick={onClick}
            aria-label={dir < 0 ? 'Previous' : 'Next'}
            className={`hidden md:flex absolute top-[40%] -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-ivory shadow-lg border border-gold/30 items-center justify-center text-charcoal hover:bg-gold hover:text-white hover:border-gold transition-colors ${className}`}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}
