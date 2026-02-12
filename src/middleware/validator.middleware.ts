import { Request, Response, NextFunction } from "express";

// Lightweight validation helpers. These are intentionally small and local,
// not a full validation framework.

export const requireBodyFields =
  (fields: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((field) => !(field in (req.body || {})));
    if (missing.length > 0) {
      res.status(400).json({
        error: {
          message: `Missing required fields: ${missing.join(", ")}`
        }
      });
      return;
    }
    next();
  };

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateUuidParam =
  (paramName: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({
        error: {
          message: `Invalid ${paramName} parameter`
        }
      });
      return;
    }
    next();
  };

