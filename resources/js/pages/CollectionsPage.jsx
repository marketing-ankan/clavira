import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Reveal from '../components/Reveal';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);

    useEffect(() => {
        api.get('/collections').then(({ data }) => setCollections(data.collections));
        window.scrollTo(0, 0);
    }, []);

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">Special Collections</p>
                <h1 className="font-display text-4xl md:text-5xl">The Clavira Edits</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto">
                    Curated worlds of brilliance — each edit a chapter of heritage, artistry, and light.
                </p>
            </section>

            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {collections.map((col, i) => (
                        <Reveal key={col.id} delay={(i % 3) * 0.07}>
                            <Link to={`/collections/${col.slug}`} className="group block">
                                <div className="img-zoom aspect-[4/5] bg-ivory-dark relative">
                                    {col.hero_image && (
                                        <img src={`/${col.hero_image}`} alt={col.name} loading="lazy" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-0 p-6 text-white">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-light">{col.badge}</p>
                                        <h2 className="font-display text-2xl mt-1">{col.name}</h2>
                                        <p className="text-white/70 text-sm mt-2 leading-relaxed">{col.subtitle}</p>
                                    </div>
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </section>
        </main>
    );
}
