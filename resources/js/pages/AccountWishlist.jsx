import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { useAccount } from '../account';

export default function AccountWishlist() {
    const { wishlistIds } = useAccount();
    const [items, setItems] = useState(null);

    const load = () => api.get('/wishlist').then(({ data }) => setItems(data.items));
    useEffect(() => { load(); }, []);
    // reflect toggles made from the cards
    useEffect(() => { if (items) load(); /* eslint-disable-next-line */ }, [wishlistIds.length]);

    if (!items) return <p className="text-charcoal/60">Loading…</p>;

    return (
        <div>
            <h2 className="font-display text-xl mb-5">Your wishlist</h2>
            {items.length === 0 ? (
                <p className="text-charcoal/60 text-sm border border-gold/20 px-4 py-10 text-center">
                    Your wishlist is empty. Tap the ♥ on any piece to save it here.{' '}
                    <Link to="/collections" className="text-gold underline">Explore the Edits</Link>.
                </p>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((p, i) => (
                        <Reveal key={p.id} delay={(i % 3) * 0.05} variant="zoom">
                            <ProductCard product={p} />
                        </Reveal>
                    ))}
                </div>
            )}
        </div>
    );
}
