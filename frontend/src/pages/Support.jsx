import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../feedback.jsx';
import { Alert, Empty, Icon, Loading, PageHead, fmtTime } from '../ui.jsx';

export default function Support() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [f, setF] = useState({ subject: '', message: '' });
  const [err, setErr] = useState('');

  const load = () => api('/queries').then((d) => setList(d.queries)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/queries', { method: 'POST', body: f }); setF({ subject: '', message: '' }); toast('Query sent. The admin reply will show here.'); load(); } catch (x) { setErr(x.message); }
  };

  return (
    <>
      <PageHead title="Help & queries" sub="Ask the admin team about your account or how a feature works." />
      <div className="split">
        <div className="card">
          <h2><Icon name="message" size={20} />Your queries</h2>
          {!list ? <Loading /> : list.length === 0 ? <Empty icon="message" title="No queries yet">Anything you send will appear here with the reply.</Empty> : list.map((q) => (
            <div className="row" key={q._id} style={{ alignItems: 'flex-start' }}>
              <div className="grow"><div className="title">{q.subject}</div><p style={{ margin: '4px 0' }}>{q.message}</p>
                {q.reply && <div className="reply"><b>Admin reply:</b> {q.reply}</div>}
                <span className="hint">{fmtTime(q.createdAt)}</span></div>
              <span className={`pill ${q.status}`}>{q.status}</span>
            </div>
          ))}
        </div>
        <form className="card" onSubmit={submit}>
          <h2>New query</h2>
          <Alert>{err}</Alert>
          <label>Subject<input required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
          <label>Message<textarea required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></label>
          <button className="btn teal block">Send query</button>
        </form>
      </div>
    </>
  );
}
