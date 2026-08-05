import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import { track } from './analytics';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState({ items: [], subtotal: 0, tax: 0, total: 0 });
    const [drawerOpen, setDrawerOpen] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get('/cart');
            setCart(data);
        } catch {
            /* cart unavailable — leave empty */
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const add = useCallback(async (productId, variantId, options, qty = 1) => {
        const { data } = await api.post('/cart', {
            product_id: productId,
            variant_id: variantId,
            options,
            qty,
        });
        setCart(data);
        setDrawerOpen(true);

        // The response is the whole cart; the line just added is the last one
        // matching this product, which is what we want to report.
        const added = [...(data.items ?? [])].reverse().find((i) => i.product_id === productId);
        track.addToCart(added);
    }, []);

    const updateQty = useCallback(async (itemId, qty) => {
        const { data } = await api.patch(`/cart/${itemId}`, { qty });
        setCart(data);
    }, []);

    const remove = useCallback(async (itemId) => {
        const { data } = await api.delete(`/cart/${itemId}`);
        setCart(data);
    }, []);

    const count = cart.items.reduce((n, i) => n + i.qty, 0);

    return (
        <CartContext.Provider value={{ cart, count, add, updateQty, remove, refresh, drawerOpen, setDrawerOpen }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
