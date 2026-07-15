import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

export default function ContactPage() {
    const { state } = useLocation();
    const [form, setForm] = useState({
        name: '', email: '', phone: '',
        message: state?.product ? `I would like to enquire about "${state.product}".\n` : '',
    });
    const [sent, setSent] = useState('');
    const [sending, setSending] = useState(false);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            const { data } = await api.post('/enquiries', form);
            setSent(data.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">Experience Us</p>
                <h1 className="font-display text-4xl md:text-5xl">Where Jewels Find Their Home</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto">
                    Connect with us and explore our full collection at your fingertips — wherever in the world you are.
                </p>
            </section>

            <section className="max-w-xl mx-auto px-4 py-16">
                {sent ? (
                    <div className="border border-gold/40 bg-white p-10 text-center">
                        <div className="text-gold text-4xl mb-4">✦</div>
                        <p className="font-display text-2xl">Thank you</p>
                        <p className="text-charcoal/60 mt-3">{sent}</p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-5">
                        <Field label="Your Name" required value={form.name} onChange={set('name')} />
                        <Field label="Email" type="email" required value={form.email} onChange={set('email')} />
                        <Field label="Phone / WhatsApp" value={form.phone} onChange={set('phone')} />
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Message *</span>
                            <textarea
                                required rows="5" value={form.message} onChange={set('message')}
                                className="mt-1.5 w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                                placeholder="A custom design, a bridal consultation, an NRI order…"
                            />
                        </label>
                        <button type="submit" className="btn-gold w-full" disabled={sending}>
                            {sending ? 'Sending…' : 'Send Enquiry'}
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}

function Field({ label, required, ...props }) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">
                {label}{required && ' *'}
            </span>
            <input
                required={required}
                {...props}
                className="mt-1.5 w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
            />
        </label>
    );
}
