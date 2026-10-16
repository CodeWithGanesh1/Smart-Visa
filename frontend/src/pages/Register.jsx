import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';
import { PasswordField } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await register(f); nav('/documents/new'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form className="card" onSubmit={submit}>
        <h2>Create your account</h2>
        <p className="muted" style={{ marginBottom: 20 }}>It takes a minute. Your passport is the first thing to add.</p>
        <Alert>{err}</Alert>
        <label>Full name<input required autoComplete="name" value={f.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></label>
        <label>Contact number <span className="hint">(optional)</span><input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
        <PasswordField label="Password (at least 8 characters)" minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} />
        <button className="btn teal block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted" style={{ marginTop: 18 }}>Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
