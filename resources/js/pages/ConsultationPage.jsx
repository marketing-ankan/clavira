import { useEffect, useState } from 'react';
import api from '../api';

const TYPES = [
    ['virtual', 'Virtual consultation', 'A video call with a Clavira jewellery consultant'],
    ['atelier', 'Visit the atelier', 'An in-person appointment at our atelier'],
    ['bridal', 'Bridal styling', 'Curate your complete bridal look, brow to fingertip'],
    ['bespoke', 'Bespoke commission', 'Design a one-of-a-kind piece, made to order'],
];
const COUNTRIES = [['IN', 'India', '+91'], ['AE', 'UAE', '+971'], ['US', 'USA', '+1'], ['GB', 'UK', '+44'], ['SG', 'Singapore', '+65'], ['AU', 'Australia', '+61'], ['CA', 'Canada', '+1']];

export default function ConsultationPage() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', country: 'IN', type: 'virtual', preferred_date: '', preferred_time: '', message: '' });
    const [sent, setSent] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => window.scrollTo(0, 0), []);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setBusy(true);
        try {
            const { data } = await api.post('/consultations', form);
            setSent(data.message);
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : 'Could not book your consultation.');
        } finally {
            setBusy(false);
        }
    };

    const cls = 'w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white';

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">By Appointment</p>
                <h1 className="font-display text-4xl md:text-5xl">Book a Consultation</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto">
                    Personal guidance for bridal, bespoke and fine‑jewellery selection — in our atelier or from anywhere in the world.
                </p>
            </section>

            <section className="max-w-2xl mx-auto px-4 py-16">
                {sent ? (
                    <div className="border border-gold/40 bg-white p-10 text-center">
                        <div className="text-gold text-4xl mb-4">✦</div>
                        <p className="font-display text-2xl">Appointment requested</p>
                        <p className="text-charcoal/60 mt-3">{sent}</p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Type of consultation</span>
                            <div className="grid sm:grid-cols-2 gap-3 mt-2">
                                {TYPES.map(([value, label, desc]) => (
                                    <label key={value} className={`border p-4 cursor-pointer transition-colors ${form.type === value ? 'border-gold bg-gold/5' : 'border-gold/25 hover:border-gold/50'}`}>
                                        <input type="radio" name="type" value={value} checked={form.type === value} onChange={set('type')} className="hidden" />
                                        <p className="font-display text-lg">{label}</p>
                                        <p className="text-xs text-charcoal/60 mt-1">{desc}</p>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <input required placeholder="Full name" value={form.name} onChange={set('name')} className={cls} />
                            <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className={cls} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="flex">
                                <select value={form.country} onChange={(e) => { const c = COUNTRIES.find((x) => x[0] === e.target.value); setForm((f) => ({ ...f, country: c[0] })); }} className={`${cls} !w-auto`}>
                                    {COUNTRIES.map(([c, l, code]) => <option key={c} value={c}>{l} {code}</option>)}
                                </select>
                                <input required placeholder="Phone / WhatsApp" value={form.phone} onChange={set('phone')} className={`${cls} ml-2`} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={form.preferred_date} onChange={set('preferred_date')} className={cls} />
                                <input placeholder="Time (e.g. 4 PM)" value={form.preferred_time} onChange={set('preferred_time')} className={cls} />
                            </div>
                        </div>
                        <textarea rows="3" placeholder="Tell us what you have in mind (optional)" value={form.message} onChange={set('message')} className={cls} />
                        {error && <p className="text-sm text-maroon">{error}</p>}
                        <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? 'Booking…' : 'Request appointment'}</button>
                        <p className="text-[11px] text-center text-charcoal/60">Our consultant confirms within 24 hours. No payment required to book.</p>
                    </form>
                )}
            </section>
        </main>
    );
}
