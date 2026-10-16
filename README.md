# Smart Visa & Travel Document Tracker

A web app where travellers store passport, visa, insurance and vaccination details, track expiry dates and get automatic email reminders (90 / 60 / 30 / 7 days or custom), overstay warnings and destination compliance checks. Includes a role-based admin panel.

**Stack:** React (Vite) · Node.js + Express · MongoDB (Atlas) · JWT auth · node-cron · Brevo / SendGrid / SMTP for email
**Hosting:** Frontend on Vercel, backend on Render.

## Pages (13)
| Page | Who | Purpose |
|---|---|---|
| Login, Register, Forgot / Reset password | public | account access, password reset by email link |
| Dashboard | user | document-health ring, "needs attention" list, next-trip check, recent alerts |
| My documents | user | card grid, filters, search, sort, one-click **Renew**, view file, add all expiries to calendar (.ics) |
| Add / Edit document | user | passport, visa, insurance, vaccination + file upload, renewal log |
| Reminders | user | reminder days, switches, upcoming reminder schedule, test email, alert history |
| Travel history | user | trips, visa used, countries visited, days in last 180 days, "I have left", compliance check, renewal log |
| Trip checklist | user | per-destination checklist, download (.txt) or print |
| Help & queries | user | send queries to admin, see replies |
| Profile | user | edit details, change password |
| Admin panel | admin | analytics (KPIs + charts), users, queries, compliance report (CSV), reminder log |

**Also:** light / dark theme, toasts and confirm dialogs, loading skeletons, mobile drawer menu, branded HTML reminder emails.

## How reminders work
1. `node-cron` runs `runReminders()` every day at 08:00 IST.
2. For each document with an expiry date: finds the smallest reminder day (from the user's settings) that is >= days left and sends **one** email for it. Expired documents trigger one "expired" alert.
3. **Overstay:** a trip with no exit date in a country whose visa has expired triggers a daily warning.
4. **Compliance:** planned trips starting in <= 30 days are checked (passport valid 6 months after travel, visa covers the date, insurance covers the date, vaccination records). Problems trigger one alert.
5. Every alert is stored in `notifications` with a unique key, so the same alert is never sent twice. Status = sent / failed / skipped.
6. Render's free plan sleeps when idle, so also call `GET /api/cron/run?key=CRON_SECRET` daily from https://cron-job.org. This is the reliable trigger.

## Security
- Passwords hashed with bcrypt (12 rounds); JWT (7 days); role-based middleware (`user` / `admin`).
- Passport / visa / policy numbers encrypted at rest with AES-256-GCM (`ENCRYPTION_KEY`).
- Admins see compliance status only, never document numbers or files.
- Helmet, CORS allow-list (`CLIENT_URL`), rate limiting on auth routes, input validation on every write.
- Users can only access their own records (every query filters by `user`).

## Data model (MongoDB collections)
- **users**: name, email, phone, password(hash), role, active, prefs{reminderDays, email, overstay, compliance}, lastLoginAt
- **traveldocs**: user, type, title, country, numberEnc, issueDate, validFrom, expiryDate, visaType, entryType, provider, vaccine, notes, file{name,mime,data}, renewals[]
- **trips**: user, country, entryDate, exitDate, purpose, visa(ref), notes
- **notifications**: user, doc, trip, type, threshold, status, subject, message, error, key(unique)
- **queries**: user, subject, message, status, reply

## API summary (all under /api)
- `POST /auth/register|login|forgot|reset`, `GET|PUT /auth/me`, `PUT /auth/password`
- `GET|POST /documents`, `GET|PUT|DELETE /documents/:id`, `PATCH /documents/:id/renew`, `GET /documents/:id/file`, `GET /documents/calendar.ics`
- `GET|POST /trips`, `PUT|DELETE /trips/:id`, `GET /trips/compliance?country=&date=`
- `GET /notifications`, `POST /notifications/test`
- `GET|POST /queries`
- Admin: `GET /admin/stats|users|queries|compliance|activity|report.csv`, `PATCH|DELETE /admin/users/:id`, `PATCH /admin/queries/:id`, `POST /admin/run-reminders`
- `GET|POST /cron/run?key=...` (external scheduler)

## Run locally
Prerequisites: Node.js 18+ (LTS), a free MongoDB Atlas cluster.

```bash
# terminal 1 - backend
cd backend
cp .env.example .env      # then fill MONGODB_URI, JWT_SECRET, ENCRYPTION_KEY, ADMIN_EMAIL
npm install
npm run dev               # http://localhost:5000

# terminal 2 - frontend
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev               # http://localhost:5173
```
Register with the email you put in `ADMIN_EMAIL` to get the admin account.

## Deploy
**Backend (Render, Web Service):** Root Directory `backend` · Build `npm install` · Start `npm start` · add every variable from `backend/.env.example`. Set `CLIENT_URL` to your Vercel URL (no trailing slash).
**Frontend (Vercel):** Root Directory `frontend` · Framework Vite · env `VITE_API_URL` = your Render URL. Redeploy after changing it.
**Email:** create a free Brevo account, verify a sender email, create an API key, set `BREVO_API_KEY` and `MAIL_FROM`. (Render's free plan can block SMTP ports, so use an HTTPS API provider.)
**Password reset emails** use the same email provider and `CLIENT_URL`, so set both correctly.
**Cron:** on cron-job.org create a daily job for `https://YOUR-RENDER-URL/api/cron/run?key=YOUR_CRON_SECRET`.

## Test checklist before submitting
1. Register, log in, log out. 2. Add passport, visa, insurance, vaccination (with a PDF). 3. Edit a document to a later expiry and see it in the renewal log. 4. Reminder settings: save, then "Send me a test email". 5. Add a document expiring in ~20 days, then (as admin) "Run reminders now" and confirm the alert + email. 6. Add a planned trip and run "Check documents". 7. Download the checklist. 8. Send a query, reply as admin. 9. Check admin analytics, users and CSV report. 10. Open the site on a phone.

## Scope notes
Out of scope in phase 1: visa application, government integration, airline booking. SMS reminders are shown as "not available" because no SMS provider is wired in. Document data is entered by the user; entry rules differ per country, so the checks are guidance, not legal advice.
