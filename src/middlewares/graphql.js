import passport from "passport";
import graphqlHTTP from "express-graphql";
// let's import the schema file we just created
const schema = require("../graphql");

export default graphqlHTTP((req, res) => {
  return new Promise((resolve, reject) => {
    const next = (user, info = {}) => {
      let token = null;
      let refreshToken = null;
      res.set(
        "Access-Control-Expose-Headers",
        "authorization, x-refresh-token,lang"
      );

      if (user) {
        if (req.rateLimit.limit <= req.rateLimit.current) {
          user.captchaReq = true;
          user.ip = req.ip;
          user.save();
        }

        token = user.tokens.find(q => q.access === "auth");
        refreshToken = user.tokens.find(q => q.access === "refresh");
        res.set("authorization", token.token);
        res.set("x-refresh-token", refreshToken.token);
        res.set("lang", user.lang);
      }
      /**
       * GraphQL configuration goes here
       */
      resolve({
        schema,
        graphiql: process.env.NODE_ENV !== "production", // <- only enable GraphiQL in dev
        context: {
          user: user || null
        }
      });
    };

    /**
     * Try to authenticate using passport,
     * but never block the call from here.
     */
    passport.authenticate("bearer", { session: false }, (err, user) => {
      //if tokens are diff send as info
      next(user);
    })(req, res, next);
  });
});
