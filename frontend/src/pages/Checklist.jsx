import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../feedback.jsx';
import { Alert, Icon, PageHead, fmt } from '../ui.jsx';

const MANUAL = [
  ['ticket', 'Return or onward ticket', 'Most airlines and immigration desks ask for it.'],
  ['stay', 'Accommodation booking or host address', 'Keep a printed or offline copy.'],
  ['funds', 'Proof of funds', 'Recent bank statement or the cards you will carry.'],
  ['copies', 'Copies of all documents', 'Keep photocopies and phone photos separate from the originals.'],
];
const NAMES = { passport: 'Passport valid for the trip', visa: 'Visa for the destination', insurance: 'Travel insurance for the dates', vaccination: 'Vaccination records' };

export default function Checklist() {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ country: '', date: '' });
  const [res, setRes] = useState(null);
  const [done, setDone] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true); setDone({});
    try { setRes(await api(`/trips/compliance?country=${encodeURIComponent(f.country)}&date=${f.date}`)); } catch (x) { setErr(x.message); setRes(null); } finally { setBusy(false); }
  };

  const download = () => {
    const lines = ['TRAVEL DOCUMENT CHECKLIST', `Traveller: ${user.name}`, `Destination: ${res.country}`, `Travel date: ${fmt(res.date)}`, ''];
    res.checks.forEach((c) => lines.push(`[${c.status === 'ok' ? 'x' : ' '}] ${NAMES[c.item]}\n      ${c.message}`));
    MANUAL.forEach(([k, t, h]) => lines.push(`[${done[k] ? 'x' : ' '}] ${t}\n      ${h}`));
    lines.push('', `Generated ${new Date().toLocaleDateString('en-GB')} by Smart Visa & Travel Document Tracker`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    a.download = `checklist-${res.country.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    toast('Checklist downloaded');
  };

  return (
    <>
      <PageHead title="Trip checklist" sub="Pick a destination and travel date to see what is covered and what is missing.">
        {res && <><button className="btn ghost noprint" onClick={() => window.print()}>Print</button><button className="btn teal noprint" onClick={download}><Icon name="download" size={18} />Download</button></>}
      </PageHead>
      <form className="card noprint" onSubmit={run} style={{ maxWidth: 760 }}>
        <Alert>{err}</Alert>
        <div className="grid g2">
          <label>Destination country<input required value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></label>
          <label>Travel date<input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        </div>
        <button className="btn teal" disabled={busy}>{busy ? 'Checking…' : 'Build checklist'}</button>
      </form>

      {res && (
        <div className="card section" style={{ maxWidth: 760 }}>
          <h2>{res.country} · {fmt(res.date)}</h2>
          <ul className="checklist">
            {res.checks.map((c) => (
              <li key={c.item}><span className={`mark ${c.status}`}>{c.status === 'ok' ? '✓' : c.status === 'warn' ? '!' : '✕'}</span>
                <div><b>{NAMES[c.item]}</b><div className="muted" style={{ fontSize: '.92rem' }}>{c.message}</div></div></li>
            ))}
            {MANUAL.map(([k, t, h]) => (
              <li key={k}><button className={`mark ${done[k] ? 'ok' : 'todo'}`} style={{ cursor: 'pointer' }} aria-pressed={!!done[k]} aria-label={`Mark done: ${t}`} onClick={() => setDone({ ...done, [k]: !done[k] })}>{done[k] ? '✓' : ''}</button>
                <div><b>{t}</b><div className="muted" style={{ fontSize: '.92rem' }}>{h}</div></div></li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 14 }}>This list uses the documents you have saved. Entry rules differ by country, so confirm requirements with the embassy or official immigration site.</p>
        </div>
      )}
    </>
  );
}
