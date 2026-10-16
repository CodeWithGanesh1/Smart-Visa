import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../feedback.jsx';
import { Alert, Icon, PageHead } from '../ui.jsx';
import { PasswordField } from './Login.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [err, setErr] = useState('');
  const [pwErr, setPwErr] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault(); setErr('');
    try { const d = await api('/auth/me', { method: 'PUT', body: p }); setUser(d.user); toast('Profile saved'); } catch (x) { setErr(x.message); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setPwErr('');
    try { await api('/auth/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); toast('Password changed'); } catch (x) { setPwErr(x.message); }
  };

  return (
    <>
      <PageHead title="Your profile" sub="Update your details or change your password." />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={saveProfile}>
          <h2><Icon name="user" size={20} />Details</h2>
          <Alert>{err}</Alert>
          <label>Full name<input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
          <label>Email<input value={user.email} disabled /><span className="hint">Email cannot be changed</span></label>
          <label>Contact number<input type="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></label>
          <button className="btn teal">Save profile</button>
        </form>
        <form className="card" onSubmit={savePw}>
          <h2><Icon name="lock" size={20} />Change password</h2>
          <Alert>{pwErr}</Alert>
          <PasswordField label="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <PasswordField label="New password (at least 8 characters)" minLength={8} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <button className="btn teal">Change password</button>
        </form>
      </div>
    </>
  );
}
