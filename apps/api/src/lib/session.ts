import { Response } from 'express';
import { prisma } from './prisma';
import { signAccessToken, generateRefreshToken } from './auth';
import { env } from '../env';

export function publicUser(u: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isCoach?: boolean;
  coachVerified?: boolean;
  preferredLang?: string;
}) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
    isCoach: u.isCoach ?? false,
    coachVerified: u.coachVerified ?? false,
    preferredLang: u.preferredLang ?? 'ar',
  };
}

export function setRefreshCookie(res: Response, raw: string, remember = true) {
  res.cookie('refreshToken', raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/auth',
    // "Remember me" off → session cookie that clears when the browser closes.
    ...(remember ? { maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 } : {}),
  });
}

/** Issue an access token + a rotated refresh token. The refresh token is
 *  ALWAYS set as the httpOnly cookie (web transport); the raw value is also
 *  returned so native clients (`x-client: native`, where WKWebView/ITP make the
 *  cross-site cookie unreliable) can receive it in the JSON body instead.
 *  Storage/rotation is identical for both transports. */
export async function issueTokensEx(
  res: Response,
  user: { id: string; role: string },
  remember = true,
): Promise<{ accessToken: string; refreshToken: string }> {
  const access = signAccessToken({ sub: user.id, role: user.role });
  const { raw, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000),
    },
  });
  setRefreshCookie(res, raw, remember);
  return { accessToken: access, refreshToken: raw };
}

export async function issueTokens(res: Response, user: { id: string; role: string }, remember = true) {
  return (await issueTokensEx(res, user, remember)).accessToken;
}
