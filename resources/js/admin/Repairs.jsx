import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Pagination, StatusBadge, inputCls } from './ui';

const STATUSES = ['new', 'reviewing', 'quoted', 'done', 'cancelled'];

export default function Repairs() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const status = params.get('status') ?? '';
    const page = params.get('page') ?? '1';

    const load = () => api.get('/admin/repairs', { params: { status: status || undefined, page } }).then(({ data }) => setData(data));
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };
    const setStatus = async (id, s) => { await api.patch(`/admin/repairs/${id}/status`, { status: s }); load(); };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl">Repair Requests</h1>
                {data?.new_count > 0 && <span className="text-xs uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1.5">{data.new_count} new</span>}
            </div>
            <Card>
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} max-w-[180px] mb-4`}>
                    <option value="">All</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="space-y-4">
                    {(data?.repairs?.data ?? []).map((r) => (
                        <div key={r.id} className="border border-gold/15 p-4 flex flex-wrap gap-4">
                            {r.photo_path && (
                                <a href={`/${r.photo_path}`} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img src={`/${r.photo_path}`} alt="piece" className="w-20 h-20 object-cover border border-gold/30" />
                                </a>
                            )}
                            <div className="flex-1 min-w-[220px]">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <p className="text-sm font-medium">{r.name} <span className="text-charcoal/40 font-normal">· {r.email} · {r.phone}</span></p>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={r.status} />
                                        <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="border border-gold/30 text-xs px-2 py-1 bg-white">
                                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <p className="text-sm text-charcoal/70 mt-2 whitespace-pre-line">{r.message}</p>
                                <p className="text-[11px] text-charcoal/40 mt-2">{new Date(r.created_at).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    ))}
                    {data?.repairs?.data?.length === 0 && <p className="py-8 text-center text-charcoal/40 text-sm">No repair requests.</p>}
                </div>
                <Pagination meta={data?.repairs} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
