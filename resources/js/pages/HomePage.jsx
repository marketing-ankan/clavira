import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import FeaturedCarousel from '../components/FeaturedCarousel';

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

export default function HomePage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/home').then(({ data }) => setData(data)).catch(() => {});
        window.scrollTo(0, 0);
    }, []);

    return (
        <main>
            {/* ---------- HERO ---------- */}
            <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-charcoal">
                <motion.img
                    src="/images/catalog/p01_01.jpg"
                    alt="Clavira fine jewellery"
                    className="absolute inset-0 w-full h-full object-cover object-top opacity-70"
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-charcoal/40" />
                <div className="relative text-center text-white px-4 max-w-3xl mx-auto pt-24 pb-16">
                    <motion.p
                        className="eyebrow text-gold-light mb-6"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}
                    >
                        Crafted for the Discerning Few
                    </motion.p>
                    <motion.h1
                        className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.08] font-medium"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 1.1 }}
                    >
                        Gold that grows in value,<br />
                        <span className="italic text-gold-light">diamonds</span> that never stop shining.
                    </motion.h1>
                    <motion.div
                        className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }}
                    >
                        <Link to="/collections" className="btn-gold">Explore the Edits</Link>
                        <Link to="/category/rings" className="btn-dark-outline">Shop Jewellery</Link>
                    </motion.div>
                    <motion.p
                        className="mt-12 text-[11px] uppercase tracking-[0.28em] text-white/60"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
                    >
                        BIS Hallmarked · IGI Certified · Est. in Excellence
                    </motion.p>
                </div>
            </section>

            {/* ---------- CATEGORIES ---------- */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <Reveal className="text-center mb-12">
                    <p className="eyebrow text-gold mb-3">Collections</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">A Curated World of Brilliance</h2>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {(data?.categories ?? []).map((cat, i) => (
                        <Reveal key={cat.id} delay={i * 0.06} variant="zoom">
                            <Link to={`/category/${cat.slug}`} className="group block relative img-zoom aspect-[4/5] bg-ivory-dark">
                                {cat.hero_image && (
                                    <img src={`/${cat.hero_image}`} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                                <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                                    <h3 className="font-display text-xl md:text-2xl">{cat.name}</h3>
                                    <p className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-white/70 mt-1">{cat.tagline}</p>
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                    {/* Craftsmanship tile completes the grid */}
                    <Reveal delay={0.42} variant="zoom">
                        <Link to="/craftsmanship" className="group block relative img-zoom aspect-[4/5] bg-charcoal">
                            <img src="/images/catalog/p49_00.jpg" alt="Clavira craftsmanship" loading="lazy" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent" />
                            <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                                <h3 className="font-display text-xl md:text-2xl">Craftsmanship</h3>
                                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-gold-light mt-1">From furnace to forever</p>
                            </div>
                        </Link>
                    </Reveal>
                </div>
            </section>

            {/* ---------- FEATURED (fanned carousel) ---------- */}
            <FeaturedCarousel products={(data?.featured ?? []).slice(0, 8)} />

            {/* ---------- JADAU HERITAGE BAND ---------- */}
            <section className="bg-charcoal text-white overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2">
                    <Reveal variant="left" className="img-zoom">
                        <img src="/images/catalog/p42_01.jpg" alt="Jadau Kundan craftsmanship" loading="lazy" className="w-full h-full object-cover min-h-[320px]" />
                    </Reveal>
                    <div className="flex flex-col justify-center p-10 lg:p-20">
                        <Reveal variant="right">
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

            {/* ---------- PROMISES ---------- */}
            <section id="promise" className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <Reveal className="text-center mb-14">
                    <p className="eyebrow text-gold mb-3">Our Promise</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">Pure Gold. Guilt-Free Brilliance.</h2>
                </Reveal>
                <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
                    <div>
                        <h3 className="font-display text-2xl text-center mb-8">The Gold Promise</h3>
                        <div className="grid grid-cols-2 gap-5">
                            {GOLD_PROMISES.map(([title, desc], i) => (
                                <Reveal key={title} delay={i * 0.05} variant="zoom" className="border border-gold/30 p-6 text-center">
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
                                <Reveal key={title} delay={i * 0.05} variant="zoom" className="border border-gold/30 p-6 text-center bg-charcoal text-white">
                                    <p className="font-display text-xl text-gold-light">{title}</p>
                                    <p className="text-xs text-white/60 mt-2 leading-relaxed">{desc}</p>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------- THE EDITS ---------- */}
            <section className="bg-ivory-dark/60 py-20">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <Reveal className="text-center mb-12">
                        <p className="eyebrow text-gold mb-3">Special Collections</p>
                        <h2 className="font-display text-3xl md:text-4xl gold-rule">The Clavira Edits</h2>
                    </Reveal>
                    <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
                        {(data?.collections ?? []).map((col, i) => (
                            <Link
                                key={col.id}
                                to={`/collections/${col.slug}`}
                                className="group shrink-0 w-64 md:w-72 snap-start"
                            >
                                <div className="img-zoom aspect-[3/4] bg-ivory-dark relative">
                                    {col.hero_image && (
                                        <img src={`/${col.hero_image}`} alt={col.name} loading="lazy" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
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

            {/* ---------- NRI BAND ---------- */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <div className="grid lg:grid-cols-2 bg-charcoal text-white overflow-hidden">
                    <div className="flex flex-col justify-center p-10 lg:p-16 order-2 lg:order-1">
                        <Reveal variant="left">
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
                    <Reveal variant="right" className="img-zoom order-1 lg:order-2">
                        <img src="/images/catalog/d2-necklace-12.jpg" alt="NRI collection" loading="lazy" className="w-full h-full object-cover min-h-[300px]" />
                    </Reveal>
                </div>
            </section>
        </main>
    );
}
