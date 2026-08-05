import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccount } from '../account';

/**
 * Landing page for the link in the password-reset email:
 *   /account/reset-password/:token?email=...
 * The token is validated server-side on submit — it is single-use and expires.
 */
export default function AccountResetPassword() {
    const { token } = useParams();
    const [params] = useSearchParams();
    const { resetPassword } = useAccount();
    const navigate = useNavigate();

    const email = params.get('email') ?? '';
    const [form, setForm] = useState({ password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await resetPassword({ token, email, ...form });
            navigate('/account', { replace: true });
        } catch (err) {
            const res = err.response?.data;
            setError(res?.errors ? Object.values(res.errors)[0][0] : res?.message ?? 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    };

    const cls = 'w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white';

    if (!email) {
        return (
            <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md text-center">
                    <p className="eyebrow text-gold-ink mb-2">Account recovery</p>
                    <h1 className="font-display text-3xl">This link is incomplete</h1>
                    <p className="text-sm text-charcoal/60 mt-4">
                        Please open the most recent reset link from your email, or request a new one.
                    </p>
                    <Link to="/account/login" className="btn-gold mt-8">Request a new link</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <p className="eyebrow text-gold-ink mb-2">Account recovery</p>
                    <h1 className="font-display text-3xl">Choose a new password</h1>
                    <p className="text-sm text-charcoal/60 mt-3">for {email}</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {/* Present but not editable — the token is bound to this address. */}
                    <input type="hidden" name="email" value={email} autoComplete="username" readOnly />

                    <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">New Password</span>
                        <input
                            required
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={form.password}
                            onChange={set('password')}
                            className={`${cls} mt-1.5`}
                        />
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Confirm New Password</span>
                        <input
                            required
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={form.password_confirmation}
                            onChange={set('password_confirmation')}
                            className={`${cls} mt-1.5`}
                        />
                    </label>

                    <p className="text-xs text-charcoal/60">At least 8 characters.</p>

                    {error && <p role="alert" className="text-sm text-maroon">{error}</p>}

                    <button type="submit" disabled={busy} className="btn-gold w-full">
                        {busy ? 'Please wait…' : 'Set new password'}
                    </button>
                </form>

                <p className="text-center text-sm text-charcoal/60 mt-6">
                    <Link to="/account/login" className="text-gold underline">Back to sign in</Link>
                </p>
            </div>
        </main>
    );
}
