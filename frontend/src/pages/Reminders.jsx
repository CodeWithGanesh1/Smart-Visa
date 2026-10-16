import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../feedback.jsx';
import { Icon, Loading, PageHead, TYPE_LABEL, addDays, fmt, fmtTime } from '../ui.jsx';

const DAYS = [180, 120, 90, 60, 45, 30, 14, 7, 3, 1];
const TYPE = { expiry: 'Expiry reminder', expired: 'Expired', overstay: 'Overstay warning', compliance: 'Trip compliance', test: 'Test' };

export default function Reminders() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useState(user.prefs);
  const [phone, setPhone] = useState(user.phone || '');
  const [notes, setNotes] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api('/notifications').then((d) => setNotes(d.notifications)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); api('/documents').then((d) => setDocs(d.documents)).catch(() => {}); }, []);

  const toggleDay = (d) => setPrefs((p) => ({ ...p, reminderDays: p.reminderDays.includes(d) ? p.reminderDays.filter((x) => x !== d) : [...p.reminderDays, d] }));
  const flag = (k) => (e) => setPrefs({ ...prefs, [k]: e.target.checked });

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const d = await api('/auth/me', { method: 'PUT', body: { phone, prefs } }); setUser(d.user); toast('Reminder settings saved'); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true);
    try {
      const { notification: n } = await api('/notifications/test', { method: 'POST' });
      if (n.status === 'sent') toast(`Test email sent to ${user.email}. Check inbox and spam.`);
      else toast(n.status === 'skipped' ? `Not sent: ${n.error}` : `Sending failed: ${n.error}`, 'error');
      load();
    } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };

  // Upcoming schedule: for each document, the next reminder day the user's settings will trigger
  const days = [...prefs.reminderDays].sort((a, b) => b - a);
  const schedule = docs.filter((d) => d.daysLeft !== null && d.daysLeft >= 0).map((d) => {
    const t = days.find((x) => x < d.daysLeft);
    return t ? { d, t, on: addDays(d.expiryDate, -t) } : null;
  }).filter(Boolean).sort((a, b) => a.on.localeCompare(b.on)).slice(0, 6);

  return (
    <>
      <PageHead title="Reminders" sub="Choose when and how you want to be warned before a document lapses." />
      <div className="split">
        <form className="card" onSubmit={save}>
          <h2><Icon name="sliders" size={20} />When to remind me</h2>
          <p className="muted" style={{ marginBottom: 14 }}>You get one email as each document passes these many days before its expiry.</p>
          <div className="dayopts" style={{ marginBottom: 26 }}>
            {DAYS.map((d) => <label key={d}><input type="checkbox" checked={prefs.reminderDays.includes(d)} onChange={() => toggleDay(d)} /><span>{d} days</span></label>)}
          </div>
          <h2><Icon name="mail" size={20} />What to send</h2>
          <label className="switchrow"><span><b>Email reminders</b><span className="hint">Sent to {user.email}</span></span><input type="checkbox" className="switch" checked={prefs.email} onChange={flag('email')} /></label>
          <label className="switchrow"><span><b>Overstay warnings</b><span className="hint">When a visa has expired while a trip has no exit date</span></span><input type="checkbox" className="switch" checked={prefs.overstay} onChange={flag('overstay')} /></label>
          <label className="switchrow"><span><b>Trip document checks</b><span className="hint">30 days before a planned trip</span></span><input type="checkbox" className="switch" checked={prefs.compliance} onChange={flag('compliance')} /></label>
          <label className="switchrow" style={{ opacity: .6, cursor: 'not-allowed' }}><span><b>SMS reminders</b><span className="hint">Not available in this version</span></span><input type="checkbox" className="switch" disabled /></label>
          <label style={{ marginTop: 14 }}>Contact number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn teal" disabled={busy}>Save settings</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={test}><Icon name="mail" size={17} />Send me a test email</button>
          </div>
        </form>

        <div className="card">
          <h2><Icon name="calendar" size={20} />Coming up</h2>
          {schedule.length === 0 ? <p className="muted">No upcoming reminders. Add a document with an expiry date to see its schedule.</p> : schedule.map(({ d, t, on }) => (
            <div className="sched" key={d.id}><div><b>{d.title}</b><div className="hint">{TYPE_LABEL[d.type]} · {t}-day reminder</div></div><b>{fmt(on)}</b></div>
          ))}
          <p className="hint" style={{ marginTop: 10 }}>Reminders are checked every day at 08:00 IST.</p>
        </div>
      </div>

      <div className="card section">
        <h2><Icon name="bell" size={20} />Alert history</h2>
        {!notes ? <Loading /> : notes.length === 0 ? <p className="muted">No alerts yet. They appear here as soon as a document reaches one of your reminder days.</p> : (
          <div className="tablewrap"><table>
            <thead><tr><th>Date</th><th>Alert</th><th>Message</th><th>Delivery</th></tr></thead>
            <tbody>{notes.map((n) => (
              <tr key={n._id}><td>{fmtTime(n.createdAt)}</td><td>{TYPE[n.type]}</td><td><b>{n.subject}</b>{n.error && <div className="hint">{n.error}</div>}</td>
                <td><span className={`pill ${n.status}`}>{n.status}</span></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
