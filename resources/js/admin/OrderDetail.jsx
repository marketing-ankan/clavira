import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';
import { Card, Field, Money, StatusBadge, inputCls } from './ui';

export default function OrderDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/admin/orders/${id}`).then(({ data }) => setData(data));
    }, [id]);

    if (!data) return <p className="text-charcoal/60 font-display text-lg">Loading…</p>;
    const { order, statuses, refunds = [], refunded_total: refundedTotal = 0, refundable = 0, can_cancel: canCancel } = data;
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
                    <Link to="/admin/orders" className="text-xs text-gold-ink hover:underline">← Orders</Link>
                    <h1 className="font-display text-2xl mt-1">{order.order_no}</h1>
                </div>
                <div className="flex items-center gap-3">
                    {['paid', 'processing', 'shipped', 'delivered', 'refunded'].includes(order.status) && (
                        /* Plain anchor: the session cookie authenticates the download. */
                        <a
                            href={`/api/admin/orders/${order.id}/invoice`}
                            className="btn-outline !py-2 !px-4 !text-[11px]"
                        >
                            Invoice PDF
                        </a>
                    )}
                    <StatusBadge status={order.status} />
                    <select value={order.status} onChange={changeStatus} disabled={saving} aria-label="Order status" className={`${inputCls} !w-auto`}>
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
                                <p className="text-xs text-charcoal/60">
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
                    {refundedTotal > 0 && (
                        <>
                            <div className="flex justify-between text-charcoal/60"><span>Refunded</span><span className="text-maroon">− <Money value={refundedTotal} /></span></div>
                            <div className="flex justify-between font-medium border-t border-gold/15 pt-1.5"><span>Net</span><Money value={Math.max(0, order.total - refundedTotal)} /></div>
                        </>
                    )}
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
                <Card title="Customer & shipping">
                    <div className="text-sm space-y-1 text-charcoal/80">
                        <p className="font-medium">{addr.name}</p>
                        <p>{order.email} · {addr.phone}</p>
                        <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                        <p>{addr.city}, {addr.state} {addr.postal_code} · {addr.country}</p>
                        {order.notes && <p className="pt-2 text-charcoal/60 italic whitespace-pre-line">“{order.notes}”</p>}
                    </div>
                </Card>
                <Card title="Payment">
                    {order.payments.length === 0 && <p className="text-sm text-charcoal/60">No payment records.</p>}
                    {order.payments.map((p) => (
                        <div key={p.id} className="text-sm space-y-1 border-b border-gold/10 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
                            <div className="flex justify-between"><span className="text-charcoal/60">Gateway</span><span className="uppercase">{p.gateway}</span></div>
                            <div className="flex justify-between"><span className="text-charcoal/60">Status</span><StatusBadge status={p.status === 'captured' ? 'paid' : p.status} /></div>
                            <div className="flex justify-between"><span className="text-charcoal/60">Gateway order</span><span className="text-xs">{p.gateway_order_id}</span></div>
                            {p.gateway_payment_id && <div className="flex justify-between"><span className="text-charcoal/60">Payment ID</span><span className="text-xs">{p.gateway_payment_id}</span></div>}
                            <div className="flex justify-between"><span className="text-charcoal/60">Amount</span><Money value={p.amount} /></div>
                        </div>
                    ))}
                </Card>
            </div>

            <RefundPanel
                orderId={id}
                orderNo={order.order_no}
                refunds={refunds}
                refundable={refundable}
                canCancel={canCancel}
                onChanged={setData}
            />
        </div>
    );
}

function RefundPanel({ orderId, orderNo, refunds, refundable, canCancel, onChanged }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const start = () => {
        setAmount(String(refundable));
        setReason('');
        setError('');
        setOpen(true);
    };

    const submit = async () => {
        const value = Number(amount);
        if (!(value > 0)) return setError('Enter an amount greater than zero.');
        if (value > refundable) return setError(`The most that can be refunded is ${formatPrice(refundable)}.`);
        if (!window.confirm(`Refund ${formatPrice(value)} against ${orderNo}? This sends money back to the customer and cannot be undone.`)) return;

        setBusy(true);
        setError('');
        try {
            const { data } = await api.post(`/admin/orders/${orderId}/refund`, { amount: value, reason: reason || null });
            onChanged(data);
            setOpen(false);
        } catch (err) {
            setError(err.response?.data?.message ?? 'The refund could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const cancelOrder = async () => {
        const warning = refundable > 0
            ? `Cancel ${orderNo} and refund ${formatPrice(refundable)} to the customer?`
            : `Cancel ${orderNo}? There is nothing to refund.`;
        if (!window.confirm(warning)) return;

        setBusy(true);
        setError('');
        try {
            const { data } = await api.post(`/admin/orders/${orderId}/cancel`, { reason: 'Cancelled by admin' });
            onChanged(data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'The order could not be cancelled.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card
            title="Refunds & cancellation"
            action={
                <div className="flex items-center gap-2">
                    {canCancel && (
                        <button onClick={cancelOrder} disabled={busy} className="btn-outline !py-2 !px-4 !text-[11px]">
                            Cancel order
                        </button>
                    )}
                    {refundable > 0 && !open && (
                        <button onClick={start} disabled={busy} className="btn-gold !py-2 !px-4 !text-[11px]">
                            Issue refund
                        </button>
                    )}
                </div>
            }
        >
            {refunds.length === 0 && !open && (
                <p className="text-sm text-charcoal/60">
                    No refunds issued.{refundable > 0 && ` ${formatPrice(refundable)} is available to refund.`}
                </p>
            )}

            {refunds.length > 0 && (
                <div className="space-y-2 mb-4">
                    {refunds.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b border-gold/10 last:border-0 pb-2 last:pb-0">
                            <div>
                                <p className="font-medium"><Money value={r.amount} /></p>
                                <p className="text-xs text-charcoal/60">
                                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {r.reason ? ` · ${r.reason}` : ''}
                                    {r.gateway_refund_id ? ` · ${r.gateway_refund_id}` : ''}
                                </p>
                                {r.error && <p className="text-xs text-maroon mt-0.5">{r.error}</p>}
                            </div>
                            <StatusBadge status={r.status} />
                        </div>
                    ))}
                </div>
            )}

            {open && (
                <div className="border-t border-gold/15 pt-4 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Field label={`Amount (max ${formatPrice(refundable)})`}>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={refundable}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Reason (optional)">
                            <input
                                type="text"
                                maxLength={190}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Returned — size exchange"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    {error && <p role="alert" className="text-sm text-maroon">{error}</p>}

                    <div className="flex gap-2">
                        <button onClick={submit} disabled={busy} className="btn-gold !py-2.5 !px-5">
                            {busy ? 'Refunding…' : 'Confirm refund'}
                        </button>
                        <button onClick={() => setOpen(false)} disabled={busy} className="btn-outline !py-2.5 !px-5">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {error && !open && <p role="alert" className="text-sm text-maroon mt-3">{error}</p>}
        </Card>
    );
}
