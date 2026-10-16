const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const appUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

// Branded HTML email. `paragraphs` must already be escaped HTML strings.
function layout({ heading, greeting, paragraphs = [], cta, footer }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#27364b">${p}</p>`).join('');
  const button = cta
    ? `<p style="margin:22px 0 4px"><a href="${esc(cta.url)}" style="background:#0e7c7b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block;font-size:15px">${esc(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#eef2f7;padding:24px 12px;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde4ee">
<tr><td style="background:#0b2545;padding:20px 28px"><span style="color:#e9c46a;font-weight:800;font-size:18px;letter-spacing:.2px">Visa Tracker</span><span style="color:#9fb3cf;font-size:13px;margin-left:10px">Travel document reminders</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0b2545">${esc(heading)}</h1>
${greeting ? `<p style="margin:0 0 14px;font-size:15px;color:#27364b">${esc(greeting)}</p>` : ''}
${body}${button}
</td></tr>
<tr><td style="padding:16px 28px;background:#f6f8fb;color:#7a8aa0;font-size:12px;line-height:1.5">${footer || 'You are receiving this because reminders are switched on in your Visa Tracker settings. Entry rules differ by country, so confirm requirements with the embassy or official immigration site.'}</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { layout, appUrl, esc };
