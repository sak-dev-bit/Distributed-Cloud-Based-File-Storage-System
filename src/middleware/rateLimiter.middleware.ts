import { Request, Response, NextFunction } from "express";

// Very simple in-memory rate limiter.
// This is fine for a single-instance prototype; in real production you'd want
// a shared store like Redis. The goal here is to keep the logic readable.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // per IP per route per window

const getKey = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  // We separate per path to avoid one noisy endpoint blocking everything.
  return `${ip}:${req.baseUrl}${req.path}`;
};

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const key = getKey(req);
  const now = Date.now();

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    res.status(429).json({
      error: {
        message: "Too many requests, please try again later."
      }
    });
    return;
  }

  bucket.count += 1;
  next();
};

