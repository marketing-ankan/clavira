import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { Card, Money, StatusBadge, inputCls } from './ui';

export default function OrderDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/admin/orders/${id}`).then(({ data }) => setData(data));
    }, [id]);

    if (!data) return <p className="text-charcoal/40 font-display text-lg">Loading…</p>;
    const { order, statuses } = data;
    const addr = order.shipping_address ?? {};

    const changeStatus = async (e) => {
        setSaving(true);
        try {
            const { data: res } = await api.patch(`/admin/orders/${id}/status`, { status: e.target.value });
            setData((d) => ({ ...d, order: { ...d.order, status: res.order.status } }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5 max-w-4xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <Link to="/admin/orders" className="text-xs text-gold hover:underline">← Orders</Link>
                    <h1 className="font-display text-2xl mt-1">{order.order_no}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <select value={order.status} onChange={changeStatus} disabled={saving} className={`${inputCls} !w-auto`}>
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <Card title="Items">
                {order.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-4 border-b border-gold/10 last:border-0 py-3">
                        {it.image && <img src={`/${it.image}`} alt="" className="w-12 h-12 object-cover" />}
                        <div className="flex-1">
                            <p className="text-sm font-medium">{it.name}</p>
                            {it.options && (
                                <p className="text-xs text-charcoal/50">
                                    {[it.options.metal, it.options.purity && `${it.options.purity}kt`, it.options.diamond, it.options.size && `Size ${it.options.size}`].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                        <p className="text-sm text-charcoal/60">× {it.qty}</p>
                        <p className="text-sm w-28 text-right"><Money value={it.total} /></p>
                    </div>
                ))}
                <div className="text-sm space-y-1.5 mt-4 max-w-xs ml-auto">
                    <div className="flex justify-between text-charcoal/60"><span>Subtotal</span><Money value={order.subtotal} /></div>
                    <div className="flex justify-between text-charcoal/60"><span>GST</span><Money value={order.tax} /></div>
                    <div className="flex justify-between font-medium text-base"><span>Total</span><span className="text-gold"><Money value={order.total} /></span></div>
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
                <Card title="Customer & shipping">
                    <div className="text-sm space-y-1 text-charcoal/80">
                        <p className="font-medium">{addr.name}</p>
                        <p>{order.email} · {addr.phone}</p>
                        <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                        <p>{addr.city}, {addr.state} {addr.postal_code} · {addr.country}</p>
                        {order.notes && <p className="pt-2 text-charcoal/60 italic">“{order.notes}”</p>}
                    </div>
                </Card>
                <Card title="Payment">
                    {order.payments.length === 0 && <p className="text-sm text-charcoal/40">No payment records.</p>}
                    {order.payments.map((p) => (
                        <div key={p.id} className="text-sm space-y-1 border-b border-gold/10 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
                            <div className="flex justify-between"><span className="text-charcoal/50">Gateway</span><span className="uppercase">{p.gateway}</span></div>
                            <div className="flex justify-between"><span className="text-charcoal/50">Status</span><StatusBadge status={p.status === 'captured' ? 'paid' : p.status} /></div>
                            <div className="flex justify-between"><span className="text-charcoal/50">Gateway order</span><span className="text-xs">{p.gateway_order_id}</span></div>
                            {p.gateway_payment_id && <div className="flex justify-between"><span className="text-charcoal/50">Payment ID</span><span className="text-xs">{p.gateway_payment_id}</span></div>}
                            <div className="flex justify-between"><span className="text-charcoal/50">Amount</span><Money value={p.amount} /></div>
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );
}
