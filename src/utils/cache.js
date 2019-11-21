import redis from "redis";
import util from "util";
import mongoose from "mongoose";

const client =
  process.env.NODE_ENV === "production"
    ? redis.createClient({
        host: global.secrets.REDISHOST
      })
    : redis.createClient({
        host: global.secrets.REDISHOST,
        port: global.secrets.REDISPORT,
        auth_pass: global.secrets.REDISPASS
      });

client.on("error", function(err) {
  console.log("Redis Error :" + err);
});

client.on("connect", function() {
  console.log("Redis Connected on:" + global.secrets.REDISHOST);
});

client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");

  return this;
};

mongoose.Query.prototype.exec = async function() {
  try {
    if (!this.useCache) {
      return exec.apply(this, arguments);
    }

    const key = JSON.stringify(
      Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
      })
    );
    //See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key);

    //If we do, return that
    if (cacheValue) {
      const doc = JSON.parse(cacheValue);

      return Array.isArray(doc)
        ? doc.map(d => new this.model(d))
        : new this.model(doc);
    }

    //Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments);

    if (result) {
      client.hset(this.hashKey, key, JSON.stringify(result.toObject()));
    }

    if (this.mongooseCollection.name !== "systems") {
      client.expire(this.hashKey, 1800); // 30 minutes cache
    }

    return result;
  } catch (e) {
    console.error(e);
    return;
  }
};

module.exports = {
  client: client,
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
