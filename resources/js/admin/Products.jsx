import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Money, Pagination, inputCls } from './ui';

export default function Products() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const q = params.get('q') ?? '';
    const category = params.get('category') ?? '';
    const page = params.get('page') ?? '1';

    const load = () => api.get('/admin/products', { params: { q: q || undefined, category: category || undefined, page } })
        .then(({ data }) => setData(data));

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, category, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl">Products</h1>
                <Link to="/admin/products/new" className="btn-gold !py-2.5 !px-5">+ New Product</Link>
            </div>

            <Card>
                <div className="flex flex-wrap gap-3 mb-4">
                    <input
                        placeholder="Search name or SKU…"
                        defaultValue={q}
                        onKeyDown={(e) => e.key === 'Enter' && setParam('q', e.target.value)}
                        className={`${inputCls} max-w-xs`}
                    />
                    <select value={category} onChange={(e) => setParam('category', e.target.value)} className={`${inputCls} max-w-[200px]`}>
                        <option value="">All categories</option>
                        {(data?.categories ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-charcoal/50 border-b border-gold/20">
                                <th className="py-2 pr-3">Product</th>
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3">SKU</th>
                                <th className="py-2 pr-3 text-right">Base price</th>
                                <th className="py-2 pr-3 text-center">Variants</th>
                                <th className="py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.products?.data ?? []).map((p) => {
                                const img = p.images.find((i) => i.is_primary) ?? p.images[0];
                                return (
                                    <tr key={p.id} className="border-b border-gold/10 hover:bg-gold/5">
                                        <td className="py-2.5 pr-3">
                                            <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3">
                                                {img && <img src={`/${img.path}`} alt="" className="w-10 h-10 object-cover" />}
                                                <span className="font-medium text-charcoal hover:text-gold">{p.name}</span>
                                                {p.featured ? <span className="text-[9px] uppercase tracking-wider bg-gold-pale text-gold px-1.5 py-0.5">Featured</span> : null}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3 text-charcoal/60">{p.category?.name}</td>
                                        <td className="py-2.5 pr-3 text-charcoal/50 text-xs">{p.sku}</td>
                                        <td className="py-2.5 pr-3 text-right"><Money value={p.base_price} /></td>
                                        <td className="py-2.5 pr-3 text-center text-charcoal/60">{p.variants_count}</td>
                                        <td className="py-2.5 text-center">
                                            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                                {p.active ? 'Live' : 'Hidden'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination meta={data?.products} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
