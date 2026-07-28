import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

const SORTS = [
    ['featured', 'Featured'],
    ['price_asc', 'Price: Low to High'],
    ['price_desc', 'Price: High to Low'],
    ['newest', 'Newest'],
];

const DIAMOND_FILTERS = [
    ['', 'All'],
    ['lab_grown', 'Lab-Grown'],
    ['natural', 'Natural'],
    ['polki', 'Polki'],
];

export default function CategoryPage() {
    const { slug } = useParams();
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const sort = params.get('sort') ?? 'featured';
    const diamond = params.get('diamond_type') ?? '';
    const jadau = params.get('jadau') ?? '';
    const metal = params.get('metal') ?? '';
    const purity = params.get('purity') ?? '';
    const minPrice = params.get('min_price') ?? '';
    const maxPrice = params.get('max_price') ?? '';
    const page = params.get('page') ?? '1';

    useEffect(() => {
        setLoading(true);
        api.get(`/categories/${slug}`, {
            params: {
                sort,
                diamond_type: diamond || undefined,
                jadau: jadau || undefined,
                metal: metal || undefined,
                purity: purity || undefined,
                min_price: minPrice || undefined,
                max_price: maxPrice || undefined,
                page,
            },
        })
            .then(({ data }) => setData(data))
            .finally(() => setLoading(false));
        window.scrollTo(0, 0);
    }, [slug, sort, diamond, jadau, metal, purity, minPrice, maxPrice, page]);

    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        value ? next.set(key, value) : next.delete(key);
        next.delete('page');
        setParams(next);
    };

    const products = data?.products;

    return (
        <main>
            {/* Category hero */}
            <section className="relative h-64 md:h-80 bg-charcoal flex items-center justify-center overflow-hidden">
                {data?.category?.hero_image && (
                    <img src={`/${data.category.hero_image}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative text-center text-white px-4">
                    <p className="eyebrow text-gold-light mb-3">Clavira Collections</p>
                    <h1 className="font-display text-4xl md:text-5xl">{data?.category?.name ?? ''}</h1>
                    {data?.category?.tagline && (
                        <p className="text-white/60 text-sm tracking-[0.15em] uppercase mt-3">{data.category.tagline}</p>
                    )}
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 pb-5 mb-10">
                    <div className="flex flex-wrap items-center gap-2">
                        {DIAMOND_FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setParam('diamond_type', value)}
                                className={`text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors ${
                                    diamond === value
                                        ? 'border-gold bg-gold text-white'
                                        : 'border-gold/30 text-charcoal/70 hover:border-gold'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-charcoal/60">
                        Sort
                        <select
                            value={sort}
                            onChange={(e) => setParam('sort', e.target.value)}
                            className="border border-gold/30 bg-transparent px-3 py-2 text-charcoal"
                        >
                            {SORTS.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {/* Mirrors the real tile's full height — image + text block
                            + CTA — so the loaded grid doesn't jump. */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white border border-gold/15">
                                <div className="aspect-square bg-ivory-dark animate-pulse" />
                                <div className="px-3 pt-4 pb-3 space-y-2">
                                    <div className="h-2.5 bg-ivory-dark animate-pulse w-1/2 mx-auto" />
                                    <div className="h-4 bg-ivory-dark animate-pulse w-4/5 mx-auto" />
                                    <div className="h-4 bg-ivory-dark animate-pulse w-1/3 mx-auto" />
                                </div>
                                <div className="px-3 pb-3">
                                    <div className="h-9 bg-ivory-dark animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            {(products?.data ?? []).map((p, i) => (
                                <Reveal key={p.id} delay={(i % 4) * 0.05} variant="zoom">
                                    <ProductCard product={p} />
                                </Reveal>
                            ))}
                        </div>
                        {products?.data?.length === 0 && (
                            <p className="text-center py-20 font-display text-xl text-charcoal/50">
                                No pieces match these filters yet.
                            </p>
                        )}
                        {/* Pagination */}
                        {products && products.last_page > 1 && (
                            <div className="flex justify-center gap-2 mt-14">
                                {Array.from({ length: products.last_page }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setParam('page', String(i + 1))}
                                        className={`w-10 h-10 border text-sm ${
                                            products.current_page === i + 1
                                                ? 'border-gold bg-gold text-white'
                                                : 'border-gold/30 hover:border-gold'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
