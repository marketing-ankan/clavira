import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { disableAndReload, enable, hasTags, track } from './analytics';

const KEY = 'clv_consent';
const ConsentContext = createContext(null);

function read() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY));
        if (!raw || typeof raw.ts !== 'number') return null;

        const months = window.__CLAVIRA?.consent_ttl_months ?? 12;
        const expired = Date.now() - raw.ts > months * 30 * 24 * 60 * 60 * 1000;

        return expired ? null : raw;
    } catch {
        return null;
    }
}

function write(choice) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...choice, ts: Date.now() }));
    } catch {
        /* private mode — the choice holds for this page life only */
    }
}

export function ConsentProvider({ children }) {
    const [choice, setChoice] = useState(() => read());
    const [open, setOpen] = useState(false);

    // Only ask when there is actually something to consent to.
    const needed = hasTags();

    useEffect(() => {
        if (choice) enable(choice);
    }, [choice]);

    const decide = useCallback((next) => {
        const previous = read();
        write(next);
        setChoice(next);
        setOpen(false);

        // Turning a tag OFF cannot be done in place — reload to be sure.
        const revoked = previous && ((previous.analytics && !next.analytics) || (previous.marketing && !next.marketing));
        if (revoked) disableAndReload();
        else enable(next);
    }, []);

    const value = useMemo(() => ({
        choice,
        decide,
        reopen: () => setOpen(true),
        needed,
    }), [choice, decide, needed]);

    return (
        <ConsentContext.Provider value={value}>
            {children}
            {needed && (!choice || open) && (
                <ConsentBanner
                    current={choice}
                    onDecide={decide}
                    onDismiss={choice ? () => setOpen(false) : null}
                />
            )}
        </ConsentContext.Provider>
    );
}

export const useConsent = () => useContext(ConsentContext) ?? { choice: null, needed: false, decide: () => {}, reopen: () => {} };

/** Fire GA/Meta page views on client-side route changes. */
export function usePageViewTracking(pathname) {
    const { choice } = useConsent();

    useEffect(() => {
        if (choice?.analytics || choice?.marketing) track.pageView(pathname, document.title);
    }, [pathname, choice]);
}

function ConsentBanner({ current, onDecide, onDismiss }) {
    const [analytics, setAnalytics] = useState(current?.analytics ?? true);
    const [marketing, setMarketing] = useState(current?.marketing ?? false);
    const [detail, setDetail] = useState(false);

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="clv-consent-title"
            className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-5 sm:pb-5"
        >
            <div className="mx-auto max-w-3xl bg-white border border-gold/30 shadow-[0_10px_40px_-12px_rgba(26,23,20,0.35)]">
                <div className="p-5 sm:p-6">
                    <p className="eyebrow text-gold-ink mb-2">Your privacy</p>
                    <h2 id="clv-consent-title" className="font-display text-xl sm:text-2xl">
                        We use a few cookies
                    </h2>
                    <p className="text-sm text-charcoal/70 mt-2 leading-relaxed">
                        Essential cookies keep your cart and sign-in working, and are always on.
                        With your permission we would also like to measure how the site is used,
                        so we can make it better.
                    </p>

                    {detail && (
                        <div className="mt-4 space-y-3 border-t border-gold/15 pt-4">
                            <Row
                                title="Essential"
                                body="Cart, wishlist, sign-in and security. The site cannot work without these."
                                checked
                                disabled
                            />
                            <Row
                                title="Analytics"
                                body="Anonymous usage statistics, so we know which pages help and which do not."
                                checked={analytics}
                                onChange={setAnalytics}
                            />
                            <Row
                                title="Marketing"
                                body="Lets us measure our advertising and show you relevant pieces elsewhere."
                                checked={marketing}
                                onChange={setMarketing}
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2.5 mt-5">
                        <button
                            type="button"
                            onClick={() => onDecide({ analytics: true, marketing: true })}
                            className="btn-gold !py-3 !px-6 flex-1 sm:flex-none"
                        >
                            Accept all
                        </button>
                        <button
                            type="button"
                            onClick={() => onDecide({ analytics: false, marketing: false })}
                            className="btn-outline !py-3 !px-6 flex-1 sm:flex-none"
                        >
                            Reject non-essential
                        </button>
                        {detail ? (
                            <button
                                type="button"
                                onClick={() => onDecide({ analytics, marketing })}
                                className="btn-outline !py-3 !px-6 flex-1 sm:flex-none"
                            >
                                Save choices
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setDetail(true)}
                                className="text-sm text-gold-ink underline px-2 self-center"
                            >
                                Choose individually
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-sm text-charcoal/60 underline px-2 self-center"
                            >
                                Close
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-charcoal/60 mt-3">
                        Read our <a href="/policies/privacy" className="text-gold-ink underline">privacy policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Row({ title, body, checked, onChange, disabled = false }) {
    return (
        <label className="flex gap-3 items-start cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
                className="mt-1 accent-[color:var(--color-gold)] w-4 h-4"
            />
            <span>
                <span className="block text-sm font-medium">
                    {title}{disabled && <span className="text-charcoal/60 font-normal"> · always on</span>}
                </span>
                <span className="block text-xs text-charcoal/60 leading-relaxed">{body}</span>
            </span>
        </label>
    );
}
