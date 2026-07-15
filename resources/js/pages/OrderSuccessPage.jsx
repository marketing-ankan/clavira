import { Link, useLocation } from 'react-router-dom';
import { formatPrice } from '../format';

export default function OrderSuccessPage() {
    const { state } = useLocation();

    return (
        <main className="max-w-xl mx-auto px-4 py-28 text-center">
            <div className="text-gold text-5xl mb-6">✦</div>
            <h1 className="font-display text-4xl">Thank You</h1>
            <p className="text-charcoal/60 mt-4 leading-relaxed">
                Your order has been placed with care.
                {state?.email && <> A confirmation is on its way to <strong>{state.email}</strong>.</>}
            </p>

            {state?.order_no && (
                <div className="border border-gold/30 bg-white p-6 mt-8 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-charcoal/50">Order No.</span><strong>{state.order_no}</strong></div>
                    {state.total != null && (
                        <div className="flex justify-between"><span className="text-charcoal/50">Amount</span><strong className="text-gold">{formatPrice(state.total)}</strong></div>
                    )}
                    <div className="flex justify-between"><span className="text-charcoal/50">Status</span><strong className="uppercase tracking-wide">{state.demo ? 'Confirmed (demo)' : 'Paid'}</strong></div>
                </div>
            )}

            {state?.demo && (
                <p className="text-[11px] uppercase tracking-[0.15em] text-maroon mt-4">
                    Demo checkout — Razorpay keys not yet configured
                </p>
            )}

            <p className="text-sm text-charcoal/50 mt-8 leading-relaxed">
                Every piece is BIS hallmarked, IGI certified where applicable, and dispatched fully insured.
            </p>
            <Link to="/" className="btn-gold mt-8">Continue Exploring</Link>
        </main>
    );
}
