import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

const PILLARS = [
    ['Designed for the Global Indian', 'Lightweight, versatile, and travel-ready — jewels that transition from boardroom to ballroom.'],
    ['Ship Worldwide', 'Fully insured international shipping to over 50 countries.'],
    ['Secure & Certified', 'Every piece arrives with BIS hallmark and IGI certificate — your assurance, anywhere in the world.'],
];

export default function NriPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/collections/nri-fusion-edit').then(({ data }) => setData(data));
        window.scrollTo(0, 0);
    }, []);

    return (
        <main>
            <section className="relative min-h-[70vh] flex items-center justify-center bg-charcoal overflow-hidden">
                <img src="/images/catalog/p54_00.jpg" alt="NRI collection" className="absolute inset-0 w-full h-full object-cover object-top opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal/50" />
                <div className="relative text-center text-white px-4 py-24 max-w-2xl">
                    <p className="eyebrow text-gold-light mb-4">NRI Collection</p>
                    <h1 className="font-display text-4xl md:text-6xl leading-tight">Carrying India,<br />Wherever You Are</h1>
                    <p className="text-white/70 mt-5">
                        Heritage soul. Contemporary spirit. For those who carry two worlds — and wear both with grace.
                    </p>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <div className="grid md:grid-cols-3 gap-6">
                    {PILLARS.map(([title, desc], i) => (
                        <Reveal key={title} delay={i * 0.08} className="border border-gold/30 p-8 text-center">
                            <div className="text-gold text-2xl mb-3">✦</div>
                            <h2 className="font-display text-xl">{title}</h2>
                            <p className="text-sm text-charcoal/60 mt-3 leading-relaxed">{desc}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-20">
                <Reveal className="text-center mb-12">
                    <p className="eyebrow text-gold mb-3">{data?.collection?.badge}</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">The NRI Fusion Edit</h2>
                </Reveal>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {(data?.products ?? []).map((p, i) => (
                        <Reveal key={p.id} delay={(i % 4) * 0.05}>
                            <ProductCard product={p} />
                        </Reveal>
                    ))}
                </div>
                <div className="text-center mt-14">
                    <Link to="/contact" className="btn-gold">Book a Virtual Consultation</Link>
                </div>
            </section>
        </main>
    );
}
