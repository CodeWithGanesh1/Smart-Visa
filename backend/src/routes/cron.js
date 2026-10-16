const router = require('express').Router();
const { runReminders } = require('../services/reminders');

// Called by cron-job.org (or similar) so reminders run even when a free host puts the server to sleep.
async function handler(req, res, next) {
  try {
    const secret = process.env.CRON_SECRET;
    const given = req.query.key || req.headers['x-cron-key'];
    if (!secret || given !== secret) return res.status(401).json({ message: 'Invalid key' });
    res.json({ ok: true, ...(await runReminders()) });
  } catch (e) { next(e); }
}
router.get('/run', handler);
router.post('/run', handler);

module.exports = router;
