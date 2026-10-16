const router = require('express').Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { notify } = require('../services/reminders');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100)
      .select('type threshold channel status subject message error createdAt');
    res.json({ notifications: list });
  } catch (e) { next(e); }
});

// Lets the user confirm that email delivery works for their address
router.post('/test', async (req, res, next) => {
  try {
    const n = await notify({
      user: req.user, type: 'test', key: `test:${req.user.id}:${Date.now()}`,
      subject: 'Test reminder from Visa Tracker',
      message: 'This is a test message. If you can read this, your reminder emails are working.',
    });
    res.json({ notification: n });
  } catch (e) { next(e); }
});

module.exports = router;
