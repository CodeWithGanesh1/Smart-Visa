const PATHS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  plane: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  list: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  menu: 'M3 12h18 M3 6h18 M3 18h18',
  x: 'M18 6 6 18 M6 6l12 12',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.5 9a9 9 0 0 1 14.9-3.4L23 10 M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  check: 'M20 6 9 17l-5-5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M7 11V7a5 5 0 0 1 10 0v4',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  umbrella: 'M23 12a11 11 0 0 0-22 0z M12 12v8a2 2 0 0 0 4 0',
};

export const Icon = ({ name, size = 20, className = '' }) => (
  <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(PATHS[name] || '').split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
  </svg>
);

export const TYPE_LABEL = { passport: 'Passport', visa: 'Visa', insurance: 'Travel insurance', vaccination: 'Vaccination' };
export const TYPE_ICON = { passport: 'book', visa: 'file', insurance: 'umbrella', vaccination: 'heart' };

export const fmt = (d) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '–';
export const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

export const daysText = (n) =>
  n === null || n === undefined ? 'No expiry date' : n < 0 ? `Expired ${-n} day${-n === 1 ? '' : 's'} ago` : n === 0 ? 'Expires today' : `${n} day${n === 1 ? '' : 's'} left`;

const STATUS_LABEL = { valid: 'Valid', warning: 'Renew soon', critical: 'Act now', expired: 'Expired' };
export const Stamp = ({ status }) => <span className={`stamp ${status}`}>{STATUS_LABEL[status] || status}</span>;

export const Meter = ({ days, status }) => {
  const pct = days === null || days === undefined ? 0 : days < 0 ? 100 : Math.max(4, Math.min(100, (days / 365) * 100));
  return <div className="meter" aria-hidden="true"><i className={status} style={{ width: `${pct}%` }} /></div>;
};

// Circular progress used for "Document health"
export function Ring({ value, label, sub, size = 132 }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${sub}: ${label}`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e9c46a" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * (value || 0)) / 100} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="ring-text"><b>{label}</b><span>{sub}</span></div>
    </div>
  );
}

export const Alert = ({ kind = 'error', children }) => (children ? <div className={`alert ${kind}`} role="alert">{children}</div> : null);

export const PageHead = ({ title, sub, children }) => (
  <div className="pagehead">
    <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
    <div className="actions">{children}</div>
  </div>
);

export const Empty = ({ icon = 'file', title, children, action }) => (
  <div className="empty">
    <span className="empty-icon"><Icon name={icon} size={26} /></span>
    <h3>{title}</h3><p className="muted">{children}</p>{action}
  </div>
);

export const Skeleton = ({ h = 90, n = 1 }) => (
  <>{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ height: h }} />)}</>
);
export const Loading = () => <div className="grid" style={{ gap: 16 }}><Skeleton h={120} /><Skeleton h={90} n={3} /></div>;

export const Logo = () => (
  <span className="logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 12h16" /><ellipse cx="12" cy="12" rx="3.5" ry="8" /></svg></span>
);

