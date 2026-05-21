import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../env.js";

const secret = new TextEncoder().encode(ENV.SESSION_SECRET);
const COOKIE_NAME = "dungeons_session";
const SESSION_TTL_DAYS = 30;

export interface SessionPayload {
  uid: string;
  username: string;
}

export async function issueSession(res: Response, payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret);
  const isProd = ENV.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

async function readSession(req: Request): Promise<SessionPayload | null> {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret);
    if (typeof payload.uid !== "string" || typeof payload.username !== "string") {
      return null;
    }
    return { uid: payload.uid, username: payload.username };
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  req.session = (await readSession(req)) ?? undefined;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
