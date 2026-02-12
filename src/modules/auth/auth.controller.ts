import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById } from "../users/user.model";
import { generateTokenPair, isRefreshTokenActive, revokeRefreshToken, blacklistAccessToken } from "./token.service";
import { verifyRefreshToken } from "../../config/jwt";
import { config } from "../../config/env";

const saltRounds = 10;

const isValidEmail = (email: string): boolean => {
  // Simple but practical email validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: { message: "Email and password are required" } });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: { message: "Invalid email format" } });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: { message: "Email is already registered" } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await createUser({ email, passwordHash, name });

    const tokens = await generateTokenPair({ userId: user.id, role: user.role });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: { message: "Email and password are required" } });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Intentionally vague to avoid leaking which emails exist.
      res.status(401).json({ error: { message: "Invalid credentials" } });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: { message: "Invalid credentials" } });
      return;
    }

    const tokens = await generateTokenPair({ userId: user.id, role: user.role });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens
    });
  } catch (err) {
    next(err);
  }
};

export const refreshTokens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      res.status(400).json({ error: { message: "Refresh token is required" } });
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: { message: "Refresh token expired" } });
        return;
      }
      res.status(401).json({ error: { message: "Invalid refresh token" } });
      return;
    }

    if (decoded.type !== "refresh") {
      res.status(401).json({ error: { message: "Invalid token type" } });
      return;
    }

    const active = await isRefreshTokenActive(decoded.jti);
    if (!active) {
      res.status(401).json({ error: { message: "Refresh token has been revoked" } });
      return;
    }

    const user = await findUserById(decoded.sub);
    if (!user) {
      res.status(401).json({ error: { message: "User no longer exists" } });
      return;
    }

    // Rotate refresh token: revoke old one and issue a new pair.
    await revokeRefreshToken(decoded.jti);
    const tokens = await generateTokenPair({ userId: user.id, role: user.role });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tokens
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    // We treat logout as best-effort: even if tokens are already invalid,
    // the client gets a 204 response.

    // Revoke refresh token if provided.
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.type === "refresh") {
          await revokeRefreshToken(decoded.jti);
        }
      } catch {
        // Ignore invalid/expired refresh token on logout.
      }
    }

    // Blacklist the current access token via req.user if available.
    if (req.user) {
      const tokenId = req.user.tokenId;
      // TTL is approximate; if you want it exact, you can decode the JWT exp claim.
      const ttlSeconds = Math.max(60, parseInt(config.jwt.accessExpiry, 10) || 900);
      await blacklistAccessToken(tokenId, ttlSeconds);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { message: "Authentication required" } });
    return;
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    res.status(401).json({ error: { message: "User no longer exists" } });
    return;
  }

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
};

