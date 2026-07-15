import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function SearchPage() {
    const [params] = useSearchParams();
    const q = params.get('q') ?? '';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (q.length < 2) return;
        setLoading(true);
        api.get('/search', { params: { q } })
            .then(({ data }) => setProducts(data.products))
            .finally(() => setLoading(false));
        window.scrollTo(0, 0);
    }, [q]);

    return (
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
            <h1 className="font-display text-3xl md:text-4xl text-center mb-2">Search</h1>
            <p className="text-center text-charcoal/50 mb-12">
                {loading ? 'Searching…' : `${products.length} result${products.length === 1 ? '' : 's'} for “${q}”`}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {!loading && products.length === 0 && (
                <p className="text-center py-16 font-display text-xl text-charcoal/50">
                    No pieces found — try “solitaire”, “kundan”, or “tennis”.
                </p>
            )}
        </main>
    );
}
