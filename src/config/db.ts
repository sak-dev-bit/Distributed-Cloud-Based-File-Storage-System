import { Pool } from "pg";
import { config } from "./env";

// Singleton Postgres connection pool for the whole app.
// For a real production deployment you'd also add better logging and metrics here.
export const dbPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 10, // keep it modest; can tune based on actual workload
  idleTimeoutMillis: 30_000
});

// Simple helper to verify connectivity on startup.
export const verifyDbConnection = async (): Promise<void> => {
  const client = await dbPool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
};

