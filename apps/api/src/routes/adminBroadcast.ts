import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth';
import { notifyUser } from './push';
import { sendMail } from '../lib/mailer';
import { audit } from '../lib/audit';

// Segment broadcast composer: admin picks an audience (same filter semantics as
// the Users table), writes one message, and fires it over push and/or email.
// Every send is capped, batched, logged to JobLog and the admin audit trail.
export const adminBroadcastRouter = Router();
adminBroadcastRouter.use(requireAuth, requireAdmin);

/** Hard ceiling on recipients per send — protects SMTP and the push endpoint. */
const MAX_RECIPIENTS = 5000;
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// Audience resolution — replicates userListWhere() in adminOps.ts for the
// role / inactive / segment filters. Broadcast NEVER targets banned users.
// ---------------------------------------------------------------------------

const audienceSchema = z.object({
  role: z.enum(['admin', 'user', 'coach', 'coach-pending']).optional(),
  inactive: z.coerce.number().int().min(1).max(365).optional(),
  segment: z.enum(['active1', 'active7', 'active30', 'daily', 'retained7', 'retained30', 'churned']).optional(),
});
type Audience = z.infer<typeof audienceSchema>;

function audienceWhere(a: Audience) {
  // Banned users are excluded unconditionally — you never broadcast to them.
  const and: any[] = [{ bannedAt: null }];

  if (a.role === 'admin') and.push({ role: 'ADMIN' });
  if (a.role === 'user') and.push({ role: 'USER' });
  if (a.role === 'coach') and.push({ isCoach: true });
  // "Coach requests": applied (isCoach) but not yet let into the directory.
  if (a.role === 'coach-pending') and.push({ isCoach: true, coachVerified: false });

  if (a.inactive) {
    const cutoff = new Date(Date.now() - a.inactive * 86400000);
    // Never seen (null) only counts as inactive when the account is older than the window.
    and.push({ OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, createdAt: { lt: cutoff } }] });
  }

  const segment = a.segment ?? '';
  if (segment === 'retained7' || segment === 'retained30') {
    // Retained: joined before the window AND seen inside it.
    const days = segment === 'retained7' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    and.push({ createdAt: { lt: cutoff }, lastSeenAt: { gte: cutoff } });
  } else if (segment === 'churned') {
    // Churned: joined 14+ days ago and quiet for 14+.
    const cutoff = new Date(Date.now() - 14 * 86400000);
    and.push({ createdAt: { lt: cutoff }, OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null }] });
  } else if (segment === 'active1' || segment === 'active7' || segment === 'active30') {
    // Currently-active users: opened the app inside the window.
    const days = segment === 'active1' ? 1 : segment === 'active7' ? 7 : 30;
    and.push({ lastSeenAt: { gte: new Date(Date.now() - days * 86400000) } });
  } else if (segment === 'daily') {
    // "Daily" = a live activity streak, not just opening the app.
    and.push({ currentStreak: { gte: 3 } });
  }

  return { AND: and };
}

/** POST /preview {role?, inactive?, segment?} → {count, emailableCount} */
adminBroadcastRouter.post('/preview', async (req, res) => {
  const parsed = audienceSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid audience filters' });
  const where = audienceWhere(parsed.data);
  const [count, emailableCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { AND: [where, { emailOptOut: false }] } }),
  ]);
  res.json({ count, emailableCount });
});

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

const sendSchema = audienceSchema.extend({
  channels: z.object({ push: z.boolean().optional(), email: z.boolean().optional() }),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
  url: z.string().trim().max(500).optional(),
  test: z.boolean().optional(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Minimal HTML email body: escaped text with line breaks, optional link. */
function emailHtml(body: string, url?: string): string {
  const text = escapeHtml(body).replace(/\n/g, '<br/>');
  const link = url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>` : '';
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${text}${link}</div>`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /send {channels:{push?,email?}, title, body, url?, role?, inactive?, segment?, test?}
 * test=true → sends only to the requesting admin. Otherwise resolves the
 * audience (≤5000, banned excluded), loops in batches of 100 with a small
 * pause between batches, never throws mid-loop.
 */
adminBroadcastRouter.post('/send', async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const { channels, title, body, url, test } = parsed.data;
  if (!channels.push && !channels.email) {
    return res.status(400).json({ error: 'Pick at least one channel (push or email)' });
  }

  // Test mode: hit only the requesting admin so they can see exactly what lands.
  if (test) {
    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true } });
    if (!me) return res.status(404).json({ error: 'User not found' });
    try {
      if (channels.push) {
        await notifyUser(req.userId!, { title, body, titleAr: title, bodyAr: body, url, type: 'general' });
      }
      if (channels.email) {
        await sendMail({ to: me.email, subject: title, html: emailHtml(body, url), text: body });
      }
    } catch {
      return res.status(500).json({ error: 'Test send failed' });
    }
    return res.json({ test: true, sent: 1 });
  }

  const users = await prisma.user.findMany({
    where: audienceWhere(parsed.data),
    select: { id: true, email: true, emailOptOut: true },
    take: MAX_RECIPIENTS,
  });

  let nPush = 0;
  let nEmail = 0;
  let nFail = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (u) => {
        if (channels.push) {
          try {
            // Same copy as titleAr/bodyAr so Arabic-preference users still get it.
            await notifyUser(u.id, { title, body, titleAr: title, bodyAr: body, url, type: 'general' });
            nPush++;
          } catch {
            nFail++;
          }
        }
        if (channels.email && !u.emailOptOut) {
          try {
            // sendMail never throws — it reports success in the result.
            const r = await sendMail({ to: u.email, subject: title, html: emailHtml(body, url), text: body });
            if (r.ok) nEmail++;
            else nFail++;
          } catch {
            nFail++;
          }
        }
      }),
    );
    // Breathe between batches so 5000 sends don't hammer SMTP / push in one burst.
    if (i + BATCH_SIZE < users.length) await sleep(BATCH_DELAY_MS);
  }

  const note = `push:${nPush} email:${nEmail} fail:${nFail} — "${title}"`;
  await prisma.jobLog.create({ data: { name: 'broadcast', ok: true, manual: true, note } }).catch(() => {});
  audit(req.userId!, 'broadcast.send', { targetType: 'broadcast', detail: note });

  // Owner's archive copy: every real broadcast lands in the owner's inbox too —
  // proof of what went out, when, and to how many.
  const copyTo = process.env.BROADCAST_COPY_TO ?? 'mohamed.nagy.dev@gmail.com';
  if (copyTo) {
    sendMail({
      to: copyTo,
      subject: `[COPY] ${title}`,
      html: `<p><i>Broadcast archive — audience ${users.length} (${note})</i></p><hr/>${emailHtml(body, url)}`,
      text: `Broadcast archive — audience ${users.length} (${note})\n\n${body}`,
    }).catch(() => {});
  }

  res.json({ audience: users.length, push: nPush, email: nEmail, failed: nFail });
});

/** GET /history → last 20 broadcast JobLog rows. */
adminBroadcastRouter.get('/history', async (_req, res) => {
  const rows = await prisma.jobLog.findMany({
    where: { name: 'broadcast' },
    orderBy: { ranAt: 'desc' },
    take: 20,
  });
  res.json(rows);
});
