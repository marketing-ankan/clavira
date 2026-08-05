import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatPrice } from '../format';
import { ApproxPrice } from '../currency';
import { useCart } from '../store';

export default function CartDrawer() {
    const { cart, drawerOpen, setDrawerOpen, updateQty, remove } = useCart();

    return (
        <AnimatePresence>
            {drawerOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-50"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setDrawerOpen(false)}
                    />
                    <motion.aside
                        className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[92vw] bg-ivory z-50 flex flex-col"
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        aria-label="Shopping cart"
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gold/20">
                            <h2 className="font-display text-xl">Your Cart</h2>
                            <button onClick={() => setDrawerOpen(false)} aria-label="Close cart" className="p-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                            {cart.items.length === 0 && (
                                <div className="text-center py-16">
                                    <p className="font-display text-lg text-charcoal/60">Your cart awaits its first treasure.</p>
                                    <button className="btn-outline mt-6" onClick={() => setDrawerOpen(false)}>
                                        Continue Browsing
                                    </button>
                                </div>
                            )}
                            {cart.items.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    <Link to={`/product/${item.slug}`} onClick={() => setDrawerOpen(false)} className="shrink-0">
                                        {item.image && (
                                            <img src={`/${item.image}`} alt={item.name} className="w-20 h-20 object-cover bg-ivory-dark" />
                                        )}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-display leading-snug">{item.name}</p>
                                        {item.options && (
                                            <p className="text-[11px] text-charcoal/60 mt-0.5">
                                                {[item.options.metal, item.options.purity && `${item.options.purity}kt`, item.options.size && `Size ${item.options.size}`]
                                                    .filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center border border-gold/40">
                                                <button className="px-2.5 py-1" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease quantity">−</button>
                                                <span className="px-2 text-sm">{item.qty}</span>
                                                <button className="px-2.5 py-1" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase quantity">+</button>
                                            </div>
                                            <p className="text-sm text-gold-ink font-medium">{formatPrice(item.line_total)}</p>
                                        </div>
                                        <button className="text-[11px] uppercase tracking-[0.15em] text-charcoal/60 hover:text-maroon mt-1" onClick={() => remove(item.id)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cart.items.length > 0 && (
                            <div className="border-t border-gold/20 px-6 py-5 space-y-3">
                                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
                                <div className="flex justify-between text-sm text-charcoal/60"><span>GST (India delivery)</span><span>{formatPrice(cart.tax)}</span></div>
                                <div className="flex justify-between font-medium text-lg"><span>Total</span><span className="text-gold">{formatPrice(cart.total)}</span></div>
                                <p className="text-right text-xs"><ApproxPrice value={cart.total} /></p>
                                <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="btn-gold w-full mt-2">
                                    Secure Checkout
                                </Link>
                                <p className="text-[10px] text-center text-charcoal/60 uppercase tracking-[0.15em]">
                                    Insured shipping · BIS hallmarked · IGI certified
                                </p>
                            </div>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
