const router = require('express').Router();
const User = require('../models/User');
const TravelDoc = require('../models/TravelDoc');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
const Query = require('../models/Query');
const { auth, adminOnly } = require('../middleware/auth');
const { runReminders } = require('../services/reminders');
const { todayUTC, iso, daysLeft, docStatus, DAY } = require('../utils/dates');

router.use(auth, adminOnly);

// Admins see compliance status only, never passport / visa numbers or uploaded files.
router.get('/stats', async (req, res, next) => {
  try {
    const today = todayUTC();
    const at = (n) => new Date(today.getTime() + n * DAY);
    const since = at(-13);
    const [users, docs, trips, expired, b30, b60, b90, later, byType, notif, usersWithDocs, active7, openQueries, topCountries, signupAgg] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      TravelDoc.countDocuments(),
      Trip.countDocuments(),
      TravelDoc.countDocuments({ expiryDate: { $lt: today } }),
      TravelDoc.countDocuments({ expiryDate: { $gte: today, $lte: at(30) } }),
      TravelDoc.countDocuments({ expiryDate: { $gt: at(30), $lte: at(60) } }),
      TravelDoc.countDocuments({ expiryDate: { $gt: at(60), $lte: at(90) } }),
      TravelDoc.countDocuments({ expiryDate: { $gt: at(90) } }),
      TravelDoc.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      TravelDoc.distinct('user'),
      User.countDocuments({ role: 'user', lastLoginAt: { $gte: at(-7) } }),
      Query.countDocuments({ status: 'open' }),
      Trip.aggregate([{ $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
      User.aggregate([{ $match: { role: 'user', createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }]),
    ]);
    const n = Object.fromEntries(notif.map((x) => [x._id, x.count]));
    const delivered = n.sent || 0, failed = n.failed || 0;
    const sm = Object.fromEntries(signupAgg.map((x) => [x._id, x.count]));
    res.json({
      users, documents: docs, trips, expired, expiring30: b30, openQueries, active7,
      byType: Object.fromEntries(byType.map((x) => [x._id, x.count])),
      buckets: { expired, d30: b30, d60: b60, d90: b90, later },
      signups: Array.from({ length: 14 }, (_, i) => { const k = iso(at(-13 + i)); return { date: k, count: sm[k] || 0 }; }),
      notifications: { sent: delivered, failed, skipped: n.skipped || 0, total: Object.values(n).reduce((a, b) => a + b, 0) },
      deliveryRate: delivered + failed ? Math.round((delivered / (delivered + failed)) * 100) : null,
      engagementRate: users ? Math.min(100, Math.round((usersWithDocs.length / users) * 100)) : 0,
      topCountries: topCountries.map((c) => ({ country: c._id, count: c.count })),
    });
  } catch (e) { next(e); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const counts = await TravelDoc.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    res.json({ users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, documents: map[u.id] || 0, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })) });
  } catch (e) { next(e); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own account here' });
    const u = await User.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true });
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    await Promise.all([TravelDoc.deleteMany({ user: u._id }), Trip.deleteMany({ user: u._id }), Notification.deleteMany({ user: u._id }), Query.deleteMany({ user: u._id })]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/queries', async (req, res, next) => {
  try { res.json({ queries: await Query.find().populate('user', 'name email').sort({ status: -1, createdAt: -1 }).limit(200) }); } catch (e) { next(e); }
});

router.patch('/queries/:id', async (req, res, next) => {
  try {
    const { reply, status } = req.body;
    const q = await Query.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Query not found' });
    if (typeof reply === 'string' && reply.trim()) { q.reply = reply.trim(); q.repliedAt = new Date(); q.status = 'resolved'; }
    if (['open', 'resolved'].includes(status)) q.status = status;
    await q.save();
    res.json({ query: q });
  } catch (e) { next(e); }
});

async function complianceRows() {
  const docs = await TravelDoc.find({ expiryDate: { $ne: null } }).populate('user', 'name email active');
  return docs
    .map((d) => ({ user: d.user?.name || 'Deleted user', email: d.user?.email || '', type: d.type, title: d.title, country: d.country, expiryDate: iso(d.expiryDate), daysLeft: daysLeft(d.expiryDate) }))
    .map((r) => ({ ...r, status: docStatus(r.daysLeft) }))
    .filter((r) => r.status !== 'valid')
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

router.get('/compliance', async (req, res, next) => {
  try { res.json({ rows: (await complianceRows()).slice(0, 300) }); } catch (e) { next(e); }
});

router.get('/report.csv', async (req, res, next) => {
  try {
    const rows = await complianceRows();
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['User', 'Email', 'Document type', 'Title', 'Country', 'Expiry date', 'Days left', 'Status'];
    const csv = [head, ...rows.map((r) => [r.user, r.email, r.type, r.title, r.country, r.expiryDate, r.daysLeft, r.status])].map((r) => r.map(esc).join(',')).join('\n');
    res.set('Content-Type', 'text/csv').set('Content-Disposition', `attachment; filename="compliance-report-${iso(new Date())}.csv"`).send(csv);
  } catch (e) { next(e); }
});

router.get('/activity', async (req, res, next) => {
  try {
    const list = await Notification.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(50).select('type status subject error createdAt user');
    res.json({ notifications: list });
  } catch (e) { next(e); }
});

router.post('/run-reminders', async (req, res, next) => {
  try { res.json(await runReminders()); } catch (e) { next(e); }
});

module.exports = router;
