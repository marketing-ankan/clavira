import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Pagination, StatusBadge, inputCls } from './ui';

const STATUSES = ['new', 'scheduled', 'done', 'cancelled'];

export default function Consultations() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const status = params.get('status') ?? '';
    const page = params.get('page') ?? '1';

    const load = () => api.get('/admin/consultations', { params: { status: status || undefined, page } }).then(({ data }) => setData(data));
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };
    const setStatus = async (id, s) => { await api.patch(`/admin/consultations/${id}/status`, { status: s }); load(); };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl">Consultations</h1>
                <div className="flex gap-2 text-xs">
                    {data?.new_count > 0 && <span className="uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1.5">{data.new_count} new</span>}
                    {data && <span className="uppercase tracking-wider bg-gold-pale text-gold px-3 py-1.5">{data.subscriber_count} subscribers</span>}
                </div>
            </div>
            <Card>
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} max-w-[180px] mb-4`}>
                    <option value="">All</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="space-y-4">
                    {(data?.consultations?.data ?? []).map((c) => (
                        <div key={c.id} className="border border-gold/15 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium">{c.name} <span className="text-charcoal/40 font-normal">· {c.email} · {c.phone} · {c.country}</span></p>
                                    <p className="text-xs text-gold mt-0.5 capitalize">{c.type}{c.preferred_date ? ` · ${new Date(c.preferred_date).toLocaleDateString('en-IN')}` : ''}{c.preferred_time ? ` · ${c.preferred_time}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={c.status} />
                                    <select value={c.status} onChange={(e) => setStatus(c.id, e.target.value)} className="border border-gold/30 text-xs px-2 py-1 bg-white">
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            {c.message && <p className="text-sm text-charcoal/70 mt-2 whitespace-pre-line">{c.message}</p>}
                            <p className="text-[11px] text-charcoal/40 mt-2">{new Date(c.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    ))}
                    {data?.consultations?.data?.length === 0 && <p className="py-8 text-center text-charcoal/40 text-sm">No consultation requests.</p>}
                </div>
                <Pagination meta={data?.consultations} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
