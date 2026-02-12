import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { recordError } from "../modules/monitor/metrics.service";

// Basic shape for operational errors. For now we keep it simple and avoid
// building a full error hierarchy until the project actually needs it.
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Express error-handling middleware (has 4 args by design).
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  recordError(status);

  logger.error(err.message, {
    statusCode: status,
    stack: err.stack
  });

  // Expose minimal details to the client.
  res.status(status).json({
    error: {
      message: status === 500 ? "Internal server error" : err.message
    }
  });
};

