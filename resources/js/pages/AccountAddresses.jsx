import { useEffect, useState } from 'react';
import api from '../api';

const COUNTRIES = [['IN', 'India', '+91'], ['AE', 'UAE', '+971'], ['US', 'USA', '+1'], ['GB', 'UK', '+44'], ['SG', 'Singapore', '+65'], ['AU', 'Australia', '+61'], ['CA', 'Canada', '+1']];
const EMPTY = { name: '', phone_country_code: '+91', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'IN', is_default: false };

export default function AccountAddresses() {
    const [addresses, setAddresses] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');

    const load = () => api.get('/account/addresses').then(({ data }) => setAddresses(data.addresses));
    useEffect(() => { load(); }, []);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const openNew = () => { setForm(EMPTY); setEditing(null); setError(''); setShowForm(true); };
    const openEdit = (a) => { setForm({ ...EMPTY, ...a }); setEditing(a.id); setError(''); setShowForm(true); };

    const save = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editing) await api.put(`/account/addresses/${editing}`, form);
            else await api.post('/account/addresses', form);
            setShowForm(false);
            load();
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : 'Could not save address.');
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Remove this address?')) return;
        await api.delete(`/account/addresses/${id}`);
        load();
    };

    const cls = 'w-full border border-gold/30 focus:border-gold px-3 py-2.5 bg-white text-sm';

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl">Saved addresses</h2>
                {!showForm && <button onClick={openNew} className="btn-outline !py-2 !px-4 text-xs">+ Add address</button>}
            </div>

            {showForm && (
                <form onSubmit={save} className="border border-gold/25 p-5 mb-6 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <input required placeholder="Full name" value={form.name} onChange={set('name')} className={cls} />
                        <div className="flex">
                            <select value={form.country} onChange={(e) => { const c = COUNTRIES.find(x => x[0] === e.target.value); setForm(f => ({ ...f, country: c[0], phone_country_code: c[2] })); }} className={`${cls} !w-auto`}>
                                {COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                            </select>
                            <input required placeholder="Phone" value={form.phone} onChange={set('phone')} className={`${cls} ml-2`} />
                        </div>
                    </div>
                    <input required placeholder="Address line 1" value={form.line1} onChange={set('line1')} className={cls} />
                    <input placeholder="Address line 2 (optional)" value={form.line2 ?? ''} onChange={set('line2')} className={cls} />
                    <div className="grid sm:grid-cols-3 gap-3">
                        <input required placeholder="City" value={form.city} onChange={set('city')} className={cls} />
                        <input required placeholder="State" value={form.state} onChange={set('state')} className={cls} />
                        <input required placeholder="PIN / Postal code" value={form.postal_code} onChange={set('postal_code')} className={cls} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!form.is_default} onChange={set('is_default')} className="accent-[#b08d57] w-4 h-4" />
                        Set as default address
                    </label>
                    {error && <p className="text-sm text-maroon">{error}</p>}
                    <div className="flex gap-3">
                        <button type="submit" className="btn-gold !py-2.5 !px-6">Save</button>
                        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-charcoal/50 hover:text-charcoal">Cancel</button>
                    </div>
                </form>
            )}

            {addresses.length === 0 && !showForm && <p className="text-charcoal/50 text-sm">No saved addresses yet.</p>}

            <div className="grid sm:grid-cols-2 gap-4">
                {addresses.map((a) => (
                    <div key={a.id} className="border border-gold/20 p-4 text-sm relative">
                        {a.is_default && <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider bg-gold-pale text-gold px-2 py-0.5">Default</span>}
                        <p className="font-medium">{a.name}</p>
                        <p className="text-charcoal/60">{a.phone_country_code} {a.phone}</p>
                        <p className="text-charcoal/60 mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                        <p className="text-charcoal/60">{a.city}, {a.state} {a.postal_code} · {a.country}</p>
                        <div className="flex gap-4 mt-3">
                            <button onClick={() => openEdit(a)} className="text-xs text-gold hover:underline">Edit</button>
                            <button onClick={() => remove(a.id)} className="text-xs text-maroon/70 hover:text-maroon">Remove</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
