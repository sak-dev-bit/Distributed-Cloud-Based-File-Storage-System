import { Router, Request, Response, NextFunction } from "express";
import { authRouter } from "../auth/auth.routes";
import { metadataRouter } from "../metadata/metadata.routes";
import { uploadRouter } from "../upload/upload.routes";
import { rateLimiter } from "../../middleware/rateLimiter.middleware";
import { validateUuidParam } from "../../middleware/validator.middleware";
import { requireAuth } from "../auth/auth.middleware";
import { streamFileToResponse } from "./proxy.service";
import { generateSignedFileUrl, verifySignedFileToken } from "../security/signedUrl.service";

// This router acts as the primary API gateway entrypoint.
// It wires versioned routes, auth-aware file streaming, rate limiting,
// and keeps cross-cutting concerns in one place.

export const gatewayRouter = Router();

// Apply a simple rate limiter to all gateway routes.
gatewayRouter.use(rateLimiter);

// Versioned API namespace: /api/v1/*
const v1 = Router();

// Compose existing routers under v1.
v1.use("/auth", authRouter);
v1.use("/metadata", metadataRouter);
v1.use("/upload", uploadRouter);

// File streaming endpoint: GET /api/v1/files/:id/stream
v1.get(
  "/files/:id/stream",
  requireAuth,
  validateUuidParam("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: { message: "Authentication required" } });
        return;
      }

      await streamFileToResponse({
        fileId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        res
      });
    } catch (err) {
      next(err);
    }
  }
);

// Generate a signed URL for file download: GET /api/v1/files/:id/url
v1.get(
  "/files/:id/url",
  requireAuth,
  validateUuidParam("id"),
  (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/api/v1/files/${req.params.id}/stream`;
    const { url, token, expiresAt } = generateSignedFileUrl({
      fileId: req.params.id,
      userId: req.user.id,
      baseUrl
    });

    res.status(200).json({
      url,
      token,
      expiresAt
    });
  }
);

// Public access via signed token only: GET /api/v1/files/:id/stream-signed?token=...
v1.get(
  "/files/:id/stream-signed",
  validateUuidParam("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.query.token as string | undefined;
      if (!token) {
        res.status(400).json({ error: { message: "Missing token query parameter" } });
        return;
      }

      const result = verifySignedFileToken(token);
      if (!result.valid || result.fileId !== req.params.id) {
        res.status(401).json({ error: { message: "Invalid or expired file token" } });
        return;
      }

      // For signed URLs we trust the token as proof of access; we don't require req.user.
      await streamFileToResponse({
        fileId: req.params.id,
        userId: result.userId || "",
        userRole: "user",
        res
      });
    } catch (err) {
      next(err);
    }
  }
);

// Simple normalized success wrapper for a ping-style check.
v1.get("/ping", (_req, res) => {
  res.status(200).json({
    data: { ok: true },
    meta: { version: "v1" }
  });
});

gatewayRouter.use("/v1", v1);

