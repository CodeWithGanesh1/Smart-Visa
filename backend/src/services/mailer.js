const nodemailer = require('nodemailer');

class NotConfigured extends Error {}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM;

  if (process.env.BREVO_API_KEY && from) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: from, name: 'Visa Tracker' }, to: [{ email: to }], subject, textContent: text, ...(html ? { htmlContent: html } : {}) }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return 'brevo';
  }

  if (process.env.SENDGRID_API_KEY && from) {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: 'Visa Tracker' },
        subject,
        content: [{ type: 'text/plain', value: text }, ...(html ? [{ type: 'text/html', value: html }] : [])],
      }),
    });
    if (!r.ok) throw new Error(`SendGrid ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return 'sendgrid';
  }

  if (process.env.SMTP_HOST && from) {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await t.sendMail({ from, to, subject, text, html });
    return 'smtp';
  }

  throw new NotConfigured('No email provider configured');
}

module.exports = { sendMail, NotConfigured };
