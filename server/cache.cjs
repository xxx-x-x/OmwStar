const { createClient } = require("redis");

let client;
let connected = false;

function getCacheTtl() {
  return Number(process.env.CACHE_TTL_SECONDS || 300);
}

async function getRedisClient() {
  if (process.env.REDIS_ENABLED === "false" || process.env.REDIS_ENABLED === "0") return null;
  if (!process.env.REDIS_URL) return null;

  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      connected = false;
      console.warn("Redis unavailable:", error.message);
    });
  }

  if (!connected) {
    try {
      await client.connect();
      connected = true;
    } catch (error) {
      connected = false;
      console.warn("Redis connect failed:", error.message);
      return null;
    }
  }

  return client;
}

async function getJson(key) {
  const redis = await getRedisClient();
  if (!redis) return null;

  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

async function setJson(key, value) {
  const redis = await getRedisClient();
  if (!redis) return;

  await redis.set(key, JSON.stringify(value), {
    EX: getCacheTtl(),
  });
}

async function deleteKeys(keys) {
  const redis = await getRedisClient();
  if (!redis || !keys.length) return;

  await redis.del(keys);
}

module.exports = {
  deleteKeys,
  getJson,
  setJson,
};
