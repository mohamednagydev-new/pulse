import { Router } from 'express';
import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const pub = process.env.VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
let vapidReady = false;
if (pub && priv) {
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@fitit.app', pub, priv);
    vapidReady = true;
  } catch (err) {
    // Bad keys must never crash the server — just leave push disabled.
    console.warn('[push] VAPID keys invalid, push notifications disabled:', (err as Error).message);
  }
}

export const pushRouter = Router();

export function pushEnabled() {
  return vapidReady;
}

pushRouter.get('/key', (_req, res) => res.json({ key: vapidReady ? pub : null }));

pushRouter.post('/subscribe', requireAuth, async (req: AuthedRequest, res) => {
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: req.userId! },
  });
  res.json({ ok: true });
});

/** Fire a push to one user (used by reminders/challenges). Also persists an in-app
 *  notification so users without push still see it in the notifications center.
 *  Pass titleAr/bodyAr and the user's preferredLang picks the copy. */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; url?: string; type?: string; titleAr?: string; bodyAr?: string },
) {
  let { title, body } = payload;
  if (payload.titleAr || payload.bodyAr) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true } }).catch(() => null);
    if (u?.preferredLang === 'ar') {
      title = payload.titleAr ?? title;
      body = payload.bodyAr ?? body;
    }
  }
  await prisma.notification
    .create({ data: { userId, type: payload.type ?? 'general', title, body, url: payload.url } })
    .catch(() => {});
  if (!pushEnabled()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url: payload.url }),
        )
        .catch(async (err: any) => {
          if (err?.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: s.id } });
        }),
    ),
  );
}
