import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Pagination, StatusBadge, inputCls } from './ui';

export default function Enquiries() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const status = params.get('status') ?? '';
    const page = params.get('page') ?? '1';

    const load = () => api.get('/admin/enquiries', { params: { status: status || undefined, page } }).then(({ data }) => setData(data));
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };

    const changeStatus = async (id, s) => {
        await api.patch(`/admin/enquiries/${id}/status`, { status: s });
        load();
    };

    return (
        <div className="space-y-5">
            <h1 className="font-display text-2xl">Enquiries</h1>
            <Card>
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} max-w-[180px] mb-4`}>
                    <option value="">All</option>
                    {['new', 'contacted', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="space-y-4">
                    {(data?.enquiries?.data ?? []).map((e) => (
                        <div key={e.id} className="border border-gold/15 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-medium text-sm">{e.name} <span className="text-charcoal/60 font-normal">· {e.email}{e.phone ? ` · ${e.phone}` : ''} · {e.country}</span></p>
                                    {e.product && (
                                        <p className="text-xs text-gold-ink mt-0.5">
                                            About: <Link to={`/admin/products/${e.product.id}`} className="underline">{e.product.name}</Link>
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={e.status} />
                                    <select value={e.status} onChange={(ev) => changeStatus(e.id, ev.target.value)} className="border border-gold/30 text-xs px-2 py-1 bg-white">
                                        {['new', 'contacted', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p className="text-sm text-charcoal/70 mt-2 whitespace-pre-line">{e.message}</p>
                            <p className="text-[11px] text-charcoal/60 mt-2">{new Date(e.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    ))}
                    {data?.enquiries?.data?.length === 0 && <p className="py-8 text-center text-charcoal/60 text-sm">No enquiries.</p>}
                </div>
                <Pagination meta={data?.enquiries} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
