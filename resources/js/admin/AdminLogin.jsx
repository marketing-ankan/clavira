import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Field, inputCls } from './ui';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await api.post('/admin/login', { email, password });
            navigate('/admin', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message ?? 'Sign-in failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen admin-auth-bg flex items-center justify-center px-4">
            <form onSubmit={submit} className="w-full max-w-sm bg-ivory p-8 border-t-2 border-gold shadow-2xl">
                <img src="/images/brand/clavira-wordmark.png" alt="CLAVIRA" className="h-8 mx-auto" />
                <p className="text-center text-[11px] uppercase tracking-[0.24em] text-gold mt-3 mb-8">Admin Sign-in</p>

                <div className="space-y-4">
                    <Field label="Email">
                        <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Password">
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
                    </Field>
                </div>

                {error && <p className="text-sm text-maroon mt-4">{error}</p>}

                <button type="submit" disabled={busy} className="btn-gold w-full mt-6">
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}
