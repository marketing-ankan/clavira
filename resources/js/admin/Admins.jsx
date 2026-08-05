import { useEffect, useState } from 'react';
import api from '../api';
import { useOutletContext } from 'react-router-dom';
import { Card, Field, StatusBadge, inputCls } from './ui';

export default function Admins() {
    const { user } = useOutletContext();
    const [data, setData] = useState(null);
    const [form, setForm] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [inviteUrl, setInviteUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const load = () => api.get('/admin/admins').then(({ data }) => setData(data));
    useEffect(() => { load(); }, []);

    const invite = async (e) => {
        e.preventDefault();
        setError(''); setNotice(''); setInviteUrl('');
        setBusy(true);
        try {
            const { data } = await api.post('/admin/admins/invite', form);
            setNotice(`Invitation sent to ${form.email}.`);
            if (data.invite_url) setInviteUrl(data.invite_url);
            setForm({ name: '', email: '' });
            load();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Could not send invitation.');
        } finally {
            setBusy(false);
        }
    };

    const resend = async (id) => {
        const { data } = await api.post(`/admin/admins/${id}/resend`);
        setNotice('Invitation re-sent.');
        if (data.invite_url) setInviteUrl(data.invite_url);
    };

    const revoke = async (id, email) => {
        if (!window.confirm(`Revoke admin access for ${email}?`)) return;
        try {
            await api.delete(`/admin/admins/${id}`);
            load();
        } catch (err) {
            alert(err.response?.data?.message ?? 'Could not revoke.');
        }
    };

    if (!data) return <p className="text-charcoal/60">Loading…</p>;

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="font-display text-2xl">Admin users</h1>
                <p className="text-sm text-charcoal/60 mt-1">
                    Admin access is invite-only and limited to{' '}
                    <strong>{data.allowed_domains.join(', ')}</strong> email addresses. Owner accounts cannot be revoked.
                </p>
            </div>

            <Card title="Current admins">
                <table className="w-full text-sm">
                    <tbody>
                        {data.admins.map((a) => (
                            <tr key={a.id} className="border-b border-gold/10 last:border-0">
                                <td className="py-3 pr-3">
                                    <p className="font-medium">{a.name}{a.id === user.id && <span className="text-charcoal/60 font-normal"> (you)</span>}</p>
                                    <p className="text-xs text-charcoal/60">{a.email}</p>
                                </td>
                                <td className="py-3 pr-3">
                                    {a.is_owner ? <span className="text-[10px] uppercase tracking-wider bg-gold-pale text-gold-ink px-2 py-1">Owner</span> : <StatusBadge status={a.status} />}
                                </td>
                                <td className="py-3 text-right whitespace-nowrap">
                                    {a.status === 'pending' && (
                                        <button onClick={() => resend(a.id)} className="text-xs text-gold-ink hover:underline mr-4">Resend link</button>
                                    )}
                                    {!a.is_owner && a.id !== user.id && (
                                        <button onClick={() => revoke(a.id, a.email)} className="text-xs text-maroon/70 hover:text-maroon">Revoke</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Card title="Invite an admin">
                <form onSubmit={invite} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <Field label="Name"><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></Field>
                    <Field label={`Email (@${data.allowed_domains[0]})`}><input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></Field>
                    <button type="submit" disabled={busy} className="btn-gold !py-2.5">{busy ? 'Sending…' : 'Send invite'}</button>
                </form>
                {error && <p className="text-sm text-maroon mt-3">{error}</p>}
                {notice && <p className="text-sm text-gold-ink mt-3">{notice}</p>}
                {inviteUrl && (
                    <div className="mt-3 text-xs bg-ivory-dark/60 border border-gold/20 p-3 break-all">
                        <p className="text-charcoal/60 mb-1">Set-password link (email is not configured yet — share this securely):</p>
                        <a href={inviteUrl} className="text-gold underline">{inviteUrl}</a>
                    </div>
                )}
            </Card>
        </div>
    );
}
