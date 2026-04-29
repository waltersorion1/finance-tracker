require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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

app.use('/', require('./routes/oauth'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/dashboard', require('./routes/api/dashboard'));
app.use('/api/accounts', require('./routes/api/accounts'));
app.use('/api/goals', require('./routes/api/goals'));
app.use('/api/transactions', require('./routes/api/transactions'));
app.use('/api/analytics', require('./routes/api/analytics'));
app.use('/api/profile', require('./routes/api/profile'));

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
    return res.status(500).json({ error: 'Server error' });
  }
  return res.status(500).sendFile(path.join(publicDir, 'index.html'));
});

module.exports = app;
