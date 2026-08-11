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

/** Throttled last-seen: at most one DB write per user per 5 minutes, fired and
 *  forgotten — presence must never add latency or failure to a request. */
const seenAt = new Map<string, number>();
function touchLastSeen(userId: string) {
  const last = seenAt.get(userId) ?? 0;
  if (Date.now() - last < 5 * 60 * 1000) return;
  seenAt.set(userId, Date.now());
  if (seenAt.size > 10000) seenAt.clear(); // unbounded-map hygiene
  void import('../lib/prisma').then(({ prisma }) =>
    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {}),
  );
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.role = payload.role;
    touchLastSeen(payload.sub);
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
