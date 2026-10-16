const router = require('express').Router();
const TravelDoc = require('../models/TravelDoc');
const { auth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');
const { iso, daysLeft, docStatus, DAY } = require('../utils/dates');
const LABEL = { passport: 'Passport', visa: 'Visa', insurance: 'Travel insurance', vaccination: 'Vaccination' };

router.use(auth);

const TYPES = ['passport', 'visa', 'insurance', 'vaccination'];
const MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

const toClient = (d) => {
  const n = daysLeft(d.expiryDate);
  return {
    id: d.id, type: d.type, title: d.title, country: d.country, number: decrypt(d.numberEnc),
    issueDate: iso(d.issueDate), validFrom: iso(d.validFrom), expiryDate: iso(d.expiryDate),
    visaType: d.visaType, entryType: d.entryType, provider: d.provider, vaccine: d.vaccine, notes: d.notes,
    hasFile: !!d.file?.name, fileName: d.file?.name || '',
    renewals: (d.renewals || []).map((r) => ({ at: r.at, oldExpiry: iso(r.oldExpiry), newExpiry: iso(r.newExpiry) })),
    daysLeft: n, status: docStatus(n), createdAt: d.createdAt,
  };
};

const validDate = (v) => !v || !Number.isNaN(new Date(v).getTime());

function validate(b) {
  if (!TYPES.includes(b.type)) return 'Choose a document type';
  const title = (b.type === 'vaccination' ? b.vaccine : b.title) || '';
  if (!title.trim()) return b.type === 'vaccination' ? 'Enter the vaccine name' : 'Enter a title for this document';
  if (['passport', 'visa', 'insurance'].includes(b.type) && !b.expiryDate) return 'Expiry date is required';
  if (b.type === 'passport' && !(b.number || '').trim()) return 'Enter the passport number';
  if (b.type === 'passport' && !(b.country || '').trim()) return 'Enter the country of issue';
  if (b.type === 'visa' && (!(b.country || '').trim() || !(b.visaType || '').trim())) return 'Visa needs a country and a visa type';
  if (![b.issueDate, b.validFrom, b.expiryDate].every(validDate)) return 'One of the dates is not valid';
  const start = b.issueDate || b.validFrom;
  if (start && b.expiryDate && new Date(b.expiryDate) < new Date(start)) return 'Expiry date cannot be before the issue / start date';
  if (b.file && (!MIMES.includes(b.file.mime) || !b.file.data || b.file.data.length > 2_800_000)) return 'Upload a PDF, JPG or PNG up to 2 MB';
  return null;
}

function apply(doc, b) {
  doc.type = b.type;
  doc.title = (b.type === 'vaccination' ? b.vaccine : b.title).trim();
  doc.country = (b.country || '').trim();
  doc.numberEnc = encrypt((b.number || '').trim());
  doc.issueDate = b.issueDate || null;
  doc.validFrom = b.validFrom || null;
  doc.expiryDate = b.expiryDate || null;
  doc.visaType = b.type === 'visa' ? (b.visaType || '').trim() : '';
  doc.entryType = b.type === 'visa' ? (b.entryType || 'multiple') : '';
  doc.provider = b.type === 'insurance' ? (b.provider || '').trim() : '';
  doc.vaccine = b.type === 'vaccination' ? (b.vaccine || '').trim() : '';
  doc.notes = (b.notes || '').trim();
  if (b.removeFile) doc.file = undefined;
  if (b.file) doc.file = { name: b.file.name, mime: b.file.mime, data: b.file.data };
}

router.get('/', async (req, res, next) => {
  try {
    const docs = await TravelDoc.find({ user: req.user._id }).sort({ expiryDate: 1 });
    res.json({ documents: docs.map(toClient) });
  } catch (e) { next(e); }
});

const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const ymd = (d) => iso(d).replace(/-/g, '');

// Add every expiry date to Google / Apple / Outlook calendar (with a 30-day alarm)
router.get('/calendar.ics', async (req, res, next) => {
  try {
    const docs = await TravelDoc.find({ user: req.user._id, expiryDate: { $ne: null } });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Smart Visa Tracker//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Travel document expiries'];
    for (const d of docs) {
      lines.push('BEGIN:VEVENT', `UID:${d.id}@visa-tracker`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(d.expiryDate)}`, `DTEND;VALUE=DATE:${ymd(new Date(d.expiryDate.getTime() + DAY))}`,
        `SUMMARY:${icsEsc(`${LABEL[d.type]} expires: ${d.title}`)}`,
        `DESCRIPTION:${icsEsc(d.country ? `Country: ${d.country}. Renew before this date.` : 'Renew before this date.')}`,
        'BEGIN:VALARM', 'TRIGGER:-P30D', 'ACTION:DISPLAY', 'DESCRIPTION:30 days until expiry', 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8').set('Content-Disposition', 'attachment; filename="travel-document-expiries.ics"').send(lines.join('\r\n'));
  } catch (e) { next(e); }
});

// One-click renewal: only the new expiry date is needed, and the change goes into the renewal log
router.patch('/:id/renew', async (req, res, next) => {
  try {
    const { expiryDate } = req.body;
    if (!expiryDate || Number.isNaN(new Date(expiryDate).getTime())) return res.status(400).json({ message: 'Enter the new expiry date' });
    const d = await TravelDoc.findOne({ _id: req.params.id, user: req.user._id });
    if (!d) return res.status(404).json({ message: 'Document not found' });
    const next_ = new Date(expiryDate);
    if (d.expiryDate && next_ <= d.expiryDate) return res.status(400).json({ message: `New expiry must be later than the current one (${iso(d.expiryDate)})` });
    if (d.expiryDate) d.renewals.push({ oldExpiry: d.expiryDate, newExpiry: next_ });
    d.expiryDate = next_;
    await d.save();
    res.json({ document: toClient(d) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const d = await TravelDoc.findOne({ _id: req.params.id, user: req.user._id });
    if (!d) return res.status(404).json({ message: 'Document not found' });
    res.json({ document: toClient(d) });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const err = validate(req.body);
    if (err) return res.status(400).json({ message: err });
    const d = new TravelDoc({ user: req.user._id });
    apply(d, req.body);
    await d.save();
    res.status(201).json({ document: toClient(d) });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const err = validate(req.body);
    if (err) return res.status(400).json({ message: err });
    const d = await TravelDoc.findOne({ _id: req.params.id, user: req.user._id });
    if (!d) return res.status(404).json({ message: 'Document not found' });
    const oldExpiry = d.expiryDate;
    apply(d, req.body);
    // Renewal log: a later expiry date means the document was renewed
    if (oldExpiry && d.expiryDate && d.expiryDate > oldExpiry) d.renewals.push({ oldExpiry, newExpiry: d.expiryDate });
    await d.save();
    res.json({ document: toClient(d) });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const d = await TravelDoc.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!d) return res.status(404).json({ message: 'Document not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/:id/file', async (req, res, next) => {
  try {
    const d = await TravelDoc.findOne({ _id: req.params.id, user: req.user._id }).select('+file.data');
    if (!d?.file?.data) return res.status(404).json({ message: 'No file uploaded for this document' });
    res.set('Content-Type', d.file.mime).set('Content-Disposition', `inline; filename="${encodeURIComponent(d.file.name)}"`);
    res.send(Buffer.from(d.file.data, 'base64'));
  } catch (e) { next(e); }
});

module.exports = router;
