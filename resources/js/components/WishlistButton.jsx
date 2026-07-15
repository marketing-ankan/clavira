import { useState } from 'react';
import { useAccount } from '../account';

export default function WishlistButton({ productId, className = '', floating = false }) {
    const { inWishlist, toggleWishlist } = useAccount();
    const [busy, setBusy] = useState(false);
    const active = inWishlist(productId);

    const onClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
            await toggleWishlist(productId);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            onClick={onClick}
            aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={active}
            className={`${floating ? 'absolute top-3 right-3 z-10 bg-white/85 hover:bg-white w-9 h-9 rounded-full flex items-center justify-center shadow-sm' : ''} transition-colors ${className}`}
        >
            <svg width="18" height="18" viewBox="0 0 24 24"
                fill={active ? '#b08d57' : 'none'}
                stroke={active ? '#b08d57' : 'currentColor'} strokeWidth="1.6">
                <path d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z" />
            </svg>
        </button>
    );
}
