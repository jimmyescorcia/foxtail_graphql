import express from "express";
import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";

const User = require("../models/User");
const Profile = require("../models/Profile");
const Admin = require("../models/Admin");

// SerializeUser is used to provide some identifying token that can be saved
// in the users session.  We traditionally use the 'ID' for this.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// The counterpart of 'serializeUser'.  Given only a user's ID, we must return
// the user object.  This object is placed on 'req.user'.
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Here, we have to find the user
 * based on the given token (authentication).
 * Assuming we use the Bearer strategy,
 * but we can replace the strategy with any other strategy of course.
 */
passport.use(
  new BearerStrategy(async (token, done) => {
    try {
      if (!token || token === "null") {
        done(null, undefined);
        return;
      }

      let user = await User.findByToken(token);
      //TODO: Make better safer way to do this
      // if (!user) {
      //   user = await Admin.findByToken(token);
      // }

      if (user && user.isCouple) {
        user.profileName = (await Profile.findById(user.profileID)).profileName;
      }

      /**
       * Just pass `undefined` as fallback,
       * so the authorization can happen in your GraphQL Schema resolve functions.
       */

      done(null, user || undefined);
    } catch (ex) {
      done(null, undefined);
    }
  })
);

const middleware = express();

middleware.use(passport.initialize());
middleware.use(passport.session());
export default middleware;
