import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, hashRefreshToken } from '../lib/auth';
import { issueTokens, publicUser } from '../lib/session';
import { sendMail } from '../lib/mailer';
import { notifyUser } from './push';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export const authRouter = Router();

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  mobile: z.string().optional(),
  zip: z.string().optional(),
  ref: z.string().max(16).optional(), // referral code from an invite link
});

const MAX_FREEZES = 3;

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, ref, ...rest } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const referrer = ref
    ? await prisma.user.findUnique({ where: { referralCode: ref.toUpperCase() }, select: { id: true, firstName: true, streakFreezes: true, currentStreak: true, level: true } })
    : null;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      // The UI language the device signed up in — pushes and reminders follow it.
      preferredLang: req.headers['x-lang'] === 'en' ? 'en' : 'ar',
      ...rest,
      ...(referrer ? { referredById: referrer.id, streakFreezes: 2 } : {}), // invited users start with an extra freeze
    },
  });

  if (referrer) {
    // Reward the referrer: +1 streak freeze (capped) + a notification.
    await prisma.user.update({
      where: { id: referrer.id },
      data: { streakFreezes: Math.min(MAX_FREEZES, referrer.streakFreezes + 1) },
    });
    notifyUser(referrer.id, {
      title: 'Your invite worked! 🎉',
      titleAr: 'دعوتك نجحت! 🎉',
      body: `${user.firstName} joined PULSE through your link — you earned a streak freeze 🧊`,
      bodyAr: `${user.firstName} انضم لـ PULSE من اللينك بتاعك — كسبت فريز للسلسلة 🧊`,
      url: '/buddies',
      type: 'general',
    });
    // The referral badge used to wait for the referrer's next workout
    // (checkBadges only ran from touchStreak) — award it at the moment it's earned.
    const { checkBadges } = await import('../lib/gamify');
    checkBadges(referrer.id, referrer.currentStreak, referrer.level).catch(() => {});
  }

  const accessToken = await issueTokens(res, user);
  res.json({ accessToken, user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string(), remember: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const accessToken = await issueTokens(res, user, parsed.data.remember ?? true);
  res.json({ accessToken, user: publicUser(user) });
});

authRouter.post('/forgot-password', async (req, res) => {
  // Always respond the same way so we never reveal whether an email is registered.
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(rawToken), expiresAt },
    });

    const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
    const link = `${origin}/reset-password?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your PULSE password',
      text: `We received a request to reset your password.\n\nOpen this link to set a new password (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
          <h2 style="margin:0 0 12px">Reset your password</h2>
          <p style="margin:0 0 16px;color:#4b5563">We received a request to reset the password for your PULSE account. This link is valid for 1 hour.</p>
          <p style="margin:0 0 24px">
            <a href="${link}" style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600">Set a new password</a>
          </p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:13px"><a href="${link}">${link}</a></p>
          <p style="margin:0;color:#9ca3af;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });
  }

  res.json({ ok: true });
});

authRouter.post('/reset-password', async (req, res) => {
  const parsed = z
    .object({ token: z.string().min(1), password: z.string().min(6) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  res.json({ ok: true });
});

authRouter.post('/refresh', async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });
  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(raw) },
    include: { user: true },
  });
  if (!token || token.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token expired' });
  }
  // rotate: delete old, issue new (deleteMany is idempotent under concurrent refreshes)
  await prisma.refreshToken.deleteMany({ where: { id: token.id } });
  const accessToken = await issueTokens(res, token.user);
  res.json({ accessToken, user: publicUser(token.user) });
});

authRouter.post('/logout', async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (raw) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashRefreshToken(raw) } });
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ ok: true });
});
