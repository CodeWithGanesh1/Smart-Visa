import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useTheme } from './theme.js';
import { Icon, Loading, Logo } from './ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { ForgotPassword, ResetPassword } from './pages/Recover.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import DocumentForm from './pages/DocumentForm.jsx';
import Reminders from './pages/Reminders.jsx';
import Trips from './pages/Trips.jsx';
import Checklist from './pages/Checklist.jsx';
import Support from './pages/Support.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';

function Layout() {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const links = [
    ['/', 'Dashboard', 'home'], ['/documents', 'My documents', 'file'], ['/trips', 'Travel history', 'plane'],
    ['/checklist', 'Trip checklist', 'list'], ['/reminders', 'Reminders', 'bell'], ['/support', 'Help & queries', 'help'],
  ];
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="shell">
      <div className="topbar"><button onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button> Visa Tracker</div>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`side ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="brand"><Logo /> Visa Tracker</div>
        <nav>
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}><Icon name={icon} size={19} />{label}</NavLink>
          ))}
          {user.role === 'admin' && (<><div className="divider" /><NavLink to="/admin" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}><Icon name="shield" size={19} />Admin panel</NavLink></>)}
        </nav>
        <div className="who">
          <Link to="/profile" className="userchip"><span className="avatar">{initials}</span><div><b>{user.name}</b><span>{user.role === 'admin' ? 'Administrator' : 'Traveller'}</span></div></Link>
          <div className="tools">
            <button className="iconbtn" onClick={(e) => { e.stopPropagation(); toggleTheme(); }} aria-label="Switch theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />{theme === 'dark' ? 'Light' : 'Dark'}</button>
            <button className="iconbtn" onClick={logout}><Icon name="logout" size={17} />Log out</button>
          </div>
        </div>
      </aside>
      <main className="main" key={loc.pathname}><Outlet /></main>
    </div>
  );
}

function Protected({ admin }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout />;
}

function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main"><Loading /></div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/forgot-password" element={<Guest><ForgotPassword /></Guest>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/new" element={<DocumentForm />} />
        <Route path="/documents/:id/edit" element={<DocumentForm />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/support" element={<Support />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<Protected admin />}>
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
