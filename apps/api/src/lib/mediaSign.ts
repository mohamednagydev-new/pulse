import crypto from 'crypto';
import { env } from '../env';

// HMAC-signed, time-limited media URLs — lets <video>/<audio> load protected
// content without an auth header (the signature travels in the query string).
const SECRET = env.MEDIA_SIGN_SECRET;

export function signMedia(type: string, id: string, ttlSec = 6 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = crypto.createHmac('sha256', SECRET).update(`${type}:${id}:${exp}`).digest('hex');
  return { exp, sig };
}

export function verifyMedia(type: string, id: string, exp: number, sig: string): boolean {
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(`${type}:${id}:${exp}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
