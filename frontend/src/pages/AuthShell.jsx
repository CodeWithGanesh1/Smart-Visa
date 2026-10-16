import { Icon, Logo } from '../ui.jsx';

const Stamp = () => (
  <svg className="stampart" viewBox="0 0 200 200" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="100" cy="100" r="92" strokeWidth="4" /><circle cx="100" cy="100" r="82" strokeWidth="1.5" /><circle cx="100" cy="100" r="52" strokeWidth="1.5" />
    <defs><path id="arc" d="M 100 100 m -67 0 a 67 67 0 1 1 134 0 a 67 67 0 1 1 -134 0" /></defs>
    <text fill="currentColor" stroke="none" fontSize="15" fontWeight="700" letterSpacing="3.2" fontFamily="Bricolage Grotesque, sans-serif"><textPath href="#arc" textLength="410" lengthAdjust="spacing">VISA TRACKER · ENTRY PERMITTED · </textPath></text>
    <text x="100" y="97" textAnchor="middle" fill="currentColor" stroke="none" fontSize="22" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif">VALID</text>
    <text x="100" y="118" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" fontWeight="500" fontFamily="DM Sans, sans-serif">90 DAYS</text>
  </svg>
);

export default function AuthShell({ children }) {
  return (
    <div className="authwrap">
      <section className="authart">
        <div className="brand" style={{ padding: 0 }}><Logo /> Visa Tracker</div>
        <Stamp />
        <h1>Never miss a visa or passport expiry.</h1>
        <p>One secure place for your passport, visas, insurance and vaccinations, with reminders sent before anything lapses.</p>
        <ul>
          <li><Icon name="bell" size={18} />Email reminders at 90, 60 and 30 days, or your own schedule</li>
          <li><Icon name="shield" size={18} />Overstay warnings when a visa ends during a trip</li>
          <li><Icon name="lock" size={18} />Passport and visa numbers are encrypted at rest</li>
        </ul>
      </section>
      <section className="authform">{children}</section>
    </div>
  );
}
