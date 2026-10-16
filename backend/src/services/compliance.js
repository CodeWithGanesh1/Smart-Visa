const TravelDoc = require('../models/TravelDoc');
const { iso } = require('../utils/dates');

const norm = (s) => (s || '').trim().toLowerCase();

// Checks the traveller's saved documents against a destination + travel date.
async function checkCompliance(userId, country, dateStr) {
  const date = new Date(dateStr);
  const docs = await TravelDoc.find({ user: userId });
  const checks = [];

  const passports = docs.filter((d) => d.type === 'passport' && d.expiryDate).sort((a, b) => b.expiryDate - a.expiryDate);
  if (!passports.length) {
    checks.push({ item: 'passport', status: 'fail', message: 'No passport on file. Add your passport details.' });
  } else {
    const p = passports[0];
    const need = new Date(date);
    need.setUTCMonth(need.getUTCMonth() + 6);
    if (p.expiryDate >= need) checks.push({ item: 'passport', status: 'ok', message: `Valid until ${iso(p.expiryDate)}, which is 6+ months after your travel date.` });
    else if (p.expiryDate >= date) checks.push({ item: 'passport', status: 'warn', message: `Expires ${iso(p.expiryDate)}, less than 6 months after travel. Many countries require 6 months of validity.` });
    else checks.push({ item: 'passport', status: 'fail', message: `Passport expires ${iso(p.expiryDate)}, before your travel date. Renew it first.` });
  }

  const visas = docs.filter((d) => d.type === 'visa' && norm(d.country) === norm(country));
  const covering = visas.find((v) => v.expiryDate && (!v.validFrom || v.validFrom <= date) && v.expiryDate >= date);
  if (covering) checks.push({ item: 'visa', status: 'ok', message: `${covering.title} is valid on your travel date (until ${iso(covering.expiryDate)}).` });
  else if (visas.length) checks.push({ item: 'visa', status: 'fail', message: `Your ${country} visa does not cover ${dateStr}. Check validity dates or apply for a new one.` });
  else checks.push({ item: 'visa', status: 'warn', message: `No ${country} visa on file. Check whether your passport needs a visa for ${country}.` });

  const ins = docs.filter((d) => d.type === 'insurance' && d.expiryDate && (!d.validFrom || d.validFrom <= date) && d.expiryDate >= date);
  if (ins.length) checks.push({ item: 'insurance', status: 'ok', message: `${ins[0].title} covers your travel date.` });
  else checks.push({ item: 'insurance', status: 'warn', message: 'No travel insurance covers this date.' });

  const vacc = docs.filter((d) => d.type === 'vaccination');
  if (vacc.length) checks.push({ item: 'vaccination', status: 'ok', message: `${vacc.length} vaccination record(s) on file. Confirm ${country} requirements.` });
  else checks.push({ item: 'vaccination', status: 'warn', message: `No vaccination records on file. Check what ${country} requires.` });

  const overall = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
  return { country, date: dateStr, overall, checks };
}

module.exports = { checkCompliance };
