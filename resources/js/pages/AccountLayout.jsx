import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAccount } from '../account';

const TABS = [
    ['/account', 'Overview'],
    ['/account/orders', 'Orders'],
    ['/account/wishlist', 'Wishlist'],
    ['/account/addresses', 'Addresses'],
];

export default function AccountLayout() {
    const { user, ready, logout } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        if (ready && !user) navigate('/account/login', { replace: true });
        window.scrollTo(0, 0);
    }, [ready, user, navigate]);

    if (!ready || !user) {
        return <main className="min-h-[60vh] flex items-center justify-center font-display text-xl text-charcoal/40">Loading…</main>;
    }

    const signOut = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <main className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
            <div className="text-center mb-10">
                <p className="eyebrow text-gold mb-2">My Account</p>
                <h1 className="font-display text-3xl md:text-4xl">Hello, {user.name.split(' ')[0]}</h1>
            </div>

            <div className="grid lg:grid-cols-[220px_1fr] gap-8">
                <aside>
                    <nav className="flex lg:flex-col gap-1 overflow-x-auto">
                        {TABS.map(([to, label]) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/account'}
                                className={({ isActive }) =>
                                    `px-4 py-3 text-sm tracking-wide whitespace-nowrap border-b-2 lg:border-b-0 lg:border-l-2 transition-colors ${
                                        isActive ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-charcoal/60 hover:text-gold'
                                    }`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        <button onClick={signOut} className="px-4 py-3 text-sm tracking-wide text-left text-charcoal/50 hover:text-maroon">
                            Sign out
                        </button>
                    </nav>
                </aside>

                <div className="min-w-0">
                    <Outlet context={{ user }} />
                </div>
            </div>
        </main>
    );
}
