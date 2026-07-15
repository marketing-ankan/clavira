import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { Field, inputCls } from './ui';

export default function SetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [state, setState] = useState({ loading: true, valid: false, email: '', name: '' });
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        api.get(`/admin/invite/${token}`)
            .then(({ data }) => setState({ loading: false, valid: data.valid, email: data.email, name: data.name }))
            .catch(() => setState({ loading: false, valid: false }));
    }, [token]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) return setError('Passwords do not match.');
        setBusy(true);
        try {
            await api.post(`/admin/invite/${token}`, { password, password_confirmation: confirm });
            setDone(true);
            setTimeout(() => navigate('/admin/login', { replace: true }), 2200);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Could not set your password.');
        } finally {
            setBusy(false);
        }
    };

    const Shell = ({ children }) => (
        <div className="min-h-screen admin-auth-bg flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-ivory p-8 border-t-2 border-gold text-center shadow-2xl">
                <img src="/images/brand/clavira-wordmark.png" alt="CLAVIRA" className="h-8 mx-auto" />
                <p className="text-[11px] uppercase tracking-[0.24em] text-gold mt-3 mb-6">Admin Access</p>
                {children}
            </div>
        </div>
    );

    if (state.loading) return <Shell><p className="text-charcoal/50">Checking your link…</p></Shell>;

    if (!state.valid) {
        return (
            <Shell>
                <p className="font-display text-xl text-maroon">This link is invalid or has expired.</p>
                <p className="text-sm text-charcoal/60 mt-2">Please ask an owner to send you a new invitation.</p>
            </Shell>
        );
    }

    if (done) {
        return (
            <Shell>
                <div className="text-gold text-4xl mb-3">✦</div>
                <p className="font-display text-xl">Password set</p>
                <p className="text-sm text-charcoal/60 mt-2">Redirecting you to sign in…</p>
            </Shell>
        );
    }

    return (
        <Shell>
            <p className="text-sm text-charcoal/70 mb-1">Welcome, {state.name}</p>
            <p className="text-xs text-charcoal/50 mb-6">{state.email}</p>
            <form onSubmit={submit} className="space-y-4 text-left">
                <Field label="Create password">
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Confirm password">
                    <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
                </Field>
                {error && <p className="text-sm text-maroon">{error}</p>}
                <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? 'Saving…' : 'Set password & activate'}</button>
            </form>
            <p className="text-[10px] text-charcoal/40 mt-4">Minimum 8 characters. This link works once.</p>
        </Shell>
    );
}
