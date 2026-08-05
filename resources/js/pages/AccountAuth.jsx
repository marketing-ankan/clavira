import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from '../account';

const COPY = {
    login: { eyebrow: 'Welcome back', heading: 'Sign in to your account', cta: 'Sign in' },
    register: { eyebrow: 'Join Clavira', heading: 'Create your account', cta: 'Create account' },
    forgot: { eyebrow: 'Account recovery', heading: 'Reset your password', cta: 'Send reset link' },
};

/**
 * Where to land after signing in. `?next=/checkout` lets checkout bounce a
 * guest here and back again. Only same-site paths are honoured — an absolute
 * URL or protocol-relative `//host` here would be an open redirect.
 */
function safeNext(params) {
    const next = params.get('next');

    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

export default function AccountAuth() {
    const { user, ready, login, register, requestPasswordReset } = useAccount();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const destination = safeNext(params);

    useEffect(() => {
        if (ready && user) navigate(destination, { replace: true });
        window.scrollTo(0, 0);
    }, [ready, user, navigate, destination]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const go = (next) => {
        setMode(next);
        setError('');
        setNotice('');
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        setBusy(true);
        try {
            if (mode === 'forgot') {
                setNotice(await requestPasswordReset(form.email));
                return;
            }
            if (mode === 'login') {
                await login({ email: form.email, password: form.password });
            } else {
                await register(form);
            }
            navigate(destination, { replace: true });
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : res?.message ?? 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    };

    const cls = 'w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white';

    return (
        <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <p className="eyebrow text-gold-ink mb-2">{COPY[mode].eyebrow}</p>
                    <h1 className="font-display text-3xl">{COPY[mode].heading}</h1>
                    {mode === 'forgot' && (
                        <p className="text-sm text-charcoal/60 mt-3">
                            Enter the email address on your account and we will send you a secure link.
                        </p>
                    )}
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {mode === 'register' && (
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Full Name</span>
                            <input required value={form.name} onChange={set('name')} className={`${cls} mt-1.5`} />
                        </label>
                    )}
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Email</span>
                        <input required type="email" autoComplete="email" value={form.email} onChange={set('email')} className={`${cls} mt-1.5`} />
                    </label>
                    {mode !== 'forgot' && (
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Password</span>
                            <input
                                required
                                type="password"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                value={form.password}
                                onChange={set('password')}
                                className={`${cls} mt-1.5`}
                            />
                        </label>
                    )}
                    {mode === 'register' && (
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Confirm Password</span>
                            <input required type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} className={`${cls} mt-1.5`} />
                        </label>
                    )}

                    {mode === 'login' && (
                        <p className="text-right">
                            <button type="button" onClick={() => go('forgot')} className="text-sm text-gold-ink underline">
                                Forgot your password?
                            </button>
                        </p>
                    )}

                    {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
                    {notice && <p role="status" className="text-sm text-charcoal/70 border border-gold/30 bg-ivory px-4 py-3">{notice}</p>}

                    <button type="submit" disabled={busy} className="btn-gold w-full">
                        {busy ? 'Please wait…' : COPY[mode].cta}
                    </button>
                </form>

                <p className="text-center text-sm text-charcoal/60 mt-6">
                    {mode === 'forgot' ? (
                        <>
                            Remembered it?{' '}
                            <button onClick={() => go('login')} className="text-gold underline">Back to sign in</button>
                        </>
                    ) : (
                        <>
                            {mode === 'login' ? 'New to Clavira?' : 'Already have an account?'}{' '}
                            <button
                                onClick={() => go(mode === 'login' ? 'register' : 'login')}
                                className="text-gold underline"
                            >
                                {mode === 'login' ? 'Create an account' : 'Sign in'}
                            </button>
                        </>
                    )}
                </p>
            </div>
        </main>
    );
}
