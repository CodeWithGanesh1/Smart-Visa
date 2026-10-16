const dns = require("dns");
dns.setServers(["8.8.8.8","8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first"
    
)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const { startScheduler } = require('./src/services/reminders');

for (const k of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[k]) { console.error(`Missing environment variable: ${k}`); process.exit(1); }
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const origins = (process.env.CLIENT_URL || 'https://smart-visa-357h.vercel.app/').split(',').map((s) => s.trim().replace(/\/$/, ''));
app.use(cors({ origin: (origin, cb) => (!origin || origins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))) }));
app.use(express.json({ limit: '4mb' }));

app.get('/', (req, res) => res.json({ name: 'Smart Visa & Travel Document Tracker API', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { message: 'Too many attempts. Try again in a few minutes.' } });
app.use('/api/auth', authLimiter, require('./src/routes/auth'));
app.use('/api/documents', require('./src/routes/documents'));
app.use('/api/trips', require('./src/routes/trips'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/queries', require('./src/routes/queries'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/cron', require('./src/routes/cron'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ message: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'File is too large. Maximum size is 2 MB.' });
  console.error(err);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
    startScheduler();
  })
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
