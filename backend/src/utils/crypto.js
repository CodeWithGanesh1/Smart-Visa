const crypto = require('crypto');
const key = () => crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'dev-only-change-me').digest();

// AES-256-GCM: passport / visa / policy numbers are encrypted at rest
exports.encrypt = (text) => {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
};

exports.decrypt = (s) => {
  if (!s) return '';
  try {
    const [iv, tag, enc] = s.split('.').map((x) => Buffer.from(x, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch { return ''; }
};
