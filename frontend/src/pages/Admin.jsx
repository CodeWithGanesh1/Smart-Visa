import { useEffect, useState } from 'react';
import { api, openBlob } from '../api.js';
import { useConfirm, useToast } from '../feedback.jsx';
import { Alert, Empty, Icon, Loading, PageHead, Stamp, TYPE_LABEL, daysText, fmt, fmtTime } from '../ui.jsx';

const TABS = [['stats', 'Analytics'], ['users', 'Users'], ['queries', 'Queries'], ['compliance', 'Compliance'], ['activity', 'Reminder log']];

function Bars({ rows, max }) {
  return rows.map(([label, value, tone]) => (
    <div className="bar" key={label}><span>{label}</span><div className="track"><i className={tone || ''} style={{ width: `${(value / Math.max(1, max)) * 100}%` }} /></div><b>{value}</b></div>
  ));
}

function Stats() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!s) return <Loading />;
  const kpi = [
    [s.users, 'Registered users'], [s.documents, 'Documents tracked'],
    [s.deliveryRate === null ? '–' : `${s.deliveryRate}%`, 'Reminder delivery success'], [`${s.engagementRate}%`, 'Users with documents'],
    [s.expired, 'Expired documents', s.expired > 0], [s.expiring30, 'Expiring in 30 days'], [s.active7, 'Active in last 7 days'], [s.openQueries, 'Open queries'],
  ];
  const b = s.buckets;
  const bmax = Math.max(b.expired, b.d30, b.d60, b.d90, b.later);
  const smax = Math.max(1, ...s.signups.map((x) => x.count));
  const tmax = Math.max(1, ...Object.values(s.byType));
  const cmax = Math.max(1, ...s.topCountries.map((c) => c.count));
  return (
    <>
      <div className="grid g4">{kpi.map(([v, l, hot]) => <div className={`card kpi ${hot ? 'hot' : ''}`} key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <div className="grid g2 section">
        <div className="card bars"><h2>Documents by time to expiry</h2>
          <Bars max={bmax} rows={[['Expired', b.expired, 'red'], ['0 – 30 days', b.d30, 'orange'], ['31 – 60 days', b.d60, 'amber'], ['61 – 90 days', b.d90, 'amber'], ['Over 90 days', b.later, 'green']]} /></div>
        <div className="card"><h2>New sign-ups, last 14 days</h2>
          <div className="spark" role="img" aria-label="Sign-ups per day">{s.signups.map((x) => <div key={x.date} title={`${fmt(x.date)}: ${x.count}`} style={{ height: `${(x.count / smax) * 100}%` }} />)}</div>
          <div className="sparklabels"><span>{fmt(s.signups[0].date)}</span><span>{fmt(s.signups[13].date)}</span></div></div>
      </div>
      <div className="grid g2 section">
        <div className="card bars"><h2>Documents by type</h2><Bars max={tmax} rows={Object.entries(TYPE_LABEL).map(([k, v]) => [v, s.byType[k] || 0])} /></div>
        <div className="card bars"><h2>Most visited countries</h2>
          {s.topCountries.length === 0 ? <p className="muted">No trips recorded yet.</p> : <Bars max={cmax} rows={s.topCountries.map((c) => [c.country, c.count])} />}</div>
      </div>
      <div className="card section"><h2>Reminder delivery</h2>
        <p className="muted">{s.notifications.sent} sent · {s.notifications.failed} failed · {s.notifications.skipped} not emailed (shown in the app only) · {s.notifications.total} total. The success rate counts sent versus failed only.</p></div>
    </>
  );
}

function Users() {
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const load = () => api('/admin/users').then((d) => setList(d.users)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const toggle = async (u) => { try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }); toast(`${u.name} ${u.active ? 'disabled' : 'enabled'}`); load(); } catch (e) { toast(e.message, 'error'); } };
  const del = async (u) => {
    if (!(await confirm({ title: `Delete ${u.name}?`, body: 'Their account, documents, trips and alerts will be removed permanently.', confirmLabel: 'Delete user', danger: true }))) return;
    try { await api(`/admin/users/${u.id}`, { method: 'DELETE' }); toast('User deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  if (!list) return <>{err ? <Alert>{err}</Alert> : <Loading />}</>;
  const shown = list.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card">
      <div className="searchbox" style={{ marginBottom: 14 }}><Icon name="search" size={18} /><input placeholder="Search users" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Docs</th><th>Last login</th><th>Status</th><th /></tr></thead>
        <tbody>{shown.map((u) => (
          <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.documents}</td><td>{u.lastLoginAt ? fmtTime(u.lastLoginAt) : '–'}</td>
            <td><span className={`pill ${u.active ? 'ok' : 'fail'}`}>{u.active ? 'active' : 'disabled'}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>{u.role !== 'admin' && <><button className="btn ghost sm" onClick={() => toggle(u)}>{u.active ? 'Disable' : 'Enable'}</button> <button className="btn danger sm" onClick={() => del(u)} aria-label={`Delete ${u.name}`}><Icon name="trash" size={15} /></button></>}</td></tr>
        ))}</tbody></table></div>
      {shown.length === 0 && <p className="muted" style={{ paddingTop: 12 }}>No users match.</p>}
    </div>
  );
}

