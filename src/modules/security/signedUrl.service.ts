import crypto from "crypto";
import { config } from "../../config/env";

// HMAC-signed URLs for file access. The token encodes:
// - fileId
// - userId (who generated the link)
// - expiry timestamp (unix seconds)
//
// Token format (URL-safe base64): base64url("fileId:userId:exp:signatureHex")

interface SignedFileTokenPayload {
  fileId: string;
  userId: string;
  exp: number;
}

const toBase64Url = (input: string): string =>
  Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (input: string): string =>
  Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4),
    "base64"
  ).toString("utf8");

const signPayload = (payload: SignedFileTokenPayload): string => {
  const data = `${payload.fileId}:${payload.userId}:${payload.exp}`;
  const hmac = crypto.createHmac("sha256", config.fileLinks.signingSecret);
  hmac.update(data);
  const sig = hmac.digest("hex");
  return toBase64Url(`${data}:${sig}`);
};

const verifyAndDecode = (token: string): SignedFileTokenPayload | null => {
  try {
    const decoded = fromBase64Url(token);
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [fileId, userId, expStr, sig] = parts;
    const exp = parseInt(expStr, 10);
    if (!fileId || !userId || Number.isNaN(exp)) return null;

    const expectedData = `${fileId}:${userId}:${exp}`;
    const hmac = crypto.createHmac("sha256", config.fileLinks.signingSecret);
    hmac.update(expectedData);
    const expectedSig = hmac.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }

    if (exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { fileId, userId, exp };
  } catch {
    return null;
  }
};

export const generateSignedFileUrl = (params: {
  fileId: string;
  userId: string;
  baseUrl: string; // e.g. http://host/api/v1/files/:id/stream
  expiresInSeconds?: number;
}): { url: string; token: string; expiresAt: number } => {
  const exp = Math.floor(Date.now() / 1000) + (params.expiresInSeconds ?? config.fileLinks.defaultExpirySeconds);
  const payload: SignedFileTokenPayload = {
    fileId: params.fileId,
    userId: params.userId,
    exp
  };
  const token = signPayload(payload);

  const url = `${params.baseUrl}?token=${encodeURIComponent(token)}`;

  return {
    url,
    token,
    expiresAt: exp
  };
};

export const verifySignedFileToken = (
  token: string
): { valid: boolean; fileId?: string; userId?: string; expiresAt?: number } => {
  const payload = verifyAndDecode(token);
  if (!payload) return { valid: false };
  return {
    valid: true,
    fileId: payload.fileId,
    userId: payload.userId,
    expiresAt: payload.exp
  };
};

