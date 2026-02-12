import { Router } from "express";
import { metricsHandler, healthSummaryHandler } from "./monitor.controller";

// Monitoring / dashboard-facing routes. These are read-only and can be wired
// behind auth or IP filters later if needed.

export const monitorRouter = Router();

monitorRouter.get("/metrics", metricsHandler);
monitorRouter.get("/health", healthSummaryHandler);

