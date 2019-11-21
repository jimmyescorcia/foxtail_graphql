import { RedisPubSub } from "graphql-redis-subscriptions";
const Redis = require("ioredis");

const options =
  process.env.NODE_ENV === "production"
    ? {
        host: global.secrets.REDISHOST,
        retry_strategy: options => {
          // reconnect after
          return Math.max(options.attempt * 100, 3000);
        }
      }
    : {
        host: global.secrets.REDISHOST,
        port: global.secrets.REDISPORT,
        password: global.secrets.REDISPASS,
        retry_strategy: options => {
          // reconnect after
          return Math.max(options.attempt * 100, 3000);
        }
      };

export const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options)
});
