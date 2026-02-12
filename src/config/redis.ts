import { createClient } from "redis";
import { config } from "./env";

// Single Redis client instance for the app.
// Keep this minimal; higher-level caching logic will live closer to the feature code.
export const redisClient = createClient({
  url: config.redis.url
});

redisClient.on("error", (err) => {
  // Log to stderr on connection issues; in real deployments you'd ship this to a logger.
  console.error("Redis client error", err);
});

export const connectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const verifyRedisConnection = async (): Promise<void> => {
  // Simple ping to ensure Redis is reachable at startup.
  await redisClient.ping();
};

