import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Empty, Icon, Loading, Meter, Ring, Stamp, TYPE_ICON, TYPE_LABEL, daysText, fmt, fmtTime } from '../ui.jsx';
import { ComplianceList } from './Trips.jsx';

const SCORE = { valid: 100, warning: 70, critical: 40, expired: 0 };

export default function Dashboard() {
  const { user } = useAuth();
  const [docs, setDocs] = useState(null);
  const [notes, setNotes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [next, setNext] = useState(null);
  const [comp, setComp] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([api('/documents'), api('/notifications'), api('/trips')])
      .then(([d, n, t]) => {
        setDocs(d.documents); setNotes(n.notifications.slice(0, 5)); setTrips(t.trips);
        const planned = t.trips.filter((x) => x.state === 'planned').sort((a, b) => a.entryDate.localeCompare(b.entryDate))[0];
        if (planned) {
          setNext(planned);
          api(`/trips/compliance?country=${encodeURIComponent(planned.country)}&date=${planned.entryDate}`).then(setComp).catch(() => {});
        }
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <Alert>{err}</Alert>;
  if (!docs) return <Loading />;

  const dated = docs.filter((d) => d.daysLeft !== null).sort((a, b) => a.daysLeft - b.daysLeft);
  const expired = dated.filter((d) => d.status === 'expired').length;
  const soon = dated.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 90).length;
  const countries = new Set(trips.filter((t) => t.state !== 'planned').map((t) => t.country.toLowerCase())).size;
  const health = dated.length ? Math.round(dated.reduce((a, d) => a + SCORE[d.status], 0) / dated.length) : null;
  const attention = dated.filter((d) => d.status !== 'valid');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const headline = !docs.length ? 'Add your passport to start tracking expiry dates.'
    : expired ? `${expired} document${expired > 1 ? 's have' : ' has'} expired. Renew ${expired > 1 ? 'them' : 'it'} first.`
    : attention.length ? `${attention.length} document${attention.length > 1 ? 's need' : ' needs'} attention in the next 90 days.`
    : 'Everything you track is in good shape.';

  return (
    <>
      <section className="hero">
        <div>
          <h1>{greet}, {user.name.split(' ')[0]}</h1>
          <p className="sub">{headline}</p>
          <div className="hero-stats">
            <div><b>{docs.length}</b><span>Documents tracked</span></div>
            <div><b>{soon}</b><span>Expiring in 90 days</span></div>
            <div className={expired ? 'hot' : ''}><b>{expired}</b><span>Expired</span></div>
            <div><b>{countries}</b><span>Countries visited</span></div>
          </div>
        </div>
        <Ring value={health ?? 0} label={health === null ? '–' : `${health}%`} sub="Document health" />
      </section>

      {docs.length === 0 ? (
        <div className="card section">
          <Empty icon="book" title="Start with your passport" action={<Link className="btn teal" to="/documents/new" style={{ marginTop: 10 }}><Icon name="plus" size={18} />Add your passport</Link>}>
            Visas, insurance and vaccinations come next. Reminders start automatically once a document has an expiry date.
          </Empty>
        </div>
      ) : (
        <div className="split section">
          <div className="card">
            <h2><Icon name="alert" size={20} />Needs attention first</h2>
            {dated.slice(0, 6).map((d) => (
              <div className="row" key={d.id}>
                <div className="grow">
                  <div className="title">{d.title}{d.country && <span className="muted"> · {d.country}</span>}</div>
                  <span className="muted"><Icon name={TYPE_ICON[d.type]} size={14} /> {TYPE_LABEL[d.type]} · {fmt(d.expiryDate)} · {daysText(d.daysLeft)}</span>
                  <Meter days={d.daysLeft} status={d.status} />
                </div>
                <Stamp status={d.status} />
                <Link className="btn ghost sm" to="/documents">{d.status === 'valid' ? 'View' : 'Renew'}</Link>
              </div>
            ))}
            {dated.length === 0 && <p className="muted">None of your documents have an expiry date yet.</p>}
          </div>

          <div style={{ display: 'grid', gap: 22 }}>
            {next && (
              <div className="card">
                <h2><Icon name="plane" size={20} />Next trip: {next.country}</h2>
                <p className="muted" style={{ marginBottom: 8 }}>Leaving {fmt(next.entryDate)}</p>
                {comp ? <ComplianceList result={comp} /> : <p className="muted">Checking your documents…</p>}
              </div>
            )}
            <div className="card">
              <h2><Icon name="bell" size={20} />Recent alerts</h2>
              {notes.length === 0 ? <p className="muted">No alerts yet. Reminders go out daily once a document nears its expiry date.</p> : notes.map((n) => (
                <div className="row" key={n._id}>
                  <div className="grow" style={{ minWidth: 150 }}><div className="title" style={{ fontSize: '.93rem' }}>{n.subject}</div><span className="hint">{fmtTime(n.createdAt)}</span></div>
                  <span className={`pill ${n.status}`}>{n.status === 'skipped' ? 'in-app' : n.status}</span>
                </div>
              ))}
              <p style={{ marginTop: 12 }}><Link to="/reminders">Reminder settings and history</Link></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
