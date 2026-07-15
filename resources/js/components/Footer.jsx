import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Logo from './Logo';

function Newsletter() {
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await api.post('/newsletter', { email, source: 'footer' });
            setMsg(data.message);
            setEmail('');
        } catch {
            setMsg('Please enter a valid email.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <h3 className="eyebrow text-gold mb-4">The Clavira Circle</h3>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">New collections, private previews and the stories behind our craft.</p>
            {msg ? (
                <p className="text-sm text-gold-light">{msg}</p>
            ) : (
                <form onSubmit={submit} className="flex">
                    <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email"
                        className="flex-1 min-w-0 bg-transparent border border-white/25 focus:border-gold px-3 py-2.5 text-sm text-white placeholder:text-white/40"
                    />
                    <button type="submit" disabled={busy} className="bg-gold text-white px-4 text-xs uppercase tracking-[0.15em] hover:bg-gold-light transition-colors">
                        Join
                    </button>
                </form>
            )}
        </div>
    );
}

const LINKS = {
    Collections: [
        ['Rings', '/category/rings'],
        ['Necklaces', '/category/necklaces'],
        ['Bangles', '/category/bangles'],
        ['The Edits', '/collections'],
        ['Bridal', '/collections/bridal-edit'],
        ['NRI Collection', '/nri'],
    ],
    House: [
        ['Craftsmanship', '/craftsmanship'],
        ['Book a Consultation', '/consultation'],
        ['Verify Certificate', '/verify'],
        ['My Account', '/account'],
        ['Contact Us', '/contact'],
    ],
    Policies: [
        ['Shipping', '/policies/shipping'],
        ['Returns & Exchange', '/policies/returns'],
        ['Exchange Promise', '/policies/exchange'],
        ['Privacy', '/policies/privacy'],
        ['Terms', '/policies/terms'],
    ],
};

export default function Footer() {
    return (
        <footer className="bg-charcoal text-white/80 mt-24">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
                    <div className="col-span-2">
                        <Logo light />
                        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
                            Heritage shaped by master craftsmanship, and brilliance refined into a curated
                            collection of exceptional jewellery. Crafted for the discerning few.
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[11px] uppercase tracking-[0.2em] text-gold-light">
                            <span>BIS Hallmarked</span>
                            <span>IGI Certified</span>
                            <span>Est. in Excellence</span>
                        </div>
                        <div className="mt-8 max-w-sm">
                            <Newsletter />
                        </div>
                    </div>

                    {Object.entries(LINKS).map(([title, links]) => (
                        <nav key={title} aria-label={title}>
                            <h3 className="eyebrow text-gold mb-5">{title}</h3>
                            <ul className="space-y-3">
                                {links.map(([label, to]) => (
                                    <li key={to}>
                                        <Link to={to} className="text-sm text-white/70 hover:text-gold-light transition-colors">
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="border-t border-white/10 mt-14 pt-8 grid gap-4 md:flex md:items-center md:justify-between">
                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} Clavira. All rights reserved.
                    </p>
                    <p className="text-xs text-white/40 max-w-xl">
                        Designs shown are curated references; final creations may vary with customization.
                        Lab-grown diamonds standard; natural diamonds available on request.
                    </p>
                </div>
            </div>
        </footer>
    );
}
