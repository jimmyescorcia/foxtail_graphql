/**
 * Application Entry point
 * @type {createApplication}
 */
const RedisClient = require("./utils/cache").client;
const express = require("express");
const Sentry = require("@sentry/node");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const RateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
import { createServer } from "http";
import authMiddleware from "./middlewares/auth";
import graphqlMiddleware from "./middlewares/graphql";
import compression from "compression";
import cors from "cors";
import expressPlayground from "graphql-playground-middleware-express";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import "./config/cron";
const User = require("./models/User");
const System = require("./models/System");
const Profile = require("./models/Profile");
const schema = require("./graphql");
const redisRateLimitKeyPrefix = "rl:";
const helmet = require("helmet");

/**
 * Create Express server.
 */
const app = express();

const server = createServer(app);

const whitelist =
  process.env.NODE_ENV === "production"
    ? ["https://www.foxtailapp.com", "https://foxtailapp.com"]
    : [
        "https://www.foxtailapp.com",
        "https://foxtailapp.com",
        "http://localhost:1234",
        "http://10.0.2.2:3000",
        "::1",
        "http://foxtail.surge.sh",
        "https://foxtail-stage.netlify.com"
      ];
// Cors option
var corsOptionsDelegate = function(req, callback) {
  const corsOptions = {
    whitelist,
    credentials: true,
    maxAge: 600
  };
  //TODO: undo and add ips from now on
  // if (process.env.NODE_ENV !== "production") {
  //   const myIpAddress = req.connection.remoteAddress; // This is where you get the IP address from the request

  //   if (whitelist.indexOf(myIpAddress) !== -1) {
  //     corsOptions.origin = true;
  //   } else {
  //     corsOptions.origin = false;
  //   }
  // }
  callback(null, corsOptions);
};

// Rate limiter
const limiter = RateLimit({
  store: new RedisStore({
    client: RedisClient
  }),
  max: 75,
  windowMs: 30 * 1000
});

Sentry.init({
  dsn: global.secrets.SENTRY_DSN,
  beforeSend(event, hint) {
    // Modify the event here

    const { message } = hint.originalException;
    if (message && ~message.indexOf("Client")) {
      event.fingerprint = ["client-error"];
    }
    return event;
  }
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());
// Helmet for security like xssFilter, dnsPrefetchControl, remove hidePoweredBy
app.use(helmet());
//CORS
app.use(cors(corsOptionsDelegate));
/**
 * Connect to MongoDB.
 */
mongoose.connect(global.secrets.MONGOHOST, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
});
mongoose.connection.on("error", function() {
  console.log("MongoDB error connection to: " + global.secrets.MONGOHOST);
  process.exit(1);
});
mongoose.connection.on("connected", function() {
  console.log("Mongoose connected on: " + global.secrets.MONGOHOST);
});

/**
 * Express configuration.
 */
app.use(compression());
app.use(
  bodyParser.urlencoded({
    limit: "10mb",
    extended: true,
    parameterLimit: 5000
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(authMiddleware);
/**
 * GraphQL server
 */

app.use("/graphql", limiter, graphqlMiddleware);
/**
 * Refresh token
 */
app.post("/refresh", async (req, res) => {
  try {
    const newtokens = await User.refreshToken(req.body.refreshToken);
    res.send(newtokens);
  } catch (e) {
    console.error(e);
  }
});
/**
 * Captcha resolver
 */
app.post("/allowIp", async (req, res, next) => {
  try {
    if (req.ip && req.body.capToken) {
      const resolve = await User.resolveCapLock({
        capToken: req.body.capToken,
        ip: req.ip
      });
      if (resolve) {
        let key = redisRateLimitKeyPrefix + req.ip;
        RedisClient.del(key);
        next();
      } else {
        res.status(200).send("Client: Incorrect captcha");
      }
    }
  } catch (e) {
    console.error(e);
  }
});
/**
 * Set offline status
 */
app.get("/offline", async (req, res) => {
  if (req.query.token) {
    await Profile.offline(req.query.token);
  }
});

// if (global.secrets.NODE_ENV === "development") {
app.get(
  "/playground",
  expressPlayground({
    endpoint: "/graphql",
    subscriptionsEndpoint: "/subscriptions"
  })
);
// }

app.get("/healthz", function(req, res) {
  // do app logic here to determine if app is truly healthy
  // you should return 200 if healthy, and anything else will fail
  // if you want, you should be able to restrict this to localhost (include ipv4 and ipv6)
  res.status(200).send("I am happy and healthy\n");
});
/**
 * Start Express server.
 */
server.listen(process.env.PORT || global.secrets.PORT, () => {
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      onConnect: async ({ token, refreshToken }, webSocket) => {
        if (token && refreshToken) {
          const user = await User.findByToken(token);

          if (!user) {
            throw new Error("Invalid auth tokens");
          }
          return { user };
        }

        throw new Error("Missing auth tokens!");
      }
    },
    {
      server,
      path: "/subscriptions"
    }
  );

  console.log(
    `GraphQL Server is now running on localhost:${global.secrets.PORT}/graphql`
  );
  console.log(
    `Subscriptions are running on localhost:${global.secrets.PORT}/subscriptions`
  );

  let system = System.findOne({})
    .cache({ key: "system" })
    .then(res => {
      if (res === null) {
        console.log(`System document being created.`);
        system = new System();
        system.save();
      }
      if (!system) {
        throw new Error("System Error");
      }
      console.log(`System document loaded.`);
    })
    .catch(e => {
      console.error(e);
    });
});

// process.on("uncaughtException", function() {
//   console.info("Got SIGINT (aka ctrl-c in docker). Graceful shutdown ");
// });

// quit on ctrl-c when running docker in terminal
process.on("SIGINT", function onSigint() {
  console.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// quit properly on docker stop
process.on("SIGTERM", function onSigterm() {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// shut down server
function shutdown() {
  server.close(function onServerClosed(e) {
    if (e) {
      console.error(e);
      process.exitCode = 1;
    }
    process.exit();
  });
}

module.exports = app;