function Queries() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [reply, setReply] = useState({});
  const [err, setErr] = useState('');
  const load = () => api('/admin/queries').then((d) => setList(d.queries)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const send = async (q) => { try { await api(`/admin/queries/${q._id}`, { method: 'PATCH', body: { reply: reply[q._id] } }); setReply({ ...reply, [q._id]: '' }); toast('Reply sent'); load(); } catch (e) { toast(e.message, 'error'); } };
  if (!list) return <>{err ? <Alert>{err}</Alert> : <Loading />}</>;
  return (
    <div className="card">
      {list.length === 0 && <Empty icon="message" title="No queries yet">Questions from users will show up here.</Empty>}
      {list.map((q) => (
        <div className="row" key={q._id} style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="title">{q.subject} <span className={`pill ${q.status}`}>{q.status}</span></div>
            <span className="hint">{q.user?.name} · {q.user?.email} · {fmtTime(q.createdAt)}</span>
            <p style={{ margin: '6px 0' }}>{q.message}</p>
            {q.reply && <div className="reply"><b>Your reply:</b> {q.reply}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input placeholder={q.reply ? 'Update reply…' : 'Write a reply…'} aria-label="Reply" value={reply[q._id] || ''} onChange={(e) => setReply({ ...reply, [q._id]: e.target.value })} style={{ marginTop: 0 }} />
              <button className="btn teal sm" disabled={!(reply[q._id] || '').trim()} onClick={() => send(q)}>Reply</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Compliance() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/admin/compliance').then((d) => setRows(d.rows)).catch((e) => setErr(e.message)); }, []);
  if (!rows) return <>{err ? <Alert>{err}</Alert> : <Loading />}</>;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <p className="muted">Documents that are expired or expire within 90 days. Document numbers are never shown to admins.</p>
        <button className="btn ghost sm" onClick={() => openBlob('/admin/report.csv', 'compliance-report.csv').catch((e) => toast(e.message, 'error'))}><Icon name="download" size={16} />Download CSV</button>
      </div>
      {rows.length === 0 ? <Empty icon="shield" title="All clear">No user has a document that is expired or close to expiring.</Empty> : (
        <div className="tablewrap"><table><thead><tr><th>User</th><th>Document</th><th>Country</th><th>Expiry</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r.user}<div className="hint">{r.email}</div></td><td>{TYPE_LABEL[r.type]}: {r.title}</td><td>{r.country || '–'}</td><td>{fmt(r.expiryDate)}<div className="hint">{daysText(r.daysLeft)}</div></td><td><Stamp status={r.status} /></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

function Activity() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/admin/activity').then((d) => setList(d.notifications)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  const run = async () => {
    setBusy(true);
    try { const r = await api('/admin/run-reminders', { method: 'POST' }); toast(`Reminder job finished. ${r.created} new alert(s) created.`); load(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <p className="muted">The job runs every day at 08:00 IST. You can also run it now.</p>
        <button className="btn teal sm" disabled={busy} onClick={run}><Icon name="refresh" size={16} />{busy ? 'Running…' : 'Run reminders now'}</button>
      </div>
      {!list ? <Loading /> : list.length === 0 ? <Empty icon="bell" title="Nothing sent yet">Alerts appear here once documents reach a reminder day.</Empty> : (
        <div className="tablewrap"><table><thead><tr><th>When</th><th>User</th><th>Alert</th><th>Delivery</th></tr></thead>
          <tbody>{list.map((n) => <tr key={n._id}><td>{fmtTime(n.createdAt)}</td><td>{n.user?.email || '–'}</td><td>{n.subject}{n.error && <div className="hint">{n.error}</div>}</td><td><span className={`pill ${n.status}`}>{n.status}</span></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('stats');
  const View = { stats: Stats, users: Users, queries: Queries, compliance: Compliance, activity: Activity }[tab];
  return (
    <>
      <PageHead title="Admin panel" sub="Monitor users, compliance and reminder delivery." />
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      <View />
    </>
  );
}
