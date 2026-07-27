import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api';
import { formatPrice } from '../format';
import { useCart } from '../store';
import { useAccount } from '../account';
import Logo from './Logo';

const NAV = [
    { to: '/category/rings', label: 'Rings', cat: 'rings' },
    { to: '/category/earrings', label: 'Earrings', cat: 'earrings' },
    { to: '/category/bracelets', label: 'Bracelets', cat: 'bracelets' },
    { to: '/category/bangles', label: 'Bangles', cat: 'bangles' },
    { to: '/category/necklaces', label: 'Necklaces', cat: 'necklaces' },
    { to: '/category/pendants', label: 'Pendants', cat: 'pendants' },
    { to: '/category/pendant-sets', label: 'Pendant Sets', cat: 'pendant-sets' },
    { to: '/collections', label: 'The Edits', accent: true },
];

// Mega-menu (Angara-style): hovering a category drops a panel of ways to shop
// it. Links carry query params CategoryPage/CatalogController already honour
// (diamond_type · jadau · metal · purity · min/max_price · sort).
const DIAMOND_OPTS = [
    ['Lab-Grown Diamond', 'diamond_type=lab_grown', '#cfe3ea'],
    ['Natural Diamond', 'diamond_type=natural', '#e7dcf0'],
    ['Uncut Polki', 'diamond_type=polki', '#efe0c8'],
    ['Pure Gold', 'diamond_type=none', '#e9d9b0'],
];
const PRICE_OPTS = [
    ['Under ₹50,000', 'max_price=50000'],
    ['₹50,000 – ₹1,00,000', 'min_price=50000&max_price=100000'],
    ['₹1,00,000 – ₹2,00,000', 'min_price=100000&max_price=200000'],
    ['Above ₹2,00,000', 'min_price=200000'],
];
const METAL_OPTS = [
    ['22kt Gold', 'purity=22', '#d9b36c'],
    ['18kt Gold', 'purity=18', '#d9b36c'],
    ['14kt Gold', 'purity=14', '#d9b36c'],
    ['Yellow Gold', 'metal=yellow', '#d9b36c'],
    ['White Gold', 'metal=white', '#dcdcdc'],
    ['Rose Gold', 'metal=rose', '#dda583'],
];

function megaColumns(cat, label) {
    const base = `/category/${cat}`;
    return [
        {
            title: `Shop ${label}`,
            links: [
                [`All ${label}`, ''],
                ['New Arrivals', '?sort=newest'],
                ['Best Sellers', '?sort=featured'],
                ['Jadau & Kundan', '?jadau=1'],
            ].map(([l, qs]) => ({ label: l, to: base + qs })),
        },
        { title: 'By Diamond', links: DIAMOND_OPTS.map(([l, qs, dot]) => ({ label: l, to: `${base}?${qs}`, dot })) },
        { title: 'By Price', links: PRICE_OPTS.map(([l, qs]) => ({ label: l, to: `${base}?${qs}` })) },
        { title: 'By Metal & Purity', links: METAL_OPTS.map(([l, qs, dot]) => ({ label: l, to: `${base}?${qs}`, dot })) },
    ];
}

export default function Header() {
    const [rate, setRate] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mega, setMega] = useState(null);
    const [q, setQ] = useState('');
    const { count, setDrawerOpen } = useCart();
    const { user, wishlistCount } = useAccount();
    const navigate = useNavigate();

    // Mega-menu open/close with a short close delay so moving from the nav item
    // to the panel (crossing the seam) doesn't dismiss it.
    const closeTimer = useRef();
    const openMega = (key) => { clearTimeout(closeTimer.current); setMega(key); };
    const scheduleClose = () => { closeTimer.current = setTimeout(() => setMega(null), 140); };
    const megaCat = NAV.find((n) => n.cat === mega);

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
                <nav className="hidden lg:flex justify-center gap-8 pb-4" aria-label="Primary" onMouseLeave={scheduleClose}>
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onMouseEnter={() => openMega(item.cat ?? null)}
                            onClick={() => setMega(null)}
                            className={({ isActive }) =>
                                `text-[12px] uppercase tracking-[0.22em] pb-1 border-b transition-colors duration-300 ${
                                    isActive || mega === item.cat
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

            {/* Mega-menu panel */}
            <AnimatePresence>
                {megaCat && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 top-full hidden lg:block bg-ivory border-b border-gold/20 shadow-xl"
                        onMouseEnter={() => clearTimeout(closeTimer.current)}
                        onMouseLeave={scheduleClose}
                    >
                        <div className="max-w-7xl mx-auto px-8 py-9 grid grid-cols-5 gap-8">
                            {megaColumns(megaCat.cat, megaCat.label).map((col) => (
                                <div key={col.title}>
                                    <p className="eyebrow text-gold mb-4 !text-[10px]">{col.title}</p>
                                    <ul className="space-y-2.5">
                                        {col.links.map((l) => (
                                            <li key={l.label}>
                                                <Link
                                                    to={l.to}
                                                    onClick={() => setMega(null)}
                                                    className="group flex items-center gap-2.5 text-sm text-charcoal/70 hover:text-gold transition-colors"
                                                >
                                                    {l.dot && <span className="w-3 h-3 rounded-full border border-charcoal/10 shrink-0" style={{ background: l.dot }} />}
                                                    {l.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {/* Featured promo tile */}
                            <Link
                                to="/collections"
                                onClick={() => setMega(null)}
                                className="relative bg-charcoal text-white p-6 flex flex-col justify-end overflow-hidden group min-h-[220px]"
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(176,141,87,0.5),transparent_60%)]" />
                                <div className="relative">
                                    <p className="eyebrow text-gold-light mb-2 !text-[10px]">Curated</p>
                                    <p className="font-display text-2xl leading-tight">The Clavira Edits</p>
                                    <p className="text-[11px] text-white/60 mt-2">Bridal, Heritage Kundan, Solitaire &amp; more</p>
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-gold-light mt-4 group-hover:gap-2 transition-all">
                                        Explore <span>→</span>
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
