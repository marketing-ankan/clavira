import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Money, Pagination, StatusBadge, inputCls } from './ui';

export default function Orders() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const status = params.get('status') ?? '';
    const page = params.get('page') ?? '1';

    useEffect(() => {
        api.get('/admin/orders', { params: { status: status || undefined, page } }).then(({ data }) => setData(data));
    }, [status, page]);

    const setParam = (k, v) => {
        const next = new URLSearchParams(params);
        v ? next.set(k, v) : next.delete(k);
        if (k !== 'page') next.delete('page');
        setParams(next);
    };

    return (
        <div className="space-y-5">
            <h1 className="font-display text-2xl">Orders</h1>
            <Card>
                <select value={status} onChange={(e) => setParam('status', e.target.value)} className={`${inputCls} max-w-[200px] mb-4`}>
                    <option value="">All statuses</option>
                    {(data?.statuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-charcoal/50 border-b border-gold/20">
                                <th className="py-2 pr-3">Order</th>
                                <th className="py-2 pr-3">Customer</th>
                                <th className="py-2 pr-3">Items</th>
                                <th className="py-2 pr-3">Placed</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.orders?.data ?? []).map((o) => (
                                <tr key={o.id} className="border-b border-gold/10 hover:bg-gold/5">
                                    <td className="py-2.5 pr-3"><Link to={`/admin/orders/${o.id}`} className="text-gold font-medium hover:underline">{o.order_no}</Link></td>
                                    <td className="py-2.5 pr-3 text-charcoal/70">{o.email}</td>
                                    <td className="py-2.5 pr-3 text-charcoal/60">{o.items_count}</td>
                                    <td className="py-2.5 pr-3 text-charcoal/50 text-xs">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                                    <td className="py-2.5 pr-3"><StatusBadge status={o.status} /></td>
                                    <td className="py-2.5 text-right"><Money value={o.total} /></td>
                                </tr>
                            ))}
                            {data?.orders?.data?.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-charcoal/40">No orders found.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <Pagination meta={data?.orders} onPage={(p) => setParam('page', String(p))} />
            </Card>
        </div>
    );
}
