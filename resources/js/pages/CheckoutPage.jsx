import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';
import { useCart } from '../store';

const COUNTRIES = [
    ['IN', 'India', '+91'],
    ['AE', 'United Arab Emirates', '+971'],
    ['US', 'United States', '+1'],
    ['GB', 'United Kingdom', '+44'],
    ['SG', 'Singapore', '+65'],
    ['AU', 'Australia', '+61'],
    ['CA', 'Canada', '+1'],
];

export default function CheckoutPage() {
    const { cart, refresh } = useCart();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '', email: '', phone: '', line1: '', line2: '',
        city: '', state: '', postal_code: '', country: 'IN', notes: '',
    });
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState('');

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const phoneCode = COUNTRIES.find(([code]) => code === form.country)?.[2] ?? '+91';

    const placeOrder = async (e) => {
        e.preventDefault();
        setError('');
        setPlacing(true);
        try {
            const { data } = await api.post('/checkout', { ...form, phone_country_code: phoneCode });

            if (data.demo_mode) {
                // Payment gateway not yet configured — confirm via demo stub
                const { data: confirmed } = await api.post('/checkout/confirm', {
                    gateway_order_id: data.gateway_order_id,
                });
                await refresh();
                navigate('/order-success', { state: { ...confirmed, demo: true } });
                return;
            }

            // Live Razorpay Checkout — card/UPI data handled entirely by Razorpay
            const rzp = new window.Razorpay({
                key: data.razorpay_key,
                amount: data.amount,
                currency: data.currency,
                name: 'Clavira',
                description: `Order ${data.order_no}`,
                order_id: data.gateway_order_id,
                prefill: { name: form.name, email: form.email, contact: `${phoneCode}${form.phone}` },
                theme: { color: '#b08d57' },
                handler: async (response) => {
                    const { data: confirmed } = await api.post('/checkout/confirm', {
                        gateway_order_id: response.razorpay_order_id,
                        payment_id: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                    });
                    await refresh();
                    navigate('/order-success', { state: confirmed });
                },
            });
            rzp.on('payment.failed', () => setError('Payment failed. You have not been charged — please try again.'));
            rzp.open();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setPlacing(false);
        }
    };

    if (cart.items.length === 0) {
        return (
            <main className="max-w-xl mx-auto px-4 py-32 text-center">
                <h1 className="font-display text-3xl">Your cart is empty</h1>
                <Link to="/" className="btn-gold mt-8">Explore the Collections</Link>
            </main>
        );
    }

    return (
        <main className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
            <h1 className="font-display text-3xl md:text-4xl text-center mb-12 gold-rule">Secure Checkout</h1>

            <form onSubmit={placeOrder} className="grid lg:grid-cols-5 gap-12">
                {/* Address */}
                <div className="lg:col-span-3 space-y-5">
                    <h2 className="eyebrow text-gold">Delivery Details</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full Name" required value={form.name} onChange={set('name')} />
                        <Field label="Email" type="email" required value={form.email} onChange={set('email')} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Country</span>
                            <select
                                value={form.country}
                                onChange={set('country')}
                                className="mt-1.5 w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                            >
                                {COUNTRIES.map(([code, label]) => (
                                    <option key={code} value={code}>{label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Phone *</span>
                            <div className="mt-1.5 flex">
                                <span className="border border-r-0 border-gold/30 px-3 py-3 bg-ivory-dark text-sm">{phoneCode}</span>
                                <input
                                    required value={form.phone} onChange={set('phone')}
                                    className="flex-1 border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                                />
                            </div>
                        </label>
                    </div>
                    <Field label="Address Line 1" required value={form.line1} onChange={set('line1')} />
                    <Field label="Address Line 2" value={form.line2} onChange={set('line2')} />
                    <div className="grid sm:grid-cols-3 gap-4">
                        <Field label="City" required value={form.city} onChange={set('city')} />
                        <Field label="State" required value={form.state} onChange={set('state')} />
                        <Field label="PIN / Postal Code" required value={form.postal_code} onChange={set('postal_code')} />
                    </div>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Order Notes (optional)</span>
                        <textarea
                            rows="3" value={form.notes} onChange={set('notes')}
                            className="mt-1.5 w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                            placeholder="Engraving, sizing, delivery instructions…"
                        />
                    </label>
                </div>

                {/* Summary */}
                <div className="lg:col-span-2">
                    <div className="border border-gold/30 p-6 sticky top-40">
                        <h2 className="eyebrow text-gold mb-5">Order Summary</h2>
                        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                            {cart.items.map((item) => (
                                <div key={item.id} className="flex gap-3 text-sm">
                                    {item.image && <img src={`/${item.image}`} alt="" className="w-14 h-14 object-cover" />}
                                    <div className="flex-1">
                                        <p className="font-display">{item.name}</p>
                                        <p className="text-charcoal/50 text-xs">Qty {item.qty}</p>
                                    </div>
                                    <p className="text-gold">{formatPrice(item.line_total)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gold/20 mt-5 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
                            <div className="flex justify-between text-charcoal/60"><span>GST (3%)</span><span>{formatPrice(cart.tax)}</span></div>
                            <div className="flex justify-between text-charcoal/60"><span>Insured Shipping</span><span>Complimentary</span></div>
                            <div className="flex justify-between font-medium text-lg pt-2"><span>Total</span><span className="text-gold">{formatPrice(cart.total)}</span></div>
                        </div>

                        {error && <p className="text-maroon text-sm mt-4">{error}</p>}

                        <button type="submit" className="btn-gold w-full mt-6" disabled={placing}>
                            {placing ? 'Processing…' : 'Pay Securely'}
                        </button>
                        <p className="text-[10px] text-center text-charcoal/40 mt-3 uppercase tracking-[0.12em] leading-relaxed">
                            256-bit encrypted · Powered by Razorpay<br />
                            Card details never touch our servers
                        </p>
                    </div>
                </div>
            </form>
        </main>
    );
}

function Field({ label, required, ...props }) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">
                {label}{required && ' *'}
            </span>
            <input
                required={required}
                {...props}
                className="mt-1.5 w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
            />
        </label>
    );
}
