import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Alert } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';
import { PasswordField } from './Login.jsx';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { setDone((await api('/auth/forgot', { method: 'POST', body: { email } })).message); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell>
      <form className="card" onSubmit={submit}>
        <h2>Reset your password</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Enter your account email and we will send a reset link.</p>
        <Alert>{err}</Alert><Alert kind="ok">{done}</Alert>
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn teal block" disabled={busy || !!done}>{busy ? 'Sending…' : 'Send reset link'}</button>
        <p className="muted" style={{ marginTop: 18 }}><Link to="/login">Back to log in</Link></p>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/auth/reset', { method: 'POST', body: { email: q.get('email'), token: q.get('token'), password } }); nav('/login'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell>
      <form className="card" onSubmit={submit}>
        <h2>Choose a new password</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Use at least 8 characters.</p>
        <Alert>{err}</Alert>
        <PasswordField label="New password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn teal block" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        <p className="muted" style={{ marginTop: 18 }}><Link to="/forgot-password">Link expired? Request a new one</Link></p>
      </form>
    </AuthShell>
  );
}
