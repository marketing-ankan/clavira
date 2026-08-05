import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';

export function AccountOrders() {
    const [orders, setOrders] = useState(null);

    useEffect(() => {
        api.get('/account/orders').then(({ data }) => setOrders(data.orders));
    }, []);

    if (!orders) return <p className="text-charcoal/60">Loading…</p>;

    return (
        <div>
            <h2 className="font-display text-xl mb-5">Your orders</h2>
            {orders.data.length === 0 && <p className="text-charcoal/60 text-sm">You have not placed any orders yet.</p>}
            <div className="space-y-3">
                {orders.data.map((o) => (
                    <Link key={o.id} to={`/account/orders/${o.order_no}`} className="flex items-center justify-between border border-gold/20 px-5 py-4 hover:border-gold">
                        <div>
                            <p className="font-medium text-gold">{o.order_no}</p>
                            <p className="text-xs text-charcoal/60">{new Date(o.created_at).toLocaleDateString('en-IN')} · {o.items_count} item(s)</p>
                        </div>
                        <div className="text-right">
                            <p>{formatPrice(o.total)}</p>
                            <span className="text-[10px] uppercase tracking-wider bg-gold-pale text-gold-ink px-2 py-0.5">{o.status}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function AccountOrderDetail() {
    const { orderNo } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/account/orders/${orderNo}`).then(({ data }) => setData(data)).catch(() => setData(false));
    }, [orderNo]);

    if (data === false) return <p className="text-charcoal/60">Order not found.</p>;
    if (!data) return <p className="text-charcoal/60">Loading…</p>;
    const { order, refunds = [], refunded_total: refundedTotal = 0, invoice_available: invoiceAvailable } = data;
    const addr = order.shipping_address ?? {};

    return (
        <div className="space-y-6">
            <div>
                <Link to="/account/orders" className="text-xs text-gold-ink hover:underline">← All orders</Link>
                <div className="flex items-center justify-between mt-2">
                    <h2 className="font-display text-2xl">{order.order_no}</h2>
                    <span className="text-[11px] uppercase tracking-wider bg-gold-pale text-gold-ink px-3 py-1">{order.status}</span>
                </div>
                <p className="text-xs text-charcoal/60 mt-1">Placed {new Date(order.created_at).toLocaleString('en-IN')}</p>
                {invoiceAvailable && (
                    /* Plain anchor, not axios: the browser streams the download
                       and the session cookie does the authentication. */
                    <a
                        href={`/api/account/orders/${order.order_no}/invoice`}
                        className="inline-flex items-center gap-2 text-sm text-gold-ink underline mt-3"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                        </svg>
                        Download GST invoice (PDF)
                    </a>
                )}
            </div>

            <div className="border border-gold/20">
                {order.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-4 px-4 py-3 border-b border-gold/10 last:border-0">
                        {it.image && <img src={`/${it.image}`} alt="" className="w-12 h-12 object-cover" />}
                        <div className="flex-1">
                            <p className="text-sm font-medium">{it.name}</p>
                            <p className="text-xs text-charcoal/60">× {it.qty}</p>
                        </div>
                        <p className="text-sm">{formatPrice(it.total)}</p>
                    </div>
                ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6 text-sm">
                <div className="border border-gold/20 p-4">
                    <p className="eyebrow text-gold-ink mb-2">Delivery</p>
                    <p className="text-charcoal/70">{addr.name}</p>
                    <p className="text-charcoal/70">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p className="text-charcoal/70">{addr.city}, {addr.state} {addr.postal_code} · {addr.country}</p>
                </div>
                <div className="border border-gold/20 p-4">
                    <p className="eyebrow text-gold-ink mb-2">Summary</p>
                    <div className="flex justify-between text-charcoal/60"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                    <div className="flex justify-between text-charcoal/60"><span>GST</span><span>{formatPrice(order.tax)}</span></div>
                    <div className="flex justify-between font-medium text-base mt-1"><span>Total</span><span className="text-gold">{formatPrice(order.total)}</span></div>
                    {refundedTotal > 0 && (
                        <>
                            <div className="flex justify-between text-charcoal/60 mt-1"><span>Refunded</span><span className="text-maroon">− {formatPrice(refundedTotal)}</span></div>
                            <div className="flex justify-between font-medium border-t border-gold/15 mt-1 pt-1">
                                <span>Net paid</span><span>{formatPrice(Math.max(0, order.total - refundedTotal))}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {refunds.length > 0 && (
                <div className="border border-gold/20 p-4 text-sm">
                    <p className="eyebrow text-gold-ink mb-3">Refunds</p>
                    <div className="space-y-2">
                        {refunds.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-3 border-b border-gold/10 last:border-0 pb-2 last:pb-0">
                                <div>
                                    <p className="font-medium">{formatPrice(r.amount)}</p>
                                    <p className="text-xs text-charcoal/60">
                                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {r.reason ? ` · ${r.reason}` : ''}
                                    </p>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider bg-gold-pale text-gold-ink px-2 py-0.5">
                                    {r.status === 'processed' ? 'Refunded' : 'In progress'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-charcoal/60 mt-3">
                        Refunds usually reach your account within 5–7 working days, depending on your bank.
                    </p>
                </div>
            )}
        </div>
    );
}
