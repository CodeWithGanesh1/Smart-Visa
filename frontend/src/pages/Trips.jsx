import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useConfirm, useToast } from '../feedback.jsx';
import { Alert, Empty, Icon, Loading, PageHead, addDays, fmt, todayISO } from '../ui.jsx';

const ITEM = { passport: 'Passport', visa: 'Visa', insurance: 'Travel insurance', vaccination: 'Vaccinations' };
const MARK = { ok: '✓', warn: '!', fail: '✕' };

export function ComplianceList({ result }) {
  return (
    <>
      <p className="muted" style={{ marginBottom: 6 }}>
        {result.overall === 'ok' ? 'Everything on file covers this trip.' : result.overall === 'warn' ? 'A few things need checking before you travel.' : 'Some documents will block this trip until fixed.'}
      </p>
      <ul className="checklist">
        {result.checks.map((c) => (
          <li key={c.item}><span className={`mark ${c.status}`} aria-label={c.status}>{MARK[c.status]}</span><div><b>{ITEM[c.item]}</b><div className="muted" style={{ fontSize: '.92rem' }}>{c.message}</div></div></li>
        ))}
      </ul>
    </>
  );
}

const BLANK = { country: '', entryDate: '', exitDate: '', purpose: '', visa: '', notes: '' };
const STATE = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed' };
const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

