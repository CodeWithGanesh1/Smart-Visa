const DAY = 86400000;
const todayUTC = () => new Date(new Date().toISOString().slice(0, 10));
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const daysLeft = (d) => (d ? Math.round((new Date(d) - todayUTC()) / DAY) : null);
const docStatus = (n) => (n === null ? 'valid' : n < 0 ? 'expired' : n <= 30 ? 'critical' : n <= 90 ? 'warning' : 'valid');
module.exports = { DAY, todayUTC, iso, daysLeft, docStatus };
