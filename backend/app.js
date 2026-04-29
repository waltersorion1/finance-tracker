require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const sameOriginGuard = require('./middleware/sameOrigin');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET env var is not set.');
}
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI env var is not set.');
}

const app = express();
require('./config/passport')(passport);

const publicDir = path.join(__dirname, '..', 'frontend', 'public');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 700, standardHeaders: true, legacyHeaders: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 7 * 24 * 60 * 60 }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use('/api', sameOriginGuard);

function mountApi(prefix) {
  app.use(`${prefix}/health`, require('./routes/api/health'));
  app.use(`${prefix}/auth`, require('./routes/api/auth'));
  app.use(`${prefix}/dashboard`, require('./routes/api/dashboard'));
  app.use(`${prefix}/accounts`, require('./routes/api/accounts'));
  app.use(`${prefix}/goals`, require('./routes/api/goals'));
  app.use(`${prefix}/transactions`, require('./routes/api/transactions'));
  app.use(`${prefix}/analytics`, require('./routes/api/analytics'));
  app.use(`${prefix}/profile`, require('./routes/api/profile'));
  app.use(`${prefix}/budgets`, require('./routes/api/budgets'));
  app.use(`${prefix}/recurring`, require('./routes/api/recurring'));
  app.use(`${prefix}/audit`, require('./routes/api/audit'));
  app.use(`${prefix}/reviews`, require('./routes/api/reviews'));
}

app.use('/', require('./routes/oauth'));
mountApi('/api');
mountApi('/api/v1');

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  }
  return res.status(500).sendFile(path.join(publicDir, 'index.html'));
});

module.exports = app;
