import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../account';

export default function AccountAuth() {
    const { user, ready, login, register } = useAccount();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (ready && user) navigate('/account', { replace: true });
        window.scrollTo(0, 0);
    }, [ready, user, navigate]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            if (mode === 'login') {
                await login({ email: form.email, password: form.password });
            } else {
                await register(form);
            }
            navigate('/account', { replace: true });
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
                    <p className="eyebrow text-gold mb-2">{mode === 'login' ? 'Welcome back' : 'Join Clavira'}</p>
                    <h1 className="font-display text-3xl">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h1>
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
                        <input required type="email" value={form.email} onChange={set('email')} className={`${cls} mt-1.5`} />
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Password</span>
                        <input required type="password" value={form.password} onChange={set('password')} className={`${cls} mt-1.5`} />
                    </label>
                    {mode === 'register' && (
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60">Confirm Password</span>
                            <input required type="password" value={form.password_confirmation} onChange={set('password_confirmation')} className={`${cls} mt-1.5`} />
                        </label>
                    )}

                    {error && <p className="text-sm text-maroon">{error}</p>}

                    <button type="submit" disabled={busy} className="btn-gold w-full">
                        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                    </button>
                </form>

                <p className="text-center text-sm text-charcoal/60 mt-6">
                    {mode === 'login' ? 'New to Clavira?' : 'Already have an account?'}{' '}
                    <button
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                        className="text-gold underline"
                    >
                        {mode === 'login' ? 'Create an account' : 'Sign in'}
                    </button>
                </p>
            </div>
        </main>
    );
}
