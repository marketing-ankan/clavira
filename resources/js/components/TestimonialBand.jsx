import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Reveal from './Reveal';

function Stars({ n }) {
    return (
        <div className="flex justify-center gap-1 text-gold" aria-label={`${n} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2">
                    <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9L12 2.6z" />
                </svg>
            ))}
        </div>
    );
}

/** Auto-advancing customer-voice carousel fed by approved reviews. */
export default function TestimonialBand({ testimonials }) {
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (!testimonials || testimonials.length < 2) return;
        const t = setInterval(() => setIdx((i) => (i + 1) % testimonials.length), 6000);
        return () => clearInterval(t);
    }, [testimonials]);

    if (!testimonials?.length) return null;
    const r = testimonials[idx];

    return (
        <section className="bg-charcoal text-white py-20 overflow-hidden" aria-label="Customer words">
            <div className="max-w-3xl mx-auto px-4 text-center relative">
                <Reveal>
                    <p className="eyebrow text-gold-light mb-3">Customer Words</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">Loved. Worn. Treasured.</h2>
                </Reveal>
                <div className="mt-12 min-h-[190px]">
                    <AnimatePresence mode="wait">
                        <motion.blockquote
                            key={r.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -14 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Stars n={r.rating} />
                            <p className="font-display text-xl md:text-2xl leading-relaxed italic text-white/90 mt-6">
                                “{r.body}”
                            </p>
                            <footer className="mt-6 text-[11px] uppercase tracking-[0.24em] text-white/60">
                                {r.name}
                                {r.product_name && (
                                    <>
                                        {' '}·{' '}
                                        <Link to={`/product/${r.product_slug}`} className="text-gold-light hover:text-gold transition-colors">
                                            {r.product_name}
                                        </Link>
                                    </>
                                )}
                            </footer>
                        </motion.blockquote>
                    </AnimatePresence>
                </div>
                {testimonials.length > 1 && (
                    <div className="flex justify-center gap-2.5 mt-8" role="tablist" aria-label="Testimonials">
                        {testimonials.map((t, i) => (
                            <button
                                key={t.id}
                                onClick={() => setIdx(i)}
                                aria-label={`Testimonial ${i + 1}`}
                                aria-selected={i === idx}
                                role="tab"
                                className={`h-1 transition-all duration-500 ${i === idx ? 'w-8 bg-gold' : 'w-3 bg-white/25 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
