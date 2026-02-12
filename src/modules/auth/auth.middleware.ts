import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken, JwtPayloadBase } from "../../config/jwt";
import { isAccessTokenBlacklisted } from "./token.service";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: JwtPayloadBase["role"];
      tokenId: string;
    };
  }
}

const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token;
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      res.status(401).json({ error: { message: "Missing authentication token" } });
      return;
    }

    let decoded: JwtPayloadBase;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: { message: "Access token expired" } });
        return;
      }
      res.status(401).json({ error: { message: "Invalid access token" } });
      return;
    }

    if (decoded.type !== "access") {
      res.status(401).json({ error: { message: "Invalid token type" } });
      return;
    }

    const blacklisted = await isAccessTokenBlacklisted(decoded.jti);
    if (blacklisted) {
      res.status(401).json({ error: { message: "Token has been revoked" } });
      return;
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      tokenId: decoded.jti
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: { message: "Admin role required" } });
    return;
  }

  next();
};

