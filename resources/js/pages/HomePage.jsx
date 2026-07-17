import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import api from '../api';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import TestimonialBand from '../components/TestimonialBand';
import Counter from '../components/Counter';

const GOLD_PROMISES = [
    ['BIS Hallmarked', 'Every piece certified by the Bureau of Indian Standards'],
    ['14kt, 18kt & 22kt', 'Select your purity — certified and guaranteed'],
    ['Zero Deduction', 'Exchange your gold with no making-charge deduction'],
    ['98% Return', 'Industry-leading gold buyback value'],
];

const DIAMOND_PROMISES = [
    ['VVS Clarity', 'Near-flawless diamonds, visually perfect to the naked eye'],
    ['E–F Colour', 'Exceptional whiteness — the highest tier of diamond colour'],
    ['IGI Certified', 'Every stone independently graded and certified'],
    ['70% Return', 'Diamond value return backed by our lifetime exchange promise'],
];

const STATS = [
    { value: 98, suffix: '%', label: 'Gold buyback value' },
    { value: 70, suffix: '%', label: 'Diamond value return' },
    { value: 0, suffix: '', label: 'Making-charge deductions' },
    { value: 50, suffix: '+', label: 'Countries shipped, insured' },
];

const TRUST_BADGES = [
    ['BIS', 'Hallmarked Gold'],
    ['IGI', 'Certified Diamonds'],
    ['∞', 'Lifetime Exchange'],
    ['✈', 'Insured Worldwide'],
];

/** Slight vertical drift as a band scrolls through the viewport. */
function ParallaxImg({ src, alt, className = '' }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

    return (
        <div ref={ref} className={`overflow-hidden ${className}`}>
            <motion.img
                src={src}
                alt={alt}
                loading="lazy"
                style={{ y }}
                className="w-full h-[112%] object-cover scale-[1.08]"
            />
        </div>
    );
}

