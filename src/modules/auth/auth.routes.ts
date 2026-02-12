import { Router } from "express";
import { login, logout, me, refreshTokens, register } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

export const authRouter = Router();

// Registration and login are public.
authRouter.post("/register", register);
authRouter.post("/login", login);

// Token lifecycle.
authRouter.post("/refresh", refreshTokens);
authRouter.post("/logout", requireAuth, logout);

// Simple "who am I" endpoint.
authRouter.get("/me", requireAuth, me);

