import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Icon } from './ui.jsx';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);

  const toast = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const confirm = useCallback((opts) => new Promise((res) => setDlg({ ...opts, res })), []);
  const close = (v) => { dlg.res(v); setDlg(null); };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}><Icon name={t.kind === 'ok' ? 'check' : 'alert'} size={18} />{t.text}</div>)}
        </div>
        {dlg && (
          <Modal title={dlg.title} onClose={() => close(false)}>
            <p className="muted">{dlg.body}</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${dlg.danger ? 'dangerfill' : 'teal'}`} onClick={() => close(true)}>{dlg.confirmLabel || 'Confirm'}</button>
            </div>
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
