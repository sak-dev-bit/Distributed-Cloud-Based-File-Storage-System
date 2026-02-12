import { Request, Response, NextFunction } from "express";

// Very lightweight input sanitization. The goal is to strip obviously dangerous
// characters and keep payloads tidy, not to mutate data beyond recognition.

const sanitizeString = (value: string): string => {
  // Trim whitespace and drop control characters.
  return value
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "");
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = sanitizeValue(v);
    }
    return obj;
  }
  return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query) as any;
  }
  if (req.params) {
    req.params = sanitizeValue(req.params) as any;
  }
  next();
};

