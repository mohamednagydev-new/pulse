import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { signMedia, verifyMedia } from '../lib/mediaSign';
import {
  stravaEnabled, stravaAuthorizeUrl, stravaExchangeCode,
  fetchRecentActivities, fetchActivity, importActivity,
} from '../lib/strava';

export const wearablesRouter = Router();

/**
 * Wearables (Phase 2 of WEARABLES.md): Strava OAuth + webhook import.
 * The OAuth redirect can't carry a Bearer header, so /connect (authed) mints a
 * short-lived HMAC state carrying the userId, and /callback verifies it.
 */

const redirectUri = () => `${env.WEB_ORIGIN}/api/wearables/strava/callback`;

wearablesRouter.get('/status', requireAuth, async (req: AuthedRequest, res) => {
  const conns = await prisma.deviceConnection.findMany({
    where: { userId: req.userId! },
    select: { provider: true, lastSyncAt: true, createdAt: true },
  });
  const imported = await prisma.importedActivity.count({ where: { userId: req.userId! } });
  res.json({ strava: { enabled: stravaEnabled(), connected: conns.some((c) => c.provider === 'strava') }, connections: conns, imported });
});

wearablesRouter.get('/strava/connect', requireAuth, (req: AuthedRequest, res) => {
  if (!stravaEnabled()) return res.status(503).json({ error: 'Strava is not configured' });
  const { exp, sig } = signMedia('wearable', req.userId!, 900); // 15-minute state
  const state = `${req.userId!}.${exp}.${sig}`;
  res.json({ url: stravaAuthorizeUrl(state, redirectUri()) });
});

// OAuth return leg — browser navigation, no auth header; the state is the auth.
wearablesRouter.get('/strava/callback', async (req, res) => {
  const fail = () => res.redirect(`${env.WEB_ORIGIN}/info?wearable=error`);
  try {
    const [userId, expStr, sig] = String(req.query.state || '').split('.');
    if (!userId || !verifyMedia('wearable', userId, Number(expStr), sig || '')) return fail();
    const code = String(req.query.code || '');
    if (!code) return fail();

    const tok = await stravaExchangeCode(code);
    const conn = await prisma.deviceConnection.upsert({
      where: { userId_provider: { userId, provider: 'strava' } },
      create: {
        userId,
        provider: 'strava',
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(tok.expires_at * 1000),
        externalId: tok.athlete ? String(tok.athlete.id) : null,
      },
      update: {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(tok.expires_at * 1000),
        externalId: tok.athlete ? String(tok.athlete.id) : null,
      },
    });
    // First sync immediately so the connection feels alive.
    fetchRecentActivities(conn.id, 7)
      .then(async (acts) => {
        for (const a of acts) await importActivity(userId, a).catch(() => {});
        await prisma.deviceConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
      })
      .catch((e) => console.warn('[strava] first sync failed:', e?.message));
    res.redirect(`${env.WEB_ORIGIN}/info?wearable=connected`);
  } catch (e) {
    console.error('[strava] callback error', e);
    fail();
  }
});

/** Manual sync — also the dev-friendly path while no public webhook URL exists. */
wearablesRouter.post('/strava/sync', requireAuth, async (req: AuthedRequest, res) => {
  const conn = await prisma.deviceConnection.findUnique({
    where: { userId_provider: { userId: req.userId!, provider: 'strava' } },
  });
  if (!conn) return res.status(404).json({ error: 'Not connected' });
  try {
    const acts = await fetchRecentActivities(conn.id, 7);
    let added = 0;
    for (const a of acts) if (await importActivity(req.userId!, a).catch(() => false)) added++;
    await prisma.deviceConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
    res.json({ ok: true, added, checked: acts.length });
  } catch (e) {
    console.warn('[strava] sync failed:', (e as Error)?.message);
    res.status(502).json({ error: 'Strava sync failed — try again in a minute' });
  }
});

wearablesRouter.delete('/strava', requireAuth, async (req: AuthedRequest, res) => {
  await prisma.deviceConnection.deleteMany({ where: { userId: req.userId!, provider: 'strava' } });
  // ?purge=1 also removes the imported history (privacy: user's call, not ours).
  if (req.query.purge === '1') {
    await prisma.importedActivity.deleteMany({ where: { userId: req.userId!, provider: 'strava' } });
  }
  res.json({ ok: true });
});

/** Strava webhook. GET = subscription validation echo; POST = event push.
 *  Registration (one-time, after deploy):
 *  curl -X POST https://www.strava.com/api/v3/push_subscriptions \
 *    -F client_id=... -F client_secret=... \
 *    -F callback_url=https://<host>/api/wearables/strava/webhook \
 *    -F verify_token=$STRAVA_VERIFY_TOKEN */
wearablesRouter.get('/strava/webhook', (req, res) => {
  const token = process.env.STRAVA_VERIFY_TOKEN || 'pulse-strava';
  if (req.query['hub.verify_token'] !== token) return res.status(403).json({ error: 'bad verify token' });
  res.json({ 'hub.challenge': req.query['hub.challenge'] });
});

wearablesRouter.post('/strava/webhook', async (req, res) => {
  res.json({ ok: true }); // Strava wants a fast 200; process after replying
  try {
    const { object_type, aspect_type, object_id, owner_id } = req.body ?? {};
    if (object_type !== 'activity' || aspect_type !== 'create') return;
    const conn = await prisma.deviceConnection.findFirst({
      where: { provider: 'strava', externalId: String(owner_id) },
    });
    if (!conn) return;
    const activity = await fetchActivity(conn.id, String(object_id));
    await importActivity(conn.userId, activity);
    await prisma.deviceConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
  } catch (e) {
    console.warn('[strava] webhook processing failed:', (e as Error)?.message);
  }
});
