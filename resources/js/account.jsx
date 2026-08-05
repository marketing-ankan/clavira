import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';

/** Customer auth + wishlist, provided app-wide to the storefront. */
const AccountContext = createContext(null);

export function AccountProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const [wishlistIds, setWishlistIds] = useState([]);

    const loadWishlist = useCallback(async () => {
        try {
            const { data } = await api.get('/wishlist');
            setWishlistIds(data.ids);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => setUser(data.user))
            .catch(() => setUser(null))
            .finally(() => setReady(true));
        loadWishlist();
    }, [loadWishlist]);

    const login = useCallback(async (payload) => {
        const { data } = await api.post('/auth/login', payload);
        setUser(data.user);
        await loadWishlist();
        return data.user;
    }, [loadWishlist]);

    const register = useCallback(async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        setUser(data.user);
        await loadWishlist();
        return data.user;
    }, [loadWishlist]);

    /** Always resolves — the API answers identically for known and unknown addresses. */
    const requestPasswordReset = useCallback(async (email) => {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data.message;
    }, []);

    const resetPassword = useCallback(async (payload) => {
        const { data } = await api.post('/auth/reset-password', payload);
        setUser(data.user);
        await loadWishlist();
        return data.user;
    }, [loadWishlist]);

    const logout = useCallback(async () => {
        await api.post('/auth/logout');
        setUser(null);
        setWishlistIds([]);
    }, []);

    const toggleWishlist = useCallback(async (productId) => {
        const { data } = await api.post('/wishlist/toggle', { product_id: productId });
        setWishlistIds((ids) => (data.in_wishlist ? [...ids, productId] : ids.filter((id) => id !== productId)));
        return data.in_wishlist;
    }, []);

    const inWishlist = useCallback((id) => wishlistIds.includes(id), [wishlistIds]);

    return (
        <AccountContext.Provider value={{ user, ready, login, register, logout, requestPasswordReset, resetPassword, wishlistIds, wishlistCount: wishlistIds.length, toggleWishlist, inWishlist, loadWishlist }}>
            {children}
        </AccountContext.Provider>
    );
}

export const useAccount = () => useContext(AccountContext);
