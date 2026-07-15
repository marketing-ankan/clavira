import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../api';

const NAV = [
    ['/admin', 'Dashboard', 'M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-5H4v5zm10-16v5h6V4h-6z'],
    ['/admin/products', 'Products', 'M20 7L12 3 4 7v10l8 4 8-4V7zM12 12L4 8m8 4l8-4m-8 4v9'],
    ['/admin/orders', 'Orders', 'M6 6h12l1 14H5L6 6zm3 4a3 3 0 006 0'],
    ['/admin/enquiries', 'Enquiries', 'M4 5h16v11H8l-4 4V5z'],
    ['/admin/reviews', 'Reviews', 'M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z'],
    ['/admin/consultations', 'Consultations', 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'],
    ['/admin/admins', 'Admins', 'M9 11a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6M3 20c0-3 3-5 6-5s6 2 6 5m3 0c0-2-1.5-3.5-3.5-4'],
    ['/admin/settings', 'Settings', 'M12 8a4 4 0 100 8 4 4 0 000-8zm8 4l2-1-1-3-2 .5a7 7 0 00-1.5-1.5L18 4l-3-1-1 2a7 7 0 00-2 0L11 3 8 4l.5 2.5A7 7 0 007 8l-2.5-.5L3.5 10.5 5.5 12l-2 1 1 3 2-.5A7 7 0 008 17l-.5 2.5 3 1 1-2a7 7 0 002 0l1 2 3-1-.5-2.5a7 7 0 001.5-1.5l2 .5 1-3-2-1z'],
];

export default function AdminLayout() {
    const [user, setUser] = useState(null);
    const [checked, setChecked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/admin/me')
            .then(({ data }) => setUser(data.user))
            .catch(() => navigate('/admin/login', { replace: true }))
            .finally(() => setChecked(true));
    }, [navigate]);

    const logout = async () => {
        await api.post('/admin/logout');
        navigate('/admin/login', { replace: true });
    };

    if (!checked || !user) {
        return <div className="min-h-screen bg-ivory flex items-center justify-center font-display text-xl text-charcoal/40">Clavira Admin…</div>;
    }

    return (
        <div className="min-h-screen bg-ivory-dark/50 flex">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 bg-charcoal text-white flex flex-col">
                <div className="px-5 py-6 border-b border-white/10">
                    <img src="/images/brand/clavira-wordmark.png" alt="CLAVIRA" className="h-6 w-auto" style={{ filter: 'brightness(1.15)' }} />
                    <p className="text-[10px] uppercase tracking-[0.22em] text-gold-light mt-2">Admin</p>
                </div>
                <nav className="flex-1 py-4">
                    {NAV.map(([to, label, d]) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/admin'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-5 py-3 text-[13px] tracking-wide transition-colors ${
                                    isActive ? 'bg-gold/15 text-gold-light border-r-2 border-gold' : 'text-white/60 hover:text-white'
                                }`
                            }
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d={d} /></svg>
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="px-5 py-4 border-t border-white/10 text-xs text-white/50">
                    <p className="truncate">{user.email}</p>
                    <div className="flex gap-4 mt-2">
                        <a href="/" className="text-gold-light hover:text-gold">View store</a>
                        <button onClick={logout} className="hover:text-white">Sign out</button>
                    </div>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 min-w-0 p-6 lg:p-8">
                <Outlet context={{ user }} />
            </main>
        </div>
    );
}
