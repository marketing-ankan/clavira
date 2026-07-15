import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api';
import { formatPrice } from '../format';
import { useCart } from '../store';
import { useAccount } from '../account';
import Logo from './Logo';

const NAV = [
    { to: '/category/rings', label: 'Rings' },
    { to: '/category/earrings', label: 'Earrings' },
    { to: '/category/bracelets', label: 'Bracelets' },
    { to: '/category/bangles', label: 'Bangles' },
    { to: '/category/necklaces', label: 'Necklaces' },
    { to: '/category/pendants', label: 'Pendants' },
    { to: '/category/pendant-sets', label: 'Pendant Sets' },
    { to: '/collections', label: 'The Edits', accent: true },
];

export default function Header() {
    const [rate, setRate] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [q, setQ] = useState('');
    const { count, setDrawerOpen } = useCart();
    const { user, wishlistCount } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/gold-rate').then(({ data }) => setRate(data.gold_rate)).catch(() => {});
    }, []);

    // While the mobile drawer is open: lock background scroll and let Escape close it.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const submitSearch = (e) => {
        e.preventDefault();
        if (q.trim().length > 1) {
            navigate(`/search?q=${encodeURIComponent(q.trim())}`);
            setSearchOpen(false);
            setQ('');
        }
    };

    const tickerItems = [
        rate && `Today's Gold Rate — 24kt ${formatPrice(rate.rate_24k)}/g · 22kt ${formatPrice(rate.rate_22k)}/g · 18kt ${formatPrice(rate.rate_18k)}/g`,
        'BIS Hallmarked · IGI Certified',
        'Zero deductions on gold exchange · 98% gold value return',
        '70% diamond value return · Lifetime exchange promise',
        'Insured worldwide shipping to 50+ countries',
    ].filter(Boolean);

    return (
        <>
        <header className="sticky top-0 z-50 bg-ivory/95 backdrop-blur border-b border-gold/20">
            {/* Announcement ticker */}
            <div className="bg-charcoal text-gold-light overflow-hidden py-1.5" aria-label="Announcements">
                <div className="ticker-track flex whitespace-nowrap w-max">
                    {[0, 1].map((dup) => (
                        <div key={dup} className="flex" aria-hidden={dup === 1}>
                            {tickerItems.map((item, i) => (
                                <span key={i} className="mx-8 text-[11px] tracking-[0.18em] uppercase">
                                    {item} <span className="text-gold mx-2">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main bar */}
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
                <div className="flex items-center justify-between py-4">
                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden p-2 -ml-2"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 6h18M3 12h18M3 18h18" />
                        </svg>
                    </button>

                    <Logo />

                    <div className="flex items-center gap-1 md:gap-3">
                        <button className="p-2" onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                        </button>
                        <Link to="/verify" className="hidden md:inline-flex p-2" aria-label="Verify certificate" title="Verify Certificate">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        </Link>
                        <Link to="/account/wishlist" className="hidden md:inline-flex p-2 relative" aria-label={`Wishlist, ${wishlistCount} items`} title="Wishlist">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z" />
                            </svg>
                            {wishlistCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-gold text-white text-[10px] min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>
                        <Link to={user ? '/account' : '/account/login'} className="p-2" aria-label={user ? 'My account' : 'Sign in'} title={user ? 'My account' : 'Sign in'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                            </svg>
                        </Link>
                        <button className="p-2 relative" onClick={() => setDrawerOpen(true)} aria-label={`Cart, ${count} items`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M6 8h12l-1 12H7L6 8z" />
                                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                            </svg>
                            {count > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-gold text-white text-[10px] w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center">
                                    {count}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Desktop nav */}
                <nav className="hidden lg:flex justify-center gap-8 pb-4" aria-label="Primary">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `text-[12px] uppercase tracking-[0.22em] pb-1 border-b transition-colors duration-300 ${
                                    isActive
                                        ? 'text-gold border-gold'
                                        : `border-transparent hover:text-gold ${item.accent ? 'text-gold' : 'text-charcoal'}`
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Search overlay */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute inset-x-0 top-full bg-ivory border-b border-gold/20 shadow-lg"
                    >
                        <form onSubmit={submitSearch} className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-5">
                            <input
                                autoFocus
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search solitaires, jhumkas, kundan…"
                                className="flex-1 bg-transparent border-b border-gold/50 focus:border-gold pb-2 text-lg font-display"
                                aria-label="Search products"
                            />
                            <button type="submit" className="btn-gold !py-2.5 !px-5">Search</button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile drawer is rendered via a portal below, outside this
                backdrop-blurred <header> — a backdrop-filter ancestor becomes
                the containing block for position:fixed, which would otherwise
                trap the drawer inside the header's bounds. */}
        </header>

        {/* Mobile drawer — portaled to <body> so `fixed` anchors to the viewport
            and it slides in full-height from the left. */}
        {createPortal(
            <AnimatePresence>
                {menuOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[60]"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMenuOpen(false)}
                        />
                        <motion.aside
                            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-ivory z-[70] p-8 overflow-y-auto shadow-2xl"
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            aria-label="Menu"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <Logo />
                                <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M6 6l12 12M18 6L6 18" />
                                    </svg>
                                </button>
                            </div>
                            <nav className="flex flex-col gap-5" aria-label="Mobile">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMenuOpen(false)}
                                        className="font-display text-2xl text-charcoal hover:text-gold transition-colors"
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                                <div className="border-t border-gold/30 pt-5 mt-2 flex flex-col gap-4">
                                    <Link to="/craftsmanship" onClick={() => setMenuOpen(false)} className="eyebrow text-gold">Craftsmanship</Link>
                                    <Link to="/verify" onClick={() => setMenuOpen(false)} className="eyebrow text-gold">Verify Certificate</Link>
                                    <Link to="/nri" onClick={() => setMenuOpen(false)} className="eyebrow text-gold">NRI Collection</Link>
                                </div>
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>,
            document.body,
        )}
        </>
    );
}
