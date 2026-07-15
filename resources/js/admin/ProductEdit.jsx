import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { diamondLabel, metalLabel } from '../format';
import { Card, Field, Money, inputCls } from './ui';

const EMPTY = {
    category_id: '', name: '', sku: '', description: '', story: '',
    base_price: '', diamond_type: 'lab_grown', diamond_quality: 'VVS · E–F',
    default_metal: 'yellow', default_purity: 18,
    is_jadau: false, igi_certified: true, bis_hallmarked: true, featured: false, active: true,
};

export default function ProductEdit() {
    const { id } = useParams();
    const isNew = id === 'new';
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [meta, setMeta] = useState({ categories: [], collections: [] });
    const [collectionIds, setCollectionIds] = useState([]);
    const [images, setImages] = useState([]);
    const [variants, setVariants] = useState([]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        if (isNew) {
            api.get('/admin/products', { params: { page: 1 } }).then(({ data }) =>
                setMeta((m) => ({ ...m, categories: data.categories })));
            return;
        }
        api.get(`/admin/products/${id}`).then(({ data }) => {
            const p = data.product;
            setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])));
            setImages(p.images);
            setVariants(p.variants);
            setCollectionIds(p.collections.map((c) => c.id));
            setMeta({ categories: data.categories, collections: data.collections });
        });
    }, [id, isNew]);

    const set = (k) => (e) => {
        const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [k]: v }));
    };

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg('');
        try {
            const payload = { ...form, collection_ids: collectionIds, variants };
            if (isNew) {
                const { data } = await api.post('/admin/products', payload);
                navigate(`/admin/products/${data.product.id}`, { replace: true });
            } else {
                await api.put(`/admin/products/${id}`, payload);
                setMsg('Saved.');
            }
        } catch (err) {
            setMsg(err.response?.data?.message ?? 'Save failed.');
        } finally {
            setBusy(false);
        }
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        const { data } = await api.post(`/admin/products/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setImages((imgs) => [...imgs, data.image]);
        fileRef.current.value = '';
    };

    const removeImage = async (imgId) => {
        await api.delete(`/admin/products/${id}/images/${imgId}`);
        setImages((imgs) => imgs.filter((i) => i.id !== imgId));
    };

    const makePrimary = async (imgId) => {
        await api.patch(`/admin/products/${id}/images/${imgId}/primary`);
        setImages((imgs) => imgs.map((i) => ({ ...i, is_primary: i.id === imgId })));
    };

    const destroy = async () => {
        if (!window.confirm('Delete this product permanently?')) return;
        await api.delete(`/admin/products/${id}`);
        navigate('/admin/products', { replace: true });
    };

    const setVariant = (vid, k, v) =>
        setVariants((rows) => rows.map((r) => (r.id === vid ? { ...r, [k]: v } : r)));

    return (
        <form onSubmit={save} className="space-y-5 max-w-5xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl">{isNew ? 'New Product' : form.name || 'Edit Product'}</h1>
                <div className="flex items-center gap-3">
                    {msg && <span className="text-sm text-gold">{msg}</span>}
                    {!isNew && <button type="button" onClick={destroy} className="text-sm text-maroon hover:underline">Delete</button>}
                    <button type="submit" disabled={busy} className="btn-gold !py-2.5 !px-6">{busy ? 'Saving…' : 'Save'}</button>
                </div>
            </div>

            <Card title="Details">
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Name"><input required value={form.name} onChange={set('name')} className={inputCls} /></Field>
                    <Field label="Category">
                        <select required value={form.category_id} onChange={set('category_id')} className={inputCls}>
                            <option value="">Select…</option>
                            {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="SKU (blank = auto)"><input value={form.sku ?? ''} onChange={set('sku')} className={inputCls} /></Field>
                    <Field label="Base price (INR)"><input required type="number" min="0" step="1" value={form.base_price} onChange={set('base_price')} className={inputCls} /></Field>
                    <Field label="Diamond type">
                        <select value={form.diamond_type} onChange={set('diamond_type')} className={inputCls}>
                            {Object.entries(diamondLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label="Diamond quality"><input value={form.diamond_quality ?? ''} onChange={set('diamond_quality')} className={inputCls} /></Field>
                    <Field label="Default metal">
                        <select value={form.default_metal} onChange={set('default_metal')} className={inputCls}>
                            {Object.entries(metalLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label="Default purity">
                        <select value={form.default_purity} onChange={set('default_purity')} className={inputCls}>
                            {[14, 18, 22].map((p) => <option key={p} value={p}>{p}kt</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Description"><textarea rows="2" value={form.description ?? ''} onChange={set('description')} className={`${inputCls} mt-4`} /></Field>
                <Field label="Story"><textarea rows="3" value={form.story ?? ''} onChange={set('story')} className={`${inputCls} mt-4`} /></Field>

                <div className="flex flex-wrap gap-6 mt-5">
                    {[['is_jadau', 'Jadau Kundan'], ['igi_certified', 'IGI certified'], ['bis_hallmarked', 'BIS hallmarked'], ['featured', 'Featured (homepage)'], ['active', 'Live on store']].map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!form[k]} onChange={set(k)} className="accent-[#b08d57] w-4 h-4" />
                            {l}
                        </label>
                    ))}
                </div>
            </Card>

            {!isNew && meta.collections.length > 0 && (
                <Card title="Edits / collections">
                    <div className="flex flex-wrap gap-3">
                        {meta.collections.map((c) => (
                            <label key={c.id} className={`text-xs px-3 py-2 border cursor-pointer ${collectionIds.includes(c.id) ? 'border-gold bg-gold/10 text-gold' : 'border-gold/25 text-charcoal/60'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={collectionIds.includes(c.id)}
                                    onChange={() => setCollectionIds((ids) => ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id])}
                                />
                                {c.name}
                            </label>
                        ))}
                    </div>
                </Card>
            )}

            {!isNew && (
                <Card title="Images" action={<label className="btn-outline !py-1.5 !px-4 cursor-pointer text-xs">Upload<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} /></label>}>
                    <div className="flex flex-wrap gap-4">
                        {images.map((img) => (
                            <div key={img.id} className={`w-28 border-2 ${img.is_primary ? 'border-gold' : 'border-transparent'}`}>
                                <img src={`/${img.path}`} alt="" className="w-28 h-28 object-cover" />
                                <div className="flex justify-between px-1 py-1 text-[10px]">
                                    {img.is_primary
                                        ? <span className="text-gold uppercase tracking-wide">Primary</span>
                                        : <button type="button" onClick={() => makePrimary(img.id)} className="text-charcoal/50 hover:text-gold">Set primary</button>}
                                    <button type="button" onClick={() => removeImage(img.id)} className="text-maroon/70 hover:text-maroon">✕</button>
                                </div>
                            </div>
                        ))}
                        {images.length === 0 && <p className="text-sm text-charcoal/40">No images yet — upload one.</p>}
                    </div>
                </Card>
            )}

            {!isNew && variants.length > 0 && (
                <Card title={`Variants (${variants.length}) — price delta over base`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-charcoal/50 border-b border-gold/20">
                                    <th className="py-2 pr-3">Metal</th>
                                    <th className="py-2 pr-3">Purity</th>
                                    <th className="py-2 pr-3">Diamond</th>
                                    <th className="py-2 pr-3 text-right">Price delta (₹)</th>
                                    <th className="py-2 pr-3 text-right">Sell price</th>
                                    <th className="py-2 text-center">Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v) => (
                                    <tr key={v.id} className="border-b border-gold/10">
                                        <td className="py-2 pr-3">{metalLabel[v.metal]}</td>
                                        <td className="py-2 pr-3">{v.purity}kt</td>
                                        <td className="py-2 pr-3">{diamondLabel[v.diamond_type]}</td>
                                        <td className="py-2 pr-3 text-right">
                                            <input
                                                type="number" step="1"
                                                value={v.price_delta}
                                                onChange={(e) => setVariant(v.id, 'price_delta', e.target.value)}
                                                className="w-28 border border-gold/30 focus:border-gold px-2 py-1 text-right text-sm"
                                            />
                                        </td>
                                        <td className="py-2 pr-3 text-right text-charcoal/70">
                                            <Money value={Number(form.base_price || 0) + Number(v.price_delta || 0)} />
                                        </td>
                                        <td className="py-2 text-center">
                                            <input type="checkbox" checked={!!v.active} onChange={(e) => setVariant(v.id, 'active', e.target.checked)} className="accent-[#b08d57] w-4 h-4" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </form>
    );
}