// Days spent in each country during the last 180 days (rolling window)
function stayCounts(trips) {
  const today = todayISO(), start = addDays(today, -179), out = {};
  trips.filter((t) => t.state !== 'planned').forEach((t) => {
    const s = t.entryDate > start ? t.entryDate : start;
    const e = !t.exitDate || t.exitDate > today ? today : t.exitDate;
    if (e >= s) { const k = t.country.trim(); out[k] = (out[k] || 0) + dayDiff(s, e) + 1; }
  });
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

export default function Trips() {
  const toast = useToast();
  const confirm = useConfirm();
  const [trips, setTrips] = useState(null);
  const [visas, setVisas] = useState([]);
  const [docs, setDocs] = useState([]);
  const [f, setF] = useState(BLANK);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [checks, setChecks] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api('/trips'), api('/documents')]).then(([t, d]) => { setTrips(t.trips); setDocs(d.documents); setVisas(d.documents.filter((x) => x.type === 'visa')); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api(editing ? `/trips/${editing}` : '/trips', { method: editing ? 'PUT' : 'POST', body: f });
      toast(editing ? 'Trip updated' : 'Trip added'); setF(BLANK); setEditing(null); await load();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const edit = (t) => { setEditing(t.id); setF({ country: t.country, entryDate: t.entryDate, exitDate: t.exitDate || '', purpose: t.purpose, visa: t.visa?.id || '', notes: t.notes }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (t) => {
    if (!(await confirm({ title: `Delete the ${t.country} trip?`, body: 'This removes it from your travel history.', confirmLabel: 'Delete', danger: true }))) return;
    try { await api(`/trips/${t.id}`, { method: 'DELETE' }); toast('Trip deleted'); load(); } catch (x) { toast(x.message, 'error'); }
  };
  const left = async (t) => {
    try { await api(`/trips/${t.id}`, { method: 'PUT', body: { country: t.country, entryDate: t.entryDate, exitDate: todayISO(), purpose: t.purpose, visa: t.visa?.id || '', notes: t.notes } }); toast(`Marked as left ${t.country} today`); load(); } catch (x) { toast(x.message, 'error'); }
  };
  const check = async (t) => {
    try { setChecks({ ...checks, [t.id]: await api(`/trips/compliance?country=${encodeURIComponent(t.country)}&date=${t.entryDate}`) }); } catch (x) { toast(x.message, 'error'); }
  };

  if (!trips) return <>{err ? <Alert>{err}</Alert> : <Loading />}</>;

  const visits = {};
  trips.filter((t) => t.state !== 'planned').forEach((t) => { const k = t.country.trim(); visits[k] = (visits[k] || 0) + 1; });
  const stays = stayCounts(trips);
  const renewals = docs.flatMap((d) => d.renewals.map((r) => ({ ...r, title: d.title }))).sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <>
      <PageHead title="Travel history" sub="Record trips, see which visa you used, and check planned trips against your documents." />

      <form className="card" onSubmit={submit}>
        <h2><Icon name="plus" size={20} />{editing ? 'Edit trip' : 'Add a trip'}</h2>
        <Alert>{err}</Alert>
        <div className="grid g2">
          <label>Country<input required value={f.country} onChange={set('country')} /></label>
          <label>Purpose of visit<input value={f.purpose} onChange={set('purpose')} placeholder="Tourism, conference, study…" /></label>
          <label>Entry date<input type="date" required value={f.entryDate} onChange={set('entryDate')} /></label>
          <label>Exit date <span className="hint">(empty if you have not left yet)</span><input type="date" value={f.exitDate} onChange={set('exitDate')} /></label>
          <label>Visa used<select value={f.visa} onChange={set('visa')}><option value="">No visa / not applicable</option>{visas.map((v) => <option key={v.id} value={v.id}>{v.title} ({v.country})</option>)}</select></label>
          <label>Notes<input value={f.notes} onChange={set('notes')} /></label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn teal" disabled={busy}>{editing ? 'Save trip' : 'Add trip'}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setF(BLANK); }}>Cancel</button>}
        </div>
      </form>

      {(Object.keys(visits).length > 0 || stays.length > 0) && (
        <div className="grid g2 section">
          <div className="card"><h2><Icon name="pin" size={20} />Countries visited</h2>
            {Object.keys(visits).length === 0 ? <p className="muted">No completed trips yet.</p> : <div className="chips">{Object.entries(visits).map(([c, n]) => <span className="chip" key={c}>{c} × {n}</span>)}</div>}</div>
          <div className="card"><h2><Icon name="calendar" size={20} />Days in the last 180 days</h2>
            {stays.length === 0 ? <p className="muted">No stays in the last 180 days.</p> : <div className="chips">{stays.map(([c, n]) => <span className="chip" key={c}>{c}: {n} day{n === 1 ? '' : 's'}</span>)}</div>}
            <p className="hint" style={{ marginTop: 10 }}>For information only. Some regions, like Schengen, count several countries together. Check the official rules.</p></div>
        </div>
      )}

      <div className="card section">
        <h2><Icon name="plane" size={20} />All trips</h2>
        {trips.length === 0 ? <Empty icon="plane" title="No trips yet">Add your first trip above, or a planned one to get a document check.</Empty> : trips.map((t) => (
          <div key={t.id} className="row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="title">{t.country} <span className={`pill ${t.state === 'ongoing' ? 'warn' : t.state === 'planned' ? '' : 'ok'}`}>{STATE[t.state]}</span></div>
                <span className="muted">{fmt(t.entryDate)} to {t.exitDate ? fmt(t.exitDate) : 'no exit date'}{t.days ? ` (${t.days} days)` : ''}{t.purpose && ` · ${t.purpose}`}{t.visa && ` · visa: ${t.visa.title}`}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {t.state === 'planned' && <button className="btn teal sm" onClick={() => check(t)}>Check documents</button>}
                {t.state === 'ongoing' && !t.exitDate && <button className="btn ghost sm" onClick={() => left(t)}>I have left</button>}
                <button className="btn ghost sm" onClick={() => edit(t)}><Icon name="edit" size={15} />Edit</button>
                <button className="btn danger sm" onClick={() => remove(t)} aria-label={`Delete ${t.country} trip`}><Icon name="trash" size={15} /></button>
              </div>
            </div>
            {checks[t.id] && <div style={{ marginTop: 12 }}><ComplianceList result={checks[t.id]} /></div>}
          </div>
        ))}
      </div>

      <div className="card section">
        <h2><Icon name="refresh" size={20} />Document renewal log</h2>
        {renewals.length === 0 ? <p className="muted">When you renew a document, the old and new expiry dates are recorded here.</p> : (
          <div className="tablewrap"><table><thead><tr><th>Renewed on</th><th>Document</th><th>Old expiry</th><th>New expiry</th></tr></thead>
            <tbody>{renewals.map((r, i) => <tr key={i}><td>{new Date(r.at).toLocaleDateString('en-GB')}</td><td>{r.title}</td><td>{fmt(r.oldExpiry)}</td><td>{fmt(r.newExpiry)}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </>
  );
}