const heroLine = {
    hidden: { y: '110%' },
    show: (i) => ({
        y: 0,
        transition: { delay: 0.45 + i * 0.18, duration: 1.15, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function HomePage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/home').then(({ data }) => setData(data)).catch(() => {});
        window.scrollTo(0, 0);
    }, []);

    return (
        <main>
            {/* ---------- HERO ---------- */}
            <section className="relative min-h-[92vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-charcoal">
                <img
                    src="/images/catalog/p01_01.jpg"
                    alt="Clavira fine jewellery"
                    className="ken-burns absolute inset-0 w-full h-full object-cover object-top opacity-70"
                />
                {/* Layered cinematic vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/25 to-charcoal/45" />
                <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_42%,transparent_0%,rgba(0,0,0,0.34)_100%)]" />
                <div className="hero-frame" aria-hidden="true" />

                <div className="relative text-center text-white px-6 max-w-4xl mx-auto pt-24 pb-20">
                    <motion.p
                        className="eyebrow text-gold-light mb-7"
                        initial={{ opacity: 0, letterSpacing: '0.55em' }}
                        animate={{ opacity: 1, letterSpacing: '0.3em' }}
                        transition={{ delay: 0.25, duration: 1.4, ease: 'easeOut' }}
                    >
                        Crafted for the Discerning Few
                    </motion.p>
                    <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.06] font-medium">
                        <span className="block overflow-hidden pb-1">
                            <motion.span className="block" variants={heroLine} initial="hidden" animate="show" custom={0}>
                                Gold that grows in value,
                            </motion.span>
                        </span>
                        <span className="block overflow-hidden pb-2">
                            <motion.span className="block" variants={heroLine} initial="hidden" animate="show" custom={1}>
                                <span className="italic text-gold-light">diamonds</span> that never stop shining.
                            </motion.span>
                        </span>
                    </h1>
                    <motion.div
                        className="mt-11 flex flex-col sm:flex-row gap-4 justify-center"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 1 }}
                    >
                        <Link to="/collections" className="btn-gold">Explore the Edits</Link>
                        <Link to="/category/rings" className="btn-dark-outline">Shop Jewellery</Link>
                    </motion.div>
                    <motion.p
                        className="mt-12 text-[11px] uppercase tracking-[0.28em] text-white/60"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }}
                    >
                        BIS Hallmarked <span className="text-gold/70 mx-1.5">✦</span> IGI Certified <span className="text-gold/70 mx-1.5">✦</span> Est. in Excellence
                    </motion.p>
                </div>

                <motion.div
                    className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9, duration: 1 }}
                    aria-hidden="true"
                >
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">Discover</span>
                    <span className="scroll-cue" />
                </motion.div>
            </section>

            {/* ---------- TRUST STRIP ---------- */}
            <section className="border-b border-gold/15 bg-ivory">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4">
                    {TRUST_BADGES.map(([mark, label], i) => (
                        <Reveal key={label} delay={i * 0.07} className="flex items-center justify-center gap-3 py-6 md:py-7">
                            <span className="font-display text-xl md:text-2xl text-gold leading-none">{mark}</span>
                            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-charcoal/60">{label}</span>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ---------- CATEGORIES ---------- */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-24">
                <Reveal className="text-center mb-14">
                    <p className="eyebrow text-gold mb-3">Collections</p>
                    <h2 className="font-display text-3xl md:text-5xl gold-rule">A Curated World of Brilliance</h2>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {(data?.categories ?? []).map((cat, i) => (
                        <Reveal key={cat.id} delay={i * 0.06}>
                            <Link to={`/category/${cat.slug}`} className="group block relative img-zoom card-lift aspect-[4/5] bg-ivory-dark">
                                {cat.hero_image && (
                                    <img src={`/${cat.hero_image}`} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                                <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/40 transition-colors duration-700 pointer-events-none" />
                                <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                                    <h3 className="font-display text-xl md:text-2xl">{cat.name}</h3>
                                    <p className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-white/70 mt-1">{cat.tagline}</p>
                                    <span className="block h-px w-0 group-hover:w-12 bg-gold-light transition-all duration-700 mt-3" />
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                    {/* Craftsmanship tile completes the grid */}
                    <Reveal delay={0.42}>
                        <Link to="/craftsmanship" className="group block relative img-zoom card-lift aspect-[4/5] bg-charcoal">
                            <img src="/images/catalog/p49_00.jpg" alt="Clavira craftsmanship" loading="lazy" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent" />
                            <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/40 transition-colors duration-700 pointer-events-none" />
                            <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                                <h3 className="font-display text-xl md:text-2xl">Craftsmanship</h3>
                                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-gold-light mt-1">From furnace to forever</p>
                                <span className="block h-px w-0 group-hover:w-12 bg-gold-light transition-all duration-700 mt-3" />
                            </div>
                        </Link>
                    </Reveal>
                </div>
            </section>

            {/* ---------- FEATURED ---------- */}
            <section className="bg-ivory-dark/60 py-24">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <Reveal className="text-center mb-14">
                        <p className="eyebrow text-gold mb-3">Signature Pieces</p>
                        <h2 className="font-display text-3xl md:text-5xl gold-rule">Exceptional Stones. Exceptional Settings.</h2>
                    </Reveal>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {(data?.featured ?? []).slice(0, 8).map((p, i) => (
                            <Reveal key={p.id} delay={i * 0.05}>
                                <ProductCard product={p} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------- JADAU HERITAGE BAND (parallax) ---------- */}
            <section className="bg-charcoal text-white overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2">
                    <ParallaxImg src="/images/catalog/p42_01.jpg" alt="Jadau Kundan craftsmanship" className="min-h-[320px]" />
                    <div className="flex flex-col justify-center p-10 lg:p-20">
                        <Reveal>
                            <p className="eyebrow text-gold-light mb-4">Jadau Kundan</p>
                            <h2 className="font-display text-3xl md:text-5xl leading-tight">Jadau — Reimagined</h2>
                            <p className="mt-6 text-white/70 leading-relaxed max-w-lg">
                                Rooted in Rajputana heritage, Jadau is the art of setting uncut stones into gold
                                with exquisite precision. Finished with the luminous grace of Kundan work, each
                                piece carries a timeless sense of regal elegance.
                            </p>
                            <Link to="/collections/heritage-kundan-edit" className="btn-dark-outline mt-8 self-start">
                                The Heritage Kundan Edit
                            </Link>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ---------- PROMISE COUNTERS ---------- */}
            <section id="promise" className="max-w-7xl mx-auto px-4 lg:px-8 py-24">
                <Reveal className="text-center mb-14">
                    <p className="eyebrow text-gold mb-3">Our Promise</p>
                    <h2 className="font-display text-3xl md:text-5xl gold-rule">Pure Gold. Guilt-Free Brilliance.</h2>
                </Reveal>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gold/20 border border-gold/20 mb-16">
                    {STATS.map(({ value, suffix, label }, i) => (
                        <Reveal key={label} delay={i * 0.08} className="bg-ivory text-center py-10 px-4">
                            <p className="font-display text-4xl md:text-5xl text-gold">
                                <Counter value={value} suffix={suffix} />
                            </p>
                            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-charcoal/60 mt-3">{label}</p>
                        </Reveal>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
                    <div>
                        <h3 className="font-display text-2xl text-center mb-8">The Gold Promise</h3>
                        <div className="grid grid-cols-2 gap-5">
                            {GOLD_PROMISES.map(([title, desc], i) => (
                                <Reveal key={title} delay={i * 0.05} className="border border-gold/30 p-6 text-center">
                                    <p className="font-display text-xl text-gold">{title}</p>
                                    <p className="text-xs text-charcoal/60 mt-2 leading-relaxed">{desc}</p>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-display text-2xl text-center mb-8">The Diamond Promise</h3>
                        <div className="grid grid-cols-2 gap-5">
                            {DIAMOND_PROMISES.map(([title, desc], i) => (
                                <Reveal key={title} delay={i * 0.05} className="border border-gold/30 p-6 text-center bg-charcoal text-white">
                                    <p className="font-display text-xl text-gold-light">{title}</p>
                                    <p className="text-xs text-white/60 mt-2 leading-relaxed">{desc}</p>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- THE EDITS ---------- */}
            <section className="bg-ivory-dark/60 py-24">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <Reveal className="text-center mb-14">
                        <p className="eyebrow text-gold mb-3">Special Collections</p>
                        <h2 className="font-display text-3xl md:text-5xl gold-rule">The Clavira Edits</h2>
                    </Reveal>
                    <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
                        {(data?.collections ?? []).map((col) => (
                            <Link
                                key={col.id}
                                to={`/collections/${col.slug}`}
                                className="group shrink-0 w-64 md:w-72 snap-start"
                            >
                                <div className="img-zoom card-lift aspect-[3/4] bg-ivory-dark relative">
                                    {col.hero_image && (
                                        <img src={`/${col.hero_image}`} alt={col.name} loading="lazy" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                                    <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/40 transition-colors duration-700 pointer-events-none" />
                                    <div className="absolute bottom-0 p-5 text-white">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-light">{col.badge}</p>
                                        <h3 className="font-display text-xl leading-snug mt-1">{col.name}</h3>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------- CUSTOMER WORDS ---------- */}
            <TestimonialBand testimonials={data?.testimonials} />

            {/* ---------- NRI BAND (parallax) ---------- */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-24">
                <div className="grid lg:grid-cols-2 bg-charcoal text-white overflow-hidden">
                    <div className="flex flex-col justify-center p-10 lg:p-16 order-2 lg:order-1">
                        <Reveal>
                            <p className="eyebrow text-gold-light mb-4">NRI Collection</p>
                            <h2 className="font-display text-3xl md:text-4xl leading-tight">Carrying India, Wherever You Are</h2>
                            <ul className="mt-6 space-y-3 text-white/70 text-sm leading-relaxed">
                                <li>✦ Designed for the global Indian — boardroom to ballroom</li>
                                <li>✦ Fully insured international shipping to 50+ countries</li>
                                <li>✦ Every piece arrives with BIS hallmark and IGI certificate</li>
                            </ul>
                            <Link to="/nri" className="btn-dark-outline mt-8 self-start">Explore NRI Fusion</Link>
                        </Reveal>
                    </div>
                    <ParallaxImg src="/images/catalog/p54_00.jpg" alt="NRI collection" className="min-h-[300px] order-1 lg:order-2" />
                </div>
            </section>
        </main>
    );
}
