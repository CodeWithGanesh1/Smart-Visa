const router = require('express').Router();
const Query = require('../models/Query');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try { res.json({ queries: await Query.find({ user: req.user._id }).sort({ createdAt: -1 }) }); } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!(subject || '').trim() || !(message || '').trim()) return res.status(400).json({ message: 'Enter a subject and a message' });
    const q = await Query.create({ user: req.user._id, subject, message });
    res.status(201).json({ query: q });
  } catch (e) { next(e); }
});

module.exports = router;
