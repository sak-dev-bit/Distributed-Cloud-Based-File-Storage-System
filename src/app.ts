import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { healthRouter } from "./routes/health";
import { gatewayRouter } from "./modules/gateway/gateway.routes";
import { monitorRouter } from "./modules/monitor/monitor.routes";
import { errorHandler } from "./middleware/errorHandler";
import { metricsMiddleware } from "./middleware/metrics.middleware";
import { sanitizeInput } from "./middleware/security.middleware";

// This file wires up the Express app with middleware and routes.
// Keep it lean: if something grows complicated, move it into its own module
// instead of turning app.ts into a dumping ground.

export const createApp = () => {
  const app = express();

  // Basic hardening and CORS. Adjust origins when you know your frontend hosts.
  app.use(helmet());
  app.use(
    cors({
      origin: "*"
    })
  );

  // Basic input sanitization to strip control characters and tidy strings.
  app.use(sanitizeInput);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // HTTP request logging for local debugging. In production, pipe this to a real log sink.
  app.use(morgan("dev"));

  // Basic metrics: request counts and latency.
  app.use(metricsMiddleware);

  // Routes
  app.use("/api", healthRouter);
  app.use("/api/monitor", monitorRouter);
  app.use("/api", gatewayRouter);

  // Centralized error handler should be the last middleware.
  app.use(errorHandler);

  return app;
};

