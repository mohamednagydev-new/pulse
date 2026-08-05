import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth';

export interface AuthedRequest extends Request {
  userId?: string;
  role?: string;
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
      req.role = payload.role;
    } catch {
      /* ignore — treated as anonymous */
    }
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  next();
}
