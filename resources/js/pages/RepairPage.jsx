import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api';

// Repair / restoration intake — on-brand for Jadau/Kundan heirloom pieces.
export default function RepairPage() {
    const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const onPhoto = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPhoto(f);
        setPreview(URL.createObjectURL(f));
    };

    const submit = async (e) => {
        e.preventDefault();
        setError(''); setMsg(''); setBusy(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (photo) fd.append('photo', photo);
            const { data } = await api.post('/repairs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setMsg(data.message);
            setForm({ name: '', phone: '', email: '', message: '' });
            setPhoto(null); setPreview('');
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main>
            {/* Hero */}
            <section className="relative bg-charcoal text-white overflow-hidden">
                <img src="/images/catalog/p42_01.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-charcoal/70" />
                <div className="relative max-w-3xl mx-auto px-4 py-24 text-center">
                    <motion.p className="eyebrow text-gold-light mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                        Atelier Services
                    </motion.p>
                    <motion.h1 className="font-display text-4xl md:text-5xl leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
                        Repair &amp; Restoration
                    </motion.h1>
                    <p className="mt-6 text-white/70 leading-relaxed">
                        From a loose Jadau stone to a worn clasp or a re-polish of an heirloom, our master craftsmen
                        restore treasured pieces to their original glory. Share a photo and a few details — we&apos;ll
                        assess it and send you a no-obligation quote.
                    </p>
                </div>
            </section>

            {/* Form */}
            <section className="py-20">
                <div className="max-w-2xl mx-auto px-4">
                    {msg ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center border border-gold/30 bg-gold-pale/40 p-12">
                            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#b08d57" strokeWidth="1.2" className="mx-auto mb-5">
                                <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
                            </svg>
                            <h2 className="font-display text-2xl">Request received</h2>
                            <p className="text-charcoal/70 mt-3">{msg}</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={submit} className="border border-gold/25 p-8 md:p-10 space-y-5">
                            <h2 className="font-display text-2xl text-center mb-2">Tell us about your piece</h2>
                            <div className="grid sm:grid-cols-2 gap-5">
                                <Field label="Name" required value={form.name} onChange={set('name')} placeholder="Your full name" />
                                <Field label="Mobile" required type="tel" value={form.phone} onChange={set('phone')} placeholder="Your contact number" />
                            </div>
                            <Field label="Email" required type="email" value={form.email} onChange={set('email')} placeholder="Where we send the quote" />

                            <div>
                                <label className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Photo of the piece</label>
                                <div className="mt-2 flex items-center gap-4">
                                    <label className="btn-outline !py-2.5 !px-5 cursor-pointer">
                                        {photo ? 'Change photo' : 'Upload photo'}
                                        <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                                    </label>
                                    {preview && <img src={preview} alt="preview" className="w-16 h-16 object-cover border border-gold/30" />}
                                    {photo && <span className="text-xs text-charcoal/50 truncate max-w-[140px]">{photo.name}</span>}
                                </div>
                                <p className="text-[11px] text-charcoal/40 mt-1.5">JPG/PNG/WebP, up to 6 MB. A clear photo helps us assess accurately.</p>
                            </div>

                            <div>
                                <label className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">What needs attention?<span className="text-maroon"> *</span></label>
                                <textarea required rows="5" value={form.message} onChange={set('message')} placeholder="e.g. A stone has come loose from my grandmother's Kundan necklace…"
                                    className="w-full mt-2 border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
                            </div>

                            {error && <p className="text-sm text-maroon">{error}</p>}
                            <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? 'Sending…' : 'Request a Quote'}</button>
                            <p className="text-[11px] text-center text-charcoal/40">Our atelier responds within 2 working days · No obligation</p>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

function Field({ label, required, type = 'text', value, onChange, placeholder }) {
    return (
        <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">{label}{required && <span className="text-maroon"> *</span>}</label>
            <input required={required} type={type} value={value} onChange={onChange} placeholder={placeholder}
                className="w-full mt-2 border border-gold/30 focus:border-gold px-4 py-3 bg-white" />
        </div>
    );
}
