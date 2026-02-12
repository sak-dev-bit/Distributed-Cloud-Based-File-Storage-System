import { randomUUID } from "crypto";
import { redisClient } from "../../config/redis";
import { signAccessToken, signRefreshToken, JwtPayloadBase, UserRole } from "../../config/jwt";

// Keys:
// - Access token blacklist: blacklist:access:<jti> -> "1" (TTL = token remaining lifetime)
// - Refresh token allowlist: refresh:<jti> -> userId (TTL = refresh token lifetime)

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateTokenPair = async (params: {
  userId: string;
  role: UserRole;
}): Promise<AuthTokenPair> => {
  const jti = randomUUID();
  const basePayload: Omit<JwtPayloadBase, "type"> = {
    sub: params.userId,
    role: params.role,
    jti
  };

  const accessToken = signAccessToken(basePayload);
  const refreshToken = signRefreshToken(basePayload);

  // Store refresh token id in Redis so we can revoke it later.
  // We don't care about the value, only that the key exists.
  await redisClient.set(`refresh:${jti}`, params.userId);

  return { accessToken, refreshToken };
};

export const blacklistAccessToken = async (jti: string, ttlSeconds: number): Promise<void> => {
  if (!jti) return;
  await redisClient.setEx(`blacklist:access:${jti}`, ttlSeconds, "1");
};

export const isAccessTokenBlacklisted = async (jti: string): Promise<boolean> => {
  if (!jti) return false;
  const exists = await redisClient.exists(`blacklist:access:${jti}`);
  return exists === 1;
};

export const revokeRefreshToken = async (jti: string): Promise<void> => {
  if (!jti) return;
  await redisClient.del(`refresh:${jti}`);
};

export const isRefreshTokenActive = async (jti: string): Promise<boolean> => {
  if (!jti) return false;
  const exists = await redisClient.exists(`refresh:${jti}`);
  return exists === 1;
};

