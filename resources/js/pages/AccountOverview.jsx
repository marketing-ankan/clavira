import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../api';
import { formatPrice } from '../format';
import { useAccount } from '../account';

export default function AccountOverview() {
    const { user } = useOutletContext();
    const { wishlistCount } = useAccount();
    const [orders, setOrders] = useState(null);

    useEffect(() => {
        api.get('/account/orders').then(({ data }) => setOrders(data.orders));
    }, []);

    return (
        <div className="space-y-8">
            <div className="grid sm:grid-cols-3 gap-4">
                <Tile label="Orders" value={orders?.total ?? '—'} to="/account/orders" />
                <Tile label="Wishlist" value={wishlistCount} to="/account/wishlist" />
                <Tile label="Member" value={user.email} small />
            </div>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl">Recent orders</h2>
                    <Link to="/account/orders" className="text-xs text-gold-ink hover:underline">View all</Link>
                </div>
                {orders?.data?.length ? (
                    <div className="border border-gold/20 divide-y divide-gold/10">
                        {orders.data.slice(0, 4).map((o) => (
                            <Link key={o.id} to={`/account/orders/${o.order_no}`} className="flex items-center justify-between px-4 py-3 hover:bg-gold/5">
                                <div>
                                    <p className="text-sm font-medium text-gold-ink">{o.order_no}</p>
                                    <p className="text-xs text-charcoal/60">{new Date(o.created_at).toLocaleDateString('en-IN')} · {o.items_count} item(s)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">{formatPrice(o.total)}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-charcoal/60">{o.status}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-charcoal/60 text-sm border border-gold/20 px-4 py-8 text-center">
                        No orders yet. <Link to="/" className="text-gold underline">Start exploring</Link>.
                    </p>
                )}
            </section>
        </div>
    );
}

function Tile({ label, value, to, small }) {
    const inner = (
        <div className="border border-gold/20 px-5 py-4 bg-white h-full">
            <p className={`font-display ${small ? 'text-base truncate' : 'text-2xl'} text-charcoal`}>{value}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-charcoal/60 mt-1">{label}</p>
        </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
}
