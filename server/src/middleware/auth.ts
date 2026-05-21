import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: number;
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.token;
  if (!token) { res.status(401).json({ error: 'Not signed in' }); return; }
  try {
    // We always sign with a numeric `sub`, but @types/jsonwebtoken types it as
    // `string | undefined`, so the cast goes through `unknown` to satisfy TS.
    const decoded = jwt.verify(token, SECRET) as unknown as { sub: number };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}

export const cookieOptions = (isProd: boolean) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});
