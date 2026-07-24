import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

export default function CollectionPage() {
    const { slug } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        setData(null);
        api.get(`/collections/${slug}`).then(({ data }) => setData(data));
        window.scrollTo(0, 0);
    }, [slug]);

    return (
        <main>
            <section className="relative h-80 md:h-96 bg-charcoal flex items-center justify-center overflow-hidden">
                {data?.collection?.hero_image && (
                    <img src={`/${data.collection.hero_image}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative text-center text-white px-4 max-w-2xl">
                    <p className="eyebrow text-gold-light mb-3">{data?.collection?.badge}</p>
                    <h1 className="font-display text-4xl md:text-5xl">{data?.collection?.name ?? ''}</h1>
                    {data?.collection?.subtitle && (
                        <p className="text-white/70 mt-4">{data.collection.subtitle}</p>
                    )}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
                {data?.collection?.description && (
                    <Reveal className="max-w-2xl mx-auto text-center mb-14">
                        <p className="font-display text-xl text-charcoal/70 leading-relaxed italic">
                            {data.collection.description}
                        </p>
                    </Reveal>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {(data?.products ?? []).map((p, i) => (
                        <Reveal key={p.id} delay={(i % 4) * 0.05} variant="zoom">
                            <ProductCard product={p} />
                        </Reveal>
                    ))}
                </div>
                {data && data.products.length === 0 && (
                    <p className="text-center py-20 font-display text-xl text-charcoal/50">
                        This edit is being curated — new pieces arriving soon.
                    </p>
                )}
            </section>
        </main>
    );
}
