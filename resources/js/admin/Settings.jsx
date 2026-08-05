import { useEffect, useState } from 'react';
import api from '../api';
import { Card, Field, Money, StatusBadge, inputCls } from './ui';

export default function Settings() {
    const [rates, setRates] = useState(null);
    const [r24, setR24] = useState('');
    const [form, setForm] = useState({ rate_22k: '', rate_18k: '', rate_14k: '' });
    const [msg, setMsg] = useState('');
    const [certs, setCerts] = useState(null);
    const [certForm, setCertForm] = useState({ certificate_no: '', type: 'IGI', item_name: '' });

    const loadRates = () => api.get('/admin/gold-rates').then(({ data }) => setRates(data));
    const loadCerts = (page = 1) => api.get('/admin/certificates', { params: { page } }).then(({ data }) => setCerts(data.certificates));

    useEffect(() => { loadRates(); loadCerts(); }, []);

    // auto-derive purity rates from 24k using standard fineness
    const on24 = (v) => {
        setR24(v);
        const n = parseFloat(v);
        if (!isNaN(n)) {
            setForm({ rate_22k: (n * 0.916).toFixed(2), rate_18k: (n * 0.75).toFixed(2), rate_14k: (n * 0.585).toFixed(2) });
        }
    };

    const saveRate = async (e) => {
        e.preventDefault();
        setMsg('');
        await api.post('/admin/gold-rates', { rate_24k: r24, ...form });
        setMsg('Gold rate published — ticker updates immediately.');
        setR24('');
        loadRates();
    };

    const addCert = async (e) => {
        e.preventDefault();
        await api.post('/admin/certificates', certForm);
        setCertForm({ certificate_no: '', type: 'IGI', item_name: '' });
        loadCerts();
    };

    const delCert = async (id) => {
        if (!window.confirm('Remove this certificate?')) return;
        await api.delete(`/admin/certificates/${id}`);
        loadCerts();
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="font-display text-2xl">Settings</h1>

            <Card title="Gold rate (INR per gram)">
                {rates?.current && (
                    <p className="text-sm text-charcoal/60 mb-4">
                        Current: 24kt <strong className="text-gold"><Money value={rates.current.rate_24k} /></strong> · 22kt <Money value={rates.current.rate_22k} /> · 18kt <Money value={rates.current.rate_18k} /> · 14kt <Money value={rates.current.rate_14k} />
                        <span className="text-charcoal/60"> — effective {new Date(rates.current.effective_at).toLocaleString('en-IN')}</span>
                    </p>
                )}
                <form onSubmit={saveRate} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <Field label="24kt (entry)"><input required type="number" step="0.01" value={r24} onChange={(e) => on24(e.target.value)} className={inputCls} /></Field>
                    <Field label="22kt"><input required type="number" step="0.01" value={form.rate_22k} onChange={(e) => setForm((f) => ({ ...f, rate_22k: e.target.value }))} className={inputCls} /></Field>
                    <Field label="18kt"><input required type="number" step="0.01" value={form.rate_18k} onChange={(e) => setForm((f) => ({ ...f, rate_18k: e.target.value }))} className={inputCls} /></Field>
                    <Field label="14kt"><input required type="number" step="0.01" value={form.rate_14k} onChange={(e) => setForm((f) => ({ ...f, rate_14k: e.target.value }))} className={inputCls} /></Field>
                    <button type="submit" className="btn-gold !py-2.5">Publish</button>
                </form>
                {msg && <p className="text-sm text-gold-ink mt-3">{msg}</p>}
            </Card>

            <Card title="Certificates (Verify Report)">
                <form onSubmit={addCert} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end mb-5">
                    <Field label="Certificate no."><input required value={certForm.certificate_no} onChange={(e) => setCertForm((f) => ({ ...f, certificate_no: e.target.value }))} className={inputCls} /></Field>
                    <Field label="Authority">
                        <select value={certForm.type} onChange={(e) => setCertForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
                            <option>IGI</option><option>BIS</option>
                        </select>
                    </Field>
                    <Field label="Item name"><input required value={certForm.item_name} onChange={(e) => setCertForm((f) => ({ ...f, item_name: e.target.value }))} className={inputCls} /></Field>
                    <button type="submit" className="btn-outline !py-2.5">Add</button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-charcoal/60 border-b border-gold/20">
                                <th className="py-2 pr-3">Certificate</th>
                                <th className="py-2 pr-3">Type</th>
                                <th className="py-2 pr-3">Item</th>
                                <th className="py-2 pr-3">Product</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(certs?.data ?? []).map((c) => (
                                <tr key={c.id} className="border-b border-gold/10">
                                    <td className="py-2 pr-3 font-medium">{c.certificate_no}</td>
                                    <td className="py-2 pr-3">{c.type}</td>
                                    <td className="py-2 pr-3 text-charcoal/70">{c.item_name}</td>
                                    <td className="py-2 pr-3 text-charcoal/60 text-xs">{c.product?.name ?? '—'}</td>
                                    <td className="py-2 text-right"><button onClick={() => delCert(c.id)} className="text-maroon/70 hover:text-maroon text-xs">Remove</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
