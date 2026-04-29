# Finance Tracker

A local-first personal expenditure app for tracking income, expenses, account distributions, savings goals, daily spending advice, and analytics.

The app is currently designed to run locally on a PC, with a production-friendly structure that can later move to a hosted server.

## Features

- Session-based authentication with local email/password login.
- Optional Google OAuth support.
- Password change, JSON export, and account deletion controls.
- JSON API backend with a static JavaScript frontend.
- No EJS rendering.
- Strict CSP-friendly frontend with no inline JavaScript.
- Bootstrap, Bootstrap Icons, Chart.js, and app assets served locally for offline use.
- Account income distribution with totals enforced at 100%.
- User-managed savings goals with goal allocation totals enforced at 100%.
- Category budgets with weekly or monthly limits.
- Recurring income and expense templates.
- Background scheduler for due recurring transactions.
- Monthly review reports with budget watch, goal timing, and spending flags.
- Daily spending reports with warnings for overspending and discretionary purchases.
- Analytics charts for income, expenses, categories, accounts, and goals.
- PWA-ready static frontend with a service worker cache.

## Project Structure

```text
backend/
  app.js                 Express app, middleware, CSP, sessions, API routes
  server.js              MongoDB connection and HTTP server startup
  config/                Passport and database config
  middleware/            Shared Express middleware
  models/                Mongoose models
  routes/api/            JSON API routes
  routes/oauth.js        Google OAuth routes
  scripts/               Local maintenance scripts
  utils/                 Shared backend helpers

frontend/public/
  index.html             Static app shell
  css/                   App styles
  js/main.js             Frontend module entry point
  js/app/                App orchestration modules
  js/core/               Reusable browser utilities
  lib/                   Vendored offline browser libraries
  icons/                 Local app icons
```

## Requirements

- Node.js 18+
- MongoDB running locally or a MongoDB connection string
- Git

## Setup

Install dependencies:

```powershell
npm install
```

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

```env
MONGO_URI=mongodb://localhost:27017/finance-tracker
SESSION_SECRET=change_this_to_a_long_random_string_at_least_32_chars
```

Google OAuth is optional. If you use it, set:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

For deployment, start from `.env.production.example`.

## Run

Development mode:

```powershell
npm run dev
```

Production-style local run:

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

Versioned API routes are also available under `/api/v1`.

## Quality Checks

Run the test suite:

```powershell
npm test
```

Run syntax checks:

```powershell
npm run check:syntax
```

## Docker

Run the app with MongoDB:

```powershell
docker compose up --build
```

The app will be available at:

```text
http://localhost:3000
```

## Backups

With MongoDB Database Tools installed and `MONGO_URI` set:

```powershell
npm run backup:mongo
npm run restore:mongo
```

## Goal Sync

The current default personal goals are:

- Buy a Car: 7,000,000 XAF
- Rent Studio: 700,000 XAF

To sync these defaults into an existing local database user:

```powershell
npm run sync:goals
```

## Security Notes

- `.env` is ignored and must not be committed.
- Browser libraries are vendored locally under `frontend/public/lib`.
- CSP is configured in `backend/app.js`.
- Mutating API requests are protected by a same-origin guard.
- Frontend behavior should stay in external ES modules under `frontend/public/js`.

## GitHub

Repository:

```text
git@github.com:waltersorion1/finance-tracker.git
```
