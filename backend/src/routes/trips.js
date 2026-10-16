const router = require('express').Router();
const Trip = require('../models/Trip');
const TravelDoc = require('../models/TravelDoc');
const { auth } = require('../middleware/auth');
const { iso, todayUTC } = require('../utils/dates');
const { checkCompliance } = require('../services/compliance');

router.use(auth);

const toClient = (t) => {
  const today = todayUTC();
  const state = t.entryDate > today ? 'planned' : !t.exitDate || t.exitDate >= today ? 'ongoing' : 'completed';
  return {
    id: t.id, country: t.country, entryDate: iso(t.entryDate), exitDate: iso(t.exitDate), purpose: t.purpose, notes: t.notes,
    visa: t.visa ? { id: t.visa.id || String(t.visa), title: t.visa.title || '', visaType: t.visa.visaType || '' } : null, state,
    days: t.exitDate ? Math.round((t.exitDate - t.entryDate) / 86400000) + 1 : null,
  };
};

async function parse(req) {
  const { country, entryDate, exitDate, purpose, visa, notes } = req.body;
  if (!(country || '').trim()) return { error: 'Enter the country' };
  if (!entryDate || Number.isNaN(new Date(entryDate).getTime())) return { error: 'Enter a valid entry date' };
  if (exitDate && (Number.isNaN(new Date(exitDate).getTime()) || new Date(exitDate) < new Date(entryDate))) return { error: 'Exit date cannot be before entry date' };
  let visaId = null;
  if (visa) {
    const v = await TravelDoc.findOne({ _id: visa, user: req.user._id, type: 'visa' });
    if (!v) return { error: 'Selected visa was not found' };
    visaId = v._id;
  }
  return { data: { country: country.trim(), entryDate, exitDate: exitDate || null, purpose: (purpose || '').trim(), visa: visaId, notes: (notes || '').trim() } };
}

router.get('/compliance', async (req, res, next) => {
  try {
    const { country, date } = req.query;
    if (!country || !date || Number.isNaN(new Date(date).getTime())) return res.status(400).json({ message: 'Enter a destination country and travel date' });
    res.json(await checkCompliance(req.user._id, country, date));
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const trips = await Trip.find({ user: req.user._id }).populate('visa', 'title visaType').sort({ entryDate: -1 });
    res.json({ trips: trips.map(toClient) });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { error, data } = await parse(req);
    if (error) return res.status(400).json({ message: error });
    const t = await Trip.create({ ...data, user: req.user._id });
    await t.populate('visa', 'title visaType');
    res.status(201).json({ trip: toClient(t) });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error, data } = await parse(req);
    if (error) return res.status(400).json({ message: error });
    const t = await Trip.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, data, { new: true }).populate('visa', 'title visaType');
    if (!t) return res.status(404).json({ message: 'Trip not found' });
    res.json({ trip: toClient(t) });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const t = await Trip.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!t) return res.status(404).json({ message: 'Trip not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
