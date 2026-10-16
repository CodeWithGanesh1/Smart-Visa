const cron = require('node-cron');
const User = require('../models/User');
const TravelDoc = require('../models/TravelDoc');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
const { sendMail, NotConfigured } = require('./mailer');
const { layout, appUrl, esc } = require('./emailTemplate');
const { checkCompliance } = require('./compliance');
const { todayUTC, iso, daysLeft, DAY } = require('../utils/dates');

const LABEL = { passport: 'Passport', visa: 'Visa', insurance: 'Travel insurance', vaccination: 'Vaccination' };
const describe = (d) => `${LABEL[d.type]} "${d.title}"${d.country ? ` (${d.country})` : ''}`;

// Creates the notification record first (the unique key stops duplicates), then emails the user.
async function notify({ user, doc, trip, type, threshold, key, subject, message }) {
  let n;
  try {
    n = await Notification.create({ user: user._id, doc: doc?._id, trip: trip?._id, type, threshold, key, subject, message });
  } catch (e) {
    if (e.code === 11000) return null; // already sent
    throw e;
  }
  if (!user.prefs.email) { n.status = 'skipped'; n.error = 'Email alerts are switched off for this user'; await n.save(); return n; }
  try {
    await sendMail({
      to: user.email, subject,
      text: `Hi ${user.name},\n\n${message}\n\nOpen your dashboard: ${appUrl()}\n\n- Smart Visa & Travel Document Tracker`,
      html: layout({ heading: subject, greeting: `Hi ${user.name.split(' ')[0]},`, paragraphs: message.split('\n\n').map((p) => esc(p).replace(/\n/g, '<br>')), cta: { label: 'Open my dashboard', url: `${appUrl()}/` } }),
    });
    n.status = 'sent';
  } catch (e) {
    n.status = e instanceof NotConfigured ? 'skipped' : 'failed';
    n.error = e.message;
  }
  await n.save();
  return n;
}

async function runReminders() {
  const today = todayUTC();
  const result = { checked: 0, created: 0 };
  const count = (n) => { result.checked++; if (n) result.created++; };

  // 1) Expiry reminders (90 / 60 / 30 / 7 days ... as chosen by the user) and expired alerts
  const docs = await TravelDoc.find({ expiryDate: { $ne: null } }).populate('user');
  for (const doc of docs) {
    const user = doc.user;
    if (!user || !user.active) continue;
    const d = daysLeft(doc.expiryDate);
    if (d < 0) {
      count(await notify({
        user, doc, type: 'expired', threshold: 0, key: `exp:${doc._id}:${iso(doc.expiryDate)}`,
        subject: `Expired: ${describe(doc)}`,
        message: `Your ${describe(doc)} expired on ${iso(doc.expiryDate)}. Renew it as soon as possible and update the new expiry date in the app.`,
      }));
    } else {
      const th = [...user.prefs.reminderDays].sort((a, b) => a - b).find((t) => d <= t);
      if (th !== undefined) {
        count(await notify({
          user, doc, type: 'expiry', threshold: th, key: `pre:${doc._id}:${th}:${iso(doc.expiryDate)}`,
          subject: `${d} day${d === 1 ? '' : 's'} left: ${describe(doc)}`,
          message: `Your ${describe(doc)} expires on ${iso(doc.expiryDate)} (${d} day${d === 1 ? '' : 's'} from today). Start the renewal now to avoid penalties or denied boarding.`,
        }));
      }
    }
  }

  // 2) Overstay warnings: currently in a country and the visa for it has expired
  const ongoing = await Trip.find({ entryDate: { $lte: today }, $or: [{ exitDate: null }, { exitDate: { $exists: false } }] }).populate('user');
  for (const trip of ongoing) {
    const user = trip.user;
    if (!user || !user.active || !user.prefs.overstay) continue;
    const visas = await TravelDoc.find({ user: user._id, type: 'visa', country: new RegExp(`^${trip.country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!visas.length) continue;
    const latest = visas.reduce((a, b) => (a.expiryDate > b.expiryDate ? a : b));
    if (latest.expiryDate && latest.expiryDate < today) {
      count(await notify({
        user, trip, doc: latest, type: 'overstay', key: `over:${trip._id}:${iso(today)}`,
        subject: `Overstay warning: ${trip.country}`,
        message: `Your ${trip.country} visa expired on ${iso(latest.expiryDate)} but your trip (entered ${iso(trip.entryDate)}) has no exit date. If you are still in ${trip.country}, you may be overstaying. Contact the local immigration office. If you have already left, add your exit date in Travel History.`,
      }));
    }
  }

  // 3) Destination compliance: planned trips starting within 30 days
  const soon = new Date(today.getTime() + 30 * DAY);
  const planned = await Trip.find({ entryDate: { $gt: today, $lte: soon } }).populate('user');
  for (const trip of planned) {
    const user = trip.user;
    if (!user || !user.active || !user.prefs.compliance) continue;
    const r = await checkCompliance(user._id, trip.country, iso(trip.entryDate));
    if (r.overall === 'ok') continue;
    const lines = r.checks.filter((c) => c.status !== 'ok').map((c) => `- ${c.item}: ${c.message}`).join('\n');
    count(await notify({
      user, trip, type: 'compliance', key: `comp:${trip._id}:${iso(trip.entryDate)}:${r.checks.map((c) => c.status[0]).join('')}`,
      subject: `Check your documents for ${trip.country} (${iso(trip.entryDate)})`,
      message: `Your trip to ${trip.country} starts on ${iso(trip.entryDate)}. Some documents need attention:\n\n${lines}`,
    }));
  }
  return result;
}

function startScheduler() {
  // Every day at 08:00 India time. On free hosting that sleeps, also ping /api/cron/run from cron-job.org.
  cron.schedule('0 8 * * *', () => runReminders().then((r) => console.log('Reminders run', r)).catch((e) => console.error('Reminder run failed', e)), { timezone: 'Asia/Kolkata' });
  console.log('Reminder scheduler started (daily 08:00 IST)');
}

module.exports = { runReminders, startScheduler, notify };
