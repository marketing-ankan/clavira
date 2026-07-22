import { useEffect, useState } from 'react';
import api from '../api';
import { useAccount } from '../account';
import Stars from './Stars';

export default function ProductReviews({ slug }) {
    const { user } = useAccount();
    const [data, setData] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', rating: 0, title: '', body: '' });
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => api.get(`/products/${slug}/reviews`).then(({ data }) => setData(data));
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

    useEffect(() => {
        if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }));
    }, [user]);

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setMsg('');
        if (!form.rating) return setError('Please select a star rating.');
        setBusy(true);
        try {
            const { data } = await api.post(`/products/${slug}/reviews`, form);
            setMsg(data.message);
            setShowForm(false);
            setForm({ name: user?.name ?? '', email: user?.email ?? '', rating: 0, title: '', body: '' });
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : 'Could not submit your review.');
        } finally {
            setBusy(false);
        }
    };

    if (!data) return null;
    const { reviews, summary } = data;

    return (
        <section className="mt-20 border-t border-gold/20 pt-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="font-display text-3xl">Reviews</h2>
                    {summary.count > 0 ? (
                        <div className="flex items-center gap-3 mt-2">
                            <Stars value={summary.average} size={18} />
                            <span className="text-sm text-charcoal/60">{summary.average} · {summary.count} review{summary.count === 1 ? '' : 's'}</span>
                        </div>
                    ) : (
                        <p className="text-sm text-charcoal/50 mt-2">Be the first to review this piece.</p>
                    )}
                </div>
                <button className="btn-outline !py-2.5 !px-5" onClick={() => { setShowForm((v) => !v); setMsg(''); }}>
                    Write a review
                </button>
            </div>

            {msg && <p className="text-gold bg-gold-pale/50 border border-gold/20 px-4 py-3 text-sm mb-8">{msg}</p>}

            {showForm && (
                <form onSubmit={submit} className="border border-gold/25 p-6 mb-10 max-w-2xl space-y-4">
                    <div>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Your rating</span>
                        <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <button type="button" key={i} onClick={() => setForm((f) => ({ ...f, rating: i }))} aria-label={`${i} stars`}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill={i <= form.rating ? '#b08d57' : 'none'} stroke="#b08d57" strokeWidth="1.3">
                                        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <input required placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
                        <input required type="email" placeholder="Email (not published)" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
                    </div>
                    <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
                    <textarea required rows="4" placeholder="Share your experience…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
                    {error && <p className="text-sm text-maroon">{error}</p>}
                    <button type="submit" disabled={busy} className="btn-gold">{busy ? 'Submitting…' : 'Submit review'}</button>
                    <p className="text-[11px] text-charcoal/40">Reviews are published after a quick moderation check.</p>
                </form>
            )}

            <div className="space-y-6 max-w-2xl">
                {reviews.map((r) => (
                    <div key={r.id} className="border-b border-gold/10 pb-6 last:border-0">
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                            <Stars value={r.rating} />
                            <span className="text-sm font-medium">{r.name}</span>
                            {r.verified && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 13 4 4L19 7" /></svg>
                                    Verified Purchase
                                </span>
                            )}
                            <span className="text-xs text-charcoal/40">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        {r.title && <p className="font-display text-lg mt-2">{r.title}</p>}
                        <p className="text-sm text-charcoal/70 mt-1 leading-relaxed">{r.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
