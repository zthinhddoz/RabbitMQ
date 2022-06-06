import passport from 'passport';
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';

import { SECRET, AUTH } from '~/env';
import models from '~/shared/models';

const google_options = {
  clientID: AUTH.GOOGLE.clientID,
  clientSecret: AUTH.GOOGLE.clientSecret,
  callbackURL: AUTH.GOOGLE.googleCallback
};

const facebook_options = {
  clientID: AUTH.FACEBOOK.clientID,
  clientSecret: AUTH.FACEBOOK.clientSecret,
  callbackURL: AUTH.FACEBOOK.facebookCallback,
};

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET,
    },
    async (jwtPayload, done) => {
      try {
        if (Date.now() > jwtPayload.expires) return done('Token expired');

        const user = await models.User.findOne({ username: jwtPayload.username }).exec();
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

function google_callback(token, refreshToken, profile, done) {
  process.nextTick(() => {
    models.User.findOne({ where: { usr_n3pty_id: profile.id } }).then((currentUser) => {
      if (currentUser) {
        return done(null, currentUser);
      }
      else { // if the user isnt in our database, create a new user
        try {
          // TODO: HANDLE DATA, here is sample data
          let co_id = "sample_comp";
          let act_flg = "1";
          let usr_nm = 'gg_acc_' + Math.round(Math.random() * 100);
          let cre_usr_id = "Sample_UserId";
          // Handle case when create user failed
          models.User.create({
            usr_id: usr_nm,
            usr_n3pty_id: profile.id,
            usr_pwd: token,
            usr_eml: profile.emails ? profile.emails[0].value : "",
            full_nm: profile.displayName,
            sex_flg: profile.gender ? profile.gender : 3,
            co_id: co_id,
            act_flg: act_flg,
            usr_nm: usr_nm,
            cre_usr_id: cre_usr_id
          }).then(result => {
            return done(null, result);
          }).catch(err => {
            console.log("Error when creating new user", err);
          });
        }
        catch (err) {
          return done(null, null);
        }
      }
    });
  });

}

function facebook_callback(token, refreshToken, profile, done) {
  process.nextTick(() => {
    models.User.findOne({ where: { usr_n3pty_id: profile.id } }).then((currentUser) => {
      if (currentUser) { // Is logined before
        return done(null, currentUser);
      }
      else {// if the user isnt in our database, create a new user
        try {
          // TODO: HANDLE DATA, here is sample data
          let co_id = "sample_comp";
          let act_flg = "1";
          let usr_nm = 'fb_acc_' + Math.round(Math.random() * 100);
          let cre_usr_id = "Sample_UserId";
          model.User.create({ co_id, act_flg, usr_nm, cre_usr_id }).
            models.User.create({
              usr_id: usr_nm,
              usr_n3pty_id: profile.id,
              usr_pwd: token,
              usr_eml: profile.emails ? profile.emails[0] : "",
              full_nm: profile.displayName,
              sex_flg: profile.gender ? profile.gender : 3,
              co_id: co_id,
              act_flg: act_flg,
              usr_nm: usr_nm,
              cre_usr_id: cre_usr_id
            }).then(result => {
              return done(null, result);
            }).catch(err => {
              console.log("Error when creating new user", err);
            });
        }
        catch (err) {
          return done(null, null);
        }
      }
    });
  });
}

passport.use(new GoogleStrategy(google_options, google_callback));
passport.use(new FacebookStrategy(facebook_options, facebook_callback));

//usr name saved in the session 
// used to retrieve the whole object via the deserializeUser function 
passport.serializeUser(function (user, done) {
  done(null, user.usr_id);
});

passport.deserializeUser(function (userId, done) {
  models.User.findOne({ where: { usr_n3pty_id: userId } }).then((currentUser) => {
    done(null, currentUser); // User is passed to req.user
  }).catch(err => {
    done(new Error("Failed to deserialize an user"));
  })
});

export default passport;
