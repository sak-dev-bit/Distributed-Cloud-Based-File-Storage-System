import { Router } from "express";
import { config } from "../config/env";
import { getMetricsSnapshot } from "../modules/monitor/metrics.service";

// Simple health endpoint. For now this only checks process-level signals.
// If you want deeper checks later (DB, Redis, S3), extend this route instead
// of creating yet another health variant.
export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const metrics = getMetricsSnapshot();

  res.status(200).json({
    status: "ok",
    env: config.nodeEnv,
    uptime: metrics.process.uptimeSec,
    requests: metrics.requests.total,
    errors: metrics.errors.total
  });
});

