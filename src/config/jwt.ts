import jwt from "jsonwebtoken";
import { config } from "./env";

export type UserRole = "user" | "admin";

export interface JwtPayloadBase {
  sub: string; // subject (user id)
  role: UserRole;
  jti: string; // token id for blacklisting
  type: "access" | "refresh";
}

export const signAccessToken = (payload: Omit<JwtPayloadBase, "type">): string => {
  return jwt.sign({ ...payload, type: "access" }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
    jwtid: payload.jti
  });
};

export const verifyAccessToken = (token: string): JwtPayloadBase => {
  const decoded = jwt.verify(token, config.jwt.accessSecret);
  return decoded as JwtPayloadBase;
};

export const signRefreshToken = (payload: Omit<JwtPayloadBase, "type">): string => {
  return jwt.sign({ ...payload, type: "refresh" }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
    jwtid: payload.jti
  });
};

export const verifyRefreshToken = (token: string): JwtPayloadBase => {
  const decoded = jwt.verify(token, config.jwt.refreshSecret);
  return decoded as JwtPayloadBase;
};


