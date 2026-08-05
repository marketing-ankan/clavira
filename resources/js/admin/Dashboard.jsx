import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';
import { Card, Money, Stat, StatusBadge } from './ui';

export default function Dashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.get('/admin/stats').then(({ data }) => setStats(data));
    }, []);

    if (!stats) return <p className="text-charcoal/60 font-display text-lg">Loading…</p>;

    return (
        <div className="space-y-6">
            <h1 className="font-display text-2xl">Dashboard</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Revenue (paid)" value={formatPrice(stats.revenue_paid)} accent />
                <Stat label="Orders" value={`${stats.orders_paid} paid / ${stats.orders_total}`} />
                <Stat label="Products live" value={`${stats.products_active} / ${stats.products_total}`} />
                <Stat label="New enquiries" value={stats.enquiries_new} accent={stats.enquiries_new > 0} />
            </div>

            {stats.gold_rate && (
                <Card title="Today's gold rate (per gram)">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {[['24kt', stats.gold_rate.rate_24k], ['22kt', stats.gold_rate.rate_22k], ['18kt', stats.gold_rate.rate_18k], ['14kt', stats.gold_rate.rate_14k]].map(([k, v]) => (
                            <div key={k}>
                                <span className="text-charcoal/60 text-[11px] uppercase tracking-[0.14em]">{k}</span>
                                <p className="font-display text-xl text-gold"><Money value={v} /></p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                <Card title="Recent orders" action={<Link to="/admin/orders" className="text-xs text-gold-ink hover:underline">View all</Link>}>
                    <table className="w-full text-sm">
                        <tbody>
                            {stats.recent_orders.map((o) => (
                                <tr key={o.id} className="border-b border-gold/10 last:border-0">
                                    <td className="py-2.5 pr-3"><Link to={`/admin/orders/${o.id}`} className="text-gold hover:underline">{o.order_no}</Link></td>
                                    <td className="py-2.5 pr-3 text-charcoal/60 truncate max-w-[160px]">{o.email}</td>
                                    <td className="py-2.5 pr-3"><StatusBadge status={o.status} /></td>
                                    <td className="py-2.5 text-right"><Money value={o.total} /></td>
                                </tr>
                            ))}
                            {stats.recent_orders.length === 0 && <tr><td className="py-6 text-center text-charcoal/60">No orders yet.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card title="Recent enquiries" action={<Link to="/admin/enquiries" className="text-xs text-gold-ink hover:underline">View all</Link>}>
                    <div className="space-y-3">
                        {stats.recent_enquiries.map((e) => (
                            <div key={e.id} className="border-b border-gold/10 last:border-0 pb-3 last:pb-0">
                                <div className="flex justify-between gap-3">
                                    <p className="text-sm font-medium">{e.name} <span className="text-charcoal/60 font-normal">· {e.email}</span></p>
                                    <StatusBadge status={e.status} />
                                </div>
                                <p className="text-xs text-charcoal/60 mt-1 line-clamp-2">{e.message}</p>
                            </div>
                        ))}
                        {stats.recent_enquiries.length === 0 && <p className="py-6 text-center text-charcoal/60 text-sm">No enquiries yet.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
}
