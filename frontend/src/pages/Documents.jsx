import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openBlob } from '../api.js';
import { useConfirm, useToast, Modal } from '../feedback.jsx';
import { Alert, Empty, Icon, Loading, Meter, PageHead, Stamp, TYPE_ICON, TYPE_LABEL, addDays, daysText, fmt } from '../ui.jsx';

const FILTERS = [['all', 'All'], ['passport', 'Passports'], ['visa', 'Visas'], ['insurance', 'Insurance'], ['vaccination', 'Vaccinations']];
const mask = (n) => (n ? `•••• ${n.slice(-4)}` : '–');

function DocCard({ d, onRenew, onDelete, onFile }) {
  return (
    <article className={`doccard t-${d.type}`}>
      <header>
        <span className="ticon"><Icon name={TYPE_ICON[d.type]} size={22} /></span>
        <div><h3>{d.title}</h3><p className="muted" style={{ fontSize: '.88rem' }}>{TYPE_LABEL[d.type]}{d.country && ` · ${d.country}`}</p></div>
        {d.expiryDate && <Stamp status={d.status} />}
      </header>
      {d.expiryDate ? (
        <>
          <div className={`bigdays ${d.status}`}>{d.daysLeft < 0 ? -d.daysLeft : d.daysLeft}<small>{d.daysLeft < 0 ? 'days past expiry' : 'days left'}</small></div>
          <Meter days={d.daysLeft} status={d.status} />
        </>
      ) : <div className="bigdays" style={{ fontSize: '1.2rem' }}>No expiry<small>{d.issueDate ? `given ${fmt(d.issueDate)}` : ''}</small></div>}
      <dl className="facts">
        <div><dt>{d.expiryDate ? 'Expires' : 'Date'}</dt><dd>{fmt(d.expiryDate || d.issueDate)}</dd></div>
        <div><dt>{d.type === 'visa' ? 'Visa type' : d.type === 'insurance' ? 'Provider' : 'Number'}</dt>
          <dd>{d.type === 'visa' ? `${d.visaType || '–'}${d.entryType ? ` · ${d.entryType}` : ''}` : d.type === 'insurance' ? d.provider || mask(d.number) : d.type === 'vaccination' ? '–' : mask(d.number)}</dd></div>
      </dl>
      <footer>
        {d.expiryDate && <button className="btn teal sm" onClick={() => onRenew(d)}><Icon name="refresh" size={15} />Renew</button>}
        {d.hasFile && <button className="btn ghost sm" onClick={() => onFile(d)}><Icon name="eye" size={15} />File</button>}
        <Link className="btn ghost sm" to={`/documents/${d.id}/edit`}><Icon name="edit" size={15} />Edit</Link>
        <button className="btn danger sm" onClick={() => onDelete(d)} aria-label={`Delete ${d.title}`}><Icon name="trash" size={15} /></button>
      </footer>
    </article>
  );
}

export default function Documents() {
  const toast = useToast();
  const confirm = useConfirm();
  const [docs, setDocs] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('expiry');
  const [renew, setRenew] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/documents').then((d) => setDocs(d.documents)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (d) => {
    if (!(await confirm({ title: 'Delete this document?', body: `"${d.title}" and its uploaded file will be removed for good.`, confirmLabel: 'Delete', danger: true }))) return;
    try { await api(`/documents/${d.id}`, { method: 'DELETE' }); toast('Document deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const submitRenew = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api(`/documents/${renew.id}/renew`, { method: 'PATCH', body: { expiryDate: newDate } }); toast(`Renewed. New expiry ${fmt(newDate)}`); setRenew(null); load(); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };

  if (!docs) return <>{err ? <Alert>{err}</Alert> : <Loading />}</>;
  const text = q.trim().toLowerCase();
  const shown = docs
    .filter((d) => (tab === 'all' || d.type === tab) && (!text || `${d.title} ${d.country} ${d.visaType} ${TYPE_LABEL[d.type]}`.toLowerCase().includes(text)))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'recent' ? new Date(b.createdAt) - new Date(a.createdAt) : (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));

  return (
    <>
      <PageHead title="My documents" sub="Every passport, visa, insurance policy and vaccination record you track.">
        <button className="btn ghost" onClick={() => openBlob('/documents/calendar.ics', 'travel-document-expiries.ics').then(() => toast('Calendar file downloaded. Open it to add all expiry dates.')).catch((e) => toast(e.message, 'error'))}><Icon name="calendar" size={18} />Add to calendar</button>
        <Link className="btn teal" to="/documents/new"><Icon name="plus" size={18} />Add document</Link>
      </PageHead>

      <div className="toolbar">
        <div className="tabs" style={{ margin: 0 }}>{FILTERS.map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="searchbox"><Icon name="search" size={18} /><input placeholder="Search documents" aria-label="Search documents" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Sort documents" value={sort} onChange={(e) => setSort(e.target.value)}><option value="expiry">Soonest expiry</option><option value="recent">Recently added</option><option value="name">Name</option></select>
      </div>

      {shown.length === 0 ? (
        <div className="card"><Empty icon="file" title={docs.length ? 'No documents match' : 'No documents yet'} action={!docs.length && <Link className="btn teal" to="/documents/new" style={{ marginTop: 10 }}>Add your first document</Link>}>
          {docs.length ? 'Try another filter or search word.' : 'Add a document to start tracking its expiry date.'}</Empty></div>
      ) : (
        <div className="docgrid">{shown.map((d) => <DocCard key={d.id} d={d} onRenew={(x) => { setRenew(x); setNewDate(addDays(x.expiryDate, 365)); }} onDelete={remove} onFile={(x) => openBlob(`/documents/${x.id}/file`).catch((e) => toast(e.message, 'error'))} />)}</div>
      )}

      {renew && (
        <Modal title={`Renew ${renew.title}`} onClose={() => setRenew(null)}>
          <form onSubmit={submitRenew}>
            <p className="muted" style={{ marginBottom: 14 }}>Current expiry is {fmt(renew.expiryDate)} ({daysText(renew.daysLeft)}). Enter the new expiry date from your renewed document.</p>
            <label>New expiry date<input type="date" required min={addDays(renew.expiryDate, 1)} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></label>
            <div className="modal-actions"><button type="button" className="btn ghost" onClick={() => setRenew(null)}>Cancel</button><button className="btn teal" disabled={busy}>{busy ? 'Saving…' : 'Save renewal'}</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
