import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert, Icon } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';

export function PasswordField({ label, value, onChange, autoComplete, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <label>{label}
      <div className="passwordbox">
        <input type={show ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete} value={value} onChange={onChange} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name="eye" size={18} /></button>
      </div>
    </label>
  );
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(f.email, f.password); nav('/'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form className="card" onSubmit={submit}>
        <h2>Welcome back</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Log in to see where your documents stand.</p>
        <Alert>{err}</Alert>
        <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <PasswordField label="Password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <p style={{ margin: '-4px 0 16px', textAlign: 'right' }}><Link to="/forgot-password" className="hint">Forgot password?</Link></p>
        <button className="btn teal block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted" style={{ marginTop: 18 }}>New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
