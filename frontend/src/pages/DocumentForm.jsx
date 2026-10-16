import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../feedback.jsx';
import { Alert, Icon, Loading, PageHead, TYPE_ICON, TYPE_LABEL, fmt } from '../ui.jsx';

const BLANK = { type: 'passport', title: '', country: '', number: '', issueDate: '', validFrom: '', expiryDate: '', visaType: '', entryType: 'multiple', provider: '', vaccine: '', notes: '' };
const VISA_TYPES = ['Tourist', 'Business', 'Student', 'Work', 'Transit', 'Medical', 'Family / Dependent', 'Other'];

export default function DocumentForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(BLANK);
  const [orig, setOrig] = useState(null);
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    api(`/documents/${id}`).then(({ document: d }) => { setOrig(d); setF({ ...BLANK, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])) }); })
      .catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const t = f.type;

  const pickFile = (e) => {
    const file = e.target.files[0];
    if (!file) return setFile(null);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { e.target.value = ''; return setErr('Upload a PDF, JPG or PNG file'); }
    if (file.size > 2 * 1024 * 1024) { e.target.value = ''; return setErr('File is larger than 2 MB. Compress it and try again.'); }
    setErr('');
    const r = new FileReader();
    r.onload = () => setFile({ name: file.name, mime: file.type, data: String(r.result).split(',')[1] });
    r.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = { ...f, title: f.title || (t === 'passport' ? 'Passport' : ''), ...(file ? { file } : {}), removeFile };
      await api(id ? `/documents/${id}` : '/documents', { method: id ? 'PUT' : 'POST', body });
      toast(id ? 'Document updated' : 'Document added. Reminders are now active for it.');
      nav('/documents');
    } catch (x) { setErr(x.message); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  const renewing = orig && f.expiryDate && orig.expiryDate && f.expiryDate > orig.expiryDate;

  return (
    <>
      <PageHead title={id ? 'Edit document' : 'Add document'} sub="Dates drive your reminders, so enter them exactly as printed on the document." />
      <form className="card" onSubmit={submit} style={{ maxWidth: 760 }}>
        <Alert>{err}</Alert>
        {!id && (
          <div className="typepick" role="radiogroup" aria-label="Document type">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button type="button" key={k} role="radio" aria-checked={t === k} className={`t-${k} ${t === k ? 'on' : ''}`} onClick={() => setF({ ...f, type: k })}><Icon name={TYPE_ICON[k]} size={22} />{v}</button>
            ))}
          </div>
        )}

        {t === 'vaccination' ? (
          <label>Vaccine name<input required value={f.vaccine} onChange={set('vaccine')} placeholder="e.g. Yellow fever, COVID-19 booster" /></label>
        ) : (
          <label>Title<input required={t !== 'passport'} value={f.title} onChange={set('title')} placeholder={t === 'passport' ? 'Passport (default)' : t === 'visa' ? 'e.g. Schengen tourist visa' : 'e.g. Annual multi-trip policy'} /></label>
        )}

        <div className="grid g2">
          <label>{t === 'passport' ? 'Country of issue' : t === 'visa' ? 'Visa country' : t === 'insurance' ? 'Coverage region / country' : 'Issued in'}
            <input required={t === 'passport' || t === 'visa'} value={f.country} onChange={set('country')} /></label>
          {t !== 'vaccination' && (
            <label>{t === 'passport' ? 'Passport number' : t === 'visa' ? 'Visa ID / number' : 'Policy number'}
              <input required={t === 'passport'} value={f.number} onChange={set('number')} /><span className="hint"><Icon name="lock" size={12} /> Stored encrypted</span></label>
          )}
        </div>

        {t === 'visa' && (
          <div className="grid g2">
            <label>Visa type<select required value={f.visaType} onChange={set('visaType')}><option value="">Select…</option>{VISA_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>Entry type<select value={f.entryType} onChange={set('entryType')}><option value="single">Single entry</option><option value="multiple">Multiple entry</option></select></label>
          </div>
        )}
        {t === 'insurance' && <label>Insurance provider<input value={f.provider} onChange={set('provider')} /></label>}

        <div className="grid g2">
          {(t === 'passport' || t === 'vaccination') && <label>{t === 'passport' ? 'Issue date' : 'Date vaccinated'}<input type="date" required={t === 'vaccination'} value={f.issueDate} onChange={set('issueDate')} /></label>}
          {(t === 'visa' || t === 'insurance') && <label>{t === 'visa' ? 'Valid from' : 'Cover starts'}<input type="date" value={f.validFrom} onChange={set('validFrom')} /></label>}
          <label>{t === 'visa' ? 'Valid until' : t === 'insurance' ? 'Cover ends' : t === 'vaccination' ? 'Booster due / valid until' : 'Expiry date'}
            <input type="date" required={t !== 'vaccination'} value={f.expiryDate} onChange={set('expiryDate')} />
            {t === 'vaccination' && <span className="hint">Optional. Leave empty if it does not expire.</span>}</label>
        </div>

        {renewing && <Alert kind="info">The new expiry is later than {fmt(orig.expiryDate)}. This will be saved in your renewal log.</Alert>}

        <label>Supporting file <span className="hint">(PDF, JPG or PNG, max 2 MB)</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={pickFile} /></label>
        {orig?.hasFile && !file && (
          <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />Remove the uploaded file ({orig.fileName})</label>
        )}

        <label>Notes <span className="hint">(optional)</span><textarea value={f.notes} onChange={set('notes')} /></label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn teal" disabled={busy}>{busy ? 'Saving…' : 'Save document'}</button>
          <Link className="btn ghost" to="/documents">Cancel</Link>
        </div>

        {orig?.renewals?.length > 0 && (
          <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 8 }}>Renewal log</h3>
            {orig.renewals.map((r, i) => <p className="muted" key={i}>{fmt(r.oldExpiry)} extended to {fmt(r.newExpiry)}</p>)}
          </div>
        )}
      </form>
    </>
  );
}
