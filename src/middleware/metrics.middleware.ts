import { Request, Response, NextFunction } from "express";
import { recordRequest } from "../modules/monitor/metrics.service";

// Small middleware that measures end-to-end request latency and increments counters.
// This sits after morgan so both human-readable logs and metrics get the request.

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const elapsedMs = Number(end - start) / 1_000_000;
    const routeKey = `${req.method} ${req.baseUrl || ""}${req.route?.path || req.path}`;
    recordRequest(routeKey, elapsedMs);
  });

  next();
};

