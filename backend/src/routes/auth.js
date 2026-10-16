const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendMail } = require('../services/mailer');
const { layout, appUrl, esc } = require('../services/emailTemplate');

const sign = (u) => jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const out = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, prefs: u.prefs, createdAt: u.createdAt });
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isAdminEmail = (e) => process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim().toLowerCase() === e.toLowerCase();
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !emailRe.test(email || '')) return res.status(400).json({ message: 'Enter your name and a valid email address' });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'This email is already registered. Try logging in.' });
    const u = await User.create({
      name, email, phone: phone || '', password: await bcrypt.hash(password, 12),
      role: isAdminEmail(email) ? 'admin' : 'user', lastLoginAt: new Date(),
    });
    res.status(201).json({ token: sign(u), user: out(u) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(401).json({ message: 'Email or password is incorrect' });
    if (!u.active) return res.status(403).json({ message: 'This account has been disabled. Contact support.' });
    if (isAdminEmail(u.email) && u.role !== 'admin') u.role = 'admin';
    u.lastLoginAt = new Date();
    await u.save();
    res.json({ token: sign(u), user: out(u) });
  } catch (e) { next(e); }
});

// Password reset by email link (valid for 1 hour). Always answers the same, so emails cannot be probed.
router.post('/forgot', async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const u = email ? await User.findOne({ email }) : null;
    if (u && u.active) {
      const raw = crypto.randomBytes(32).toString('hex');
      u.resetTokenHash = sha(raw);
      u.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await u.save();
      const link = `${appUrl()}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
      sendMail({
        to: email, subject: 'Reset your Visa Tracker password',
        text: `Hi ${u.name},\n\nUse this link to set a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
        html: layout({ heading: 'Reset your password', greeting: `Hi ${u.name.split(' ')[0]},`, paragraphs: ['Use the button below to set a new password. The link works for 1 hour.', `If you did not ask for this, you can ignore this email. Your password stays the same.`], cta: { label: 'Set a new password', url: link }, footer: `Button not working? Copy this link into your browser:<br>${esc(link)}` }),
      }).catch((e) => console.error('Reset email failed:', e.message));
    }
    res.json({ message: 'If that email is registered, a reset link is on its way. Check your inbox and spam folder.' });
  } catch (e) { next(e); }
});

router.post('/reset', async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const u = await User.findOne({ email: (email || '').toLowerCase() }).select('+resetTokenHash +resetExpires');
    if (!u || !u.resetTokenHash || !token || u.resetTokenHash !== sha(token) || !u.resetExpires || u.resetExpires < new Date()) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    }
    u.password = await bcrypt.hash(password, 12);
    u.resetTokenHash = undefined;
    u.resetExpires = undefined;
    await u.save();
    res.json({ message: 'Password updated. You can log in now.' });
  } catch (e) { next(e); }
});

router.get('/me', auth, (req, res) => res.json({ user: out(req.user) }));

router.put('/me', auth, async (req, res, next) => {
  try {
    const { name, phone, prefs } = req.body;
    const u = req.user;
    if (name !== undefined) { if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' }); u.name = name.trim(); }
    if (phone !== undefined) u.phone = phone;
    if (prefs) {
      if (Array.isArray(prefs.reminderDays)) {
        const days = [...new Set(prefs.reminderDays.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 365))];
        if (!days.length) return res.status(400).json({ message: 'Choose at least one reminder day' });
        u.prefs.reminderDays = days.sort((a, b) => b - a);
      }
      for (const k of ['email', 'overstay', 'compliance']) if (typeof prefs[k] === 'boolean') u.prefs[k] = prefs[k];
    }
    await u.save();
    res.json({ user: out(u) });
  } catch (e) { next(e); }
});

router.put('/password', auth, async (req, res, next) => {
  try {
    const { current, next: nextPw } = req.body;
    if (!nextPw || nextPw.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
    const u = await User.findById(req.user.id).select('+password');
    if (!(await bcrypt.compare(current || '', u.password))) return res.status(400).json({ message: 'Current password is incorrect' });
    u.password = await bcrypt.hash(nextPw, 12);
    await u.save();
    res.json({ message: 'Password changed' });
  } catch (e) { next(e); }
});

module.exports = router;
