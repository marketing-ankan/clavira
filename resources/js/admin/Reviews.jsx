import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Pagination, StatusBadge, inputCls } from './ui';
import Stars from '../components/Stars';

export default function Reviews() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const status = params.get('status') ?? '';
    const page = params.get('page') ?? '1';

    const load = () => api.get('/admin/reviews', { params: { status: status || undefined, page } }).then(({ data }) => setData(data));
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };

    const setStatus = async (id, s) => { await api.patch(`/admin/reviews/${id}/status`, { status: s }); load(); };
    const remove = async (id) => { if (window.confirm('Delete this review?')) { await api.delete(`/admin/reviews/${id}`); load(); } };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl">Reviews</h1>
                {data?.pending_count > 0 && <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1.5">{data.pending_count} pending</span>}
            </div>
            <Card>
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} max-w-[180px] mb-4`}>
                    <option value="">All</option>
                    {['pending', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="space-y-4">
                    {(data?.reviews?.data ?? []).map((r) => (
                        <div key={r.id} className="border border-gold/15 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Stars value={r.rating} size={14} />
                                        <span className="text-sm font-medium">{r.name}</span>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    {r.product && <p className="text-xs text-gold mt-0.5">on <Link to={`/admin/products/${r.product.id}`} className="underline">{r.product.name}</Link></p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {r.status !== 'approved' && <button onClick={() => setStatus(r.id, 'approved')} className="text-xs text-emerald-700 hover:underline">Approve</button>}
                                    {r.status !== 'rejected' && <button onClick={() => setStatus(r.id, 'rejected')} className="text-xs text-charcoal/50 hover:underline">Reject</button>}
                                    <button onClick={() => remove(r.id)} className="text-xs text-maroon/70 hover:text-maroon">Delete</button>
                                </div>
                            </div>
                            {r.title && <p className="font-medium text-sm mt-2">{r.title}</p>}
                            <p className="text-sm text-charcoal/70 mt-1">{r.body}</p>
                            <p className="text-[11px] text-charcoal/40 mt-2">{r.email} · {new Date(r.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    ))}
                    {data?.reviews?.data?.length === 0 && <p className="py-8 text-center text-charcoal/40 text-sm">No reviews.</p>}
                </div>
                <Pagination meta={data?.reviews} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
