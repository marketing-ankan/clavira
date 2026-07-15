import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';

export function AccountOrders() {
    const [orders, setOrders] = useState(null);

    useEffect(() => {
        api.get('/account/orders').then(({ data }) => setOrders(data.orders));
    }, []);

    if (!orders) return <p className="text-charcoal/40">Loading…</p>;

    return (
        <div>
            <h2 className="font-display text-xl mb-5">Your orders</h2>
            {orders.data.length === 0 && <p className="text-charcoal/50 text-sm">You have not placed any orders yet.</p>}
            <div className="space-y-3">
                {orders.data.map((o) => (
                    <Link key={o.id} to={`/account/orders/${o.order_no}`} className="flex items-center justify-between border border-gold/20 px-5 py-4 hover:border-gold">
                        <div>
                            <p className="font-medium text-gold">{o.order_no}</p>
                            <p className="text-xs text-charcoal/50">{new Date(o.created_at).toLocaleDateString('en-IN')} · {o.items_count} item(s)</p>
                        </div>
                        <div className="text-right">
                            <p>{formatPrice(o.total)}</p>
                            <span className="text-[10px] uppercase tracking-wider bg-gold-pale text-gold px-2 py-0.5">{o.status}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function AccountOrderDetail() {
    const { orderNo } = useParams();
    const [order, setOrder] = useState(null);

    useEffect(() => {
        api.get(`/account/orders/${orderNo}`).then(({ data }) => setOrder(data.order)).catch(() => setOrder(false));
    }, [orderNo]);

    if (order === false) return <p className="text-charcoal/50">Order not found.</p>;
    if (!order) return <p className="text-charcoal/40">Loading…</p>;
    const addr = order.shipping_address ?? {};

    return (
        <div className="space-y-6">
            <div>
                <Link to="/account/orders" className="text-xs text-gold hover:underline">← All orders</Link>
                <div className="flex items-center justify-between mt-2">
                    <h2 className="font-display text-2xl">{order.order_no}</h2>
                    <span className="text-[11px] uppercase tracking-wider bg-gold-pale text-gold px-3 py-1">{order.status}</span>
                </div>
                <p className="text-xs text-charcoal/50 mt-1">Placed {new Date(order.created_at).toLocaleString('en-IN')}</p>
            </div>

            <div className="border border-gold/20">
                {order.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-4 px-4 py-3 border-b border-gold/10 last:border-0">
                        {it.image && <img src={`/${it.image}`} alt="" className="w-12 h-12 object-cover" />}
                        <div className="flex-1">
                            <p className="text-sm font-medium">{it.name}</p>
                            <p className="text-xs text-charcoal/50">× {it.qty}</p>
                        </div>
                        <p className="text-sm">{formatPrice(it.total)}</p>
                    </div>
                ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6 text-sm">
                <div className="border border-gold/20 p-4">
                    <p className="eyebrow text-gold mb-2">Delivery</p>
                    <p className="text-charcoal/70">{addr.name}</p>
                    <p className="text-charcoal/70">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p className="text-charcoal/70">{addr.city}, {addr.state} {addr.postal_code} · {addr.country}</p>
                </div>
                <div className="border border-gold/20 p-4">
                    <p className="eyebrow text-gold mb-2">Summary</p>
                    <div className="flex justify-between text-charcoal/60"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                    <div className="flex justify-between text-charcoal/60"><span>GST</span><span>{formatPrice(order.tax)}</span></div>
                    <div className="flex justify-between font-medium text-base mt-1"><span>Total</span><span className="text-gold">{formatPrice(order.total)}</span></div>
                </div>
            </div>
        </div>
    );
}
