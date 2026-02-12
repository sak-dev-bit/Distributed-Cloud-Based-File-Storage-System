import { createApp } from "./app";
import { config } from "./config/env";
import { logger } from "./config/logger";
import { verifyDbConnection } from "./config/db";
import { connectRedis, verifyRedisConnection } from "./config/redis";
import { initStorage } from "./config/s3";

// Entry point for the backend. This is where we wire infrastructure checks
// (DB/Redis/storage) before accepting traffic.

const startServer = async () => {
  try {
    // Verify core dependencies before we start listening.
    await verifyDbConnection();
    logger.info("PostgreSQL connection verified");

    await connectRedis();
    await verifyRedisConnection();
    logger.info("Redis connection verified");

    initStorage();
    logger.info("Storage subsystem initialized");

    const app = createApp();

    app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`, {
        env: config.nodeEnv
      });
    });
  } catch (err) {
    // Fail fast on startup issues. It's better to crash and let the process manager
    // restart us than to run in a half-broken state.
    const message = err instanceof Error ? err.message : "Unknown startup error";
    logger.error("Failed to start server", { message, err });
    process.exit(1);
  }
};

void startServer();

