const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Email not registered' });
      if (!user.password) return done(null, false, { message: 'Use the sign-in method used at registration' });
      const isMatch = await bcrypt.compare(password, user.password);
      return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password' });
    } catch (err) {
      return done(err);
    }
  }));

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);
        const [firstName = '', ...rest] = (profile.displayName || '').split(' ');
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          firstName,
          lastName: rest.join(' '),
          email: profile.emails[0].value,
          profilePicture: profile.photos?.[0]?.value || '',
          currency: 'XAF',
          registeredVia: 'google'
        });
        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => User.findById(id).then(user => done(null, user)));
};
