import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Indicative multi-currency display for NRI visitors.
 *
 * Every price on the site remains INR — Razorpay settles in INR and the
 * catalogue is priced in INR. Choosing another currency adds an "≈ AED 1,890"
 * hint beside key prices, converted with the daily rate the server put in
 * window.__CLAVIRA.fx. It is deliberately a hint, never a replacement: showing
 * only the converted figure would misrepresent what the card is charged.
 */
const KEY = 'clv_currency';
const CurrencyContext = createContext(null);

const config = () => window.__CLAVIRA ?? {};

/** Currencies we can actually convert to right now. */
export function availableCurrencies() {
    const fx = config().fx ?? {};
    const seen = new Set(['INR']);
    const list = [{ code: 'INR', label: 'INR ₹' }];

    for (const c of config().countries ?? []) {
        if (!seen.has(c.currency) && fx[c.currency] > 0) {
            seen.add(c.currency);
            list.push({ code: c.currency, label: c.currency });
        }
    }

    return list;
}

function readStored() {
    try {
        const code = localStorage.getItem(KEY);

        return code && availableCurrencies().some((c) => c.code === code) ? code : 'INR';
    } catch {
        return 'INR';
    }
}

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState(readStored);

    const choose = useCallback((code) => {
        setCurrency(code);
        try {
            localStorage.setItem(KEY, code);
        } catch {
            /* private mode — selection lasts the page life */
        }
    }, []);

    /** INR → selected currency, or null when INR is selected / no rate. */
    const approx = useCallback((inr) => {
        if (currency === 'INR') return null;
        const rate = (config().fx ?? {})[currency];
        if (!(rate > 0) || !(inr >= 0)) return null;

        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(inr * rate);
    }, [currency]);

    const value = useMemo(
        () => ({ currency, choose, approx, options: availableCurrencies() }),
        [currency, choose, approx],
    );

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext)
    ?? { currency: 'INR', choose: () => {}, approx: () => null, options: [{ code: 'INR', label: 'INR ₹' }] };

/** The "≈ AED 1,890 · indicative" hint. Renders nothing when INR is selected. */
export function ApproxPrice({ value, className = '' }) {
    const { approx } = useCurrency();
    const converted = approx(value);

    if (!converted) return null;

    return (
        <span className={`text-charcoal/60 ${className}`}>
            ≈ {converted} <span className="text-charcoal/60">· indicative, charged in INR</span>
        </span>
    );
}
