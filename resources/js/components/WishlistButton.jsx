import { useState } from 'react';
import { useAccount } from '../account';

// `rail`     — square tile that sits in the product card's hover action rail
// `floating` — circular chip pinned over an image (featured carousel)
// neither    — bare icon, inherits the surrounding text colour (PDP heading)
const SHELL = {
    rail: 'w-9 h-9 bg-white text-gold shadow-sm hover:bg-gold hover:text-white flex items-center justify-center',
    floating:
        'absolute top-3 right-3 z-10 bg-white/85 hover:bg-white w-9 h-9 rounded-full flex items-center justify-center shadow-sm',
};

export default function WishlistButton({ productId, productName, className = '', floating = false, variant }) {
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

    const shell = SHELL[variant ?? (floating ? 'floating' : '')] ?? '';

    return (
        <button
            type="button"
            onClick={onClick}
            // A toggle button keeps a STABLE name and lets aria-pressed carry the
            // state — "Remove from wishlist, pressed" contradicts itself. The
            // product name disambiguates 24 identical buttons in a grid.
            aria-label={productName ? `Wishlist: ${productName}` : 'Wishlist'}
            aria-pressed={active}
            aria-busy={busy || undefined}
            className={`${shell} transition-colors ${className}`}
        >
            {/* currentColor, not a literal — the palette switcher rebinds gold at
                runtime and a hardcoded hex would survive the reskin. */}
            {/* Filled vs outline carries the state, so the glyph can take the
                shell's colour and stay legible against a gold hover fill. */}
            <svg
                width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
                fill={active ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.6"
            >
                <path d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z" />
            </svg>
        </button>
    );
}
