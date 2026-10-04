import { useState } from 'react';

const isLocalVite = window.location.hostname === 'localhost' && window.location.port === '5173';
const apiUrl = import.meta.env.VITE_API_URL || (isLocalVite ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyEmail, setBusyEmail] = useState('');

  async function adminRequest(path, options = {}) {
    const response = await fetch(`${apiUrl}/subscriptions/admin/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...options.headers }
    });
    const payload = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(payload.message || 'Admin request failed.');
    return payload;
  }

  async function loadAccounts() {
    setLoading(true);
    setError('');
    try {
      const payload = await adminRequest('subscriptions');
      setAccounts(payload.data || []);
      setAuthorized(true);
    } catch (requestError) {
      setAuthorized(false);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateSubscription(account, action) {
    if (action === 'cancel' && !window.confirm(`Cancel subscription access for ${account.email}?`)) return;
    setBusyEmail(account.email);
    setError('');
    setMessage('');
    try {
      const payload = await adminRequest(action, {
        method: 'POST',
        body: JSON.stringify({ email: account.email, durationDays: 30 })
      });
      setMessage(payload.message || 'Subscription updated.');
      await loadAccounts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyEmail('');
    }
  }

  return <main className="app-shell"><section className="container py-5 dashboard-page">
    <div className="mb-4"><div className="eyebrow mb-2">Administration</div><h1 className="h2 fw-bold mb-1">Subscription management</h1><p className="text-secondary">Review accounts and manage subscriber access.</p></div>
    {!authorized && <form className="auth-card mb-4" onSubmit={(event) => { event.preventDefault(); loadAccounts(); }}>
      <label className="form-label" htmlFor="admin-key">Administrator API key</label>
      <input id="admin-key" className="form-control mb-3" type="password" autoComplete="current-password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} required />
      <button className="btn btn-primary" type="submit" disabled={loading || !adminKey}>{loading ? 'Checking key…' : 'Open admin section'}</button>
      <p className="small text-secondary mt-3 mb-0">The key stays in this page’s memory and is sent to the server with each admin request.</p>
    </form>}
    {error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}
    {authorized && <><div className="d-flex justify-content-between align-items-center mb-3"><p className="text-secondary mb-0">Showing up to 100 recent accounts.</p><button className="btn btn-outline-secondary btn-sm" onClick={loadAccounts} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh list'}</button></div>
      {accounts.length === 0 ? <div className="empty-state"><div><strong>No accounts registered yet.</strong></div></div> : accounts.map((account) => {
        const status = account.subscription?.status || 'pending';
        const busy = busyEmail === account.email;
        return <article className="opportunity-row p-3 mb-3" key={account.id}><div className="d-flex flex-wrap justify-content-between align-items-center gap-3"><div><strong>{account.name}</strong><div className="small text-secondary">{account.email}</div><div className="small mt-1">Plan: {account.subscription?.plan || 'pro-monthly'} · Status: <strong className="text-capitalize">{status}</strong>{account.subscription?.endsAt && ` · Ends ${new Date(account.subscription.endsAt).toLocaleDateString('en-NG')}`}</div></div><div className="d-flex gap-2">{status !== 'active' && <button className="btn btn-primary btn-sm" onClick={() => updateSubscription(account, 'activate')} disabled={busy}>{busy ? 'Saving…' : 'Activate 30 days'}</button>}{status === 'active' && <button className="btn btn-outline-danger btn-sm" onClick={() => updateSubscription(account, 'cancel')} disabled={busy}>{busy ? 'Saving…' : 'Cancel access'}</button>}</div></div></article>;
      })}</>}
  </section></main>;
}
