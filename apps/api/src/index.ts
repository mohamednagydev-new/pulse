import express from 'express';
import 'express-async-errors'; // routes async errors to the central error handler instead of hanging requests
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './env';
import { prisma } from './lib/prisma';
import { initRealtime } from './lib/realtime';
import { startReminderScheduler } from './lib/reminders';
import { authRouter } from './routes/auth';
import { oauthRouter } from './routes/oauth';
import { meRouter } from './routes/me';
import { contentRouter } from './routes/content';
import { adminRouter } from './routes/admin';
import { mediaRouter } from './routes/media';
import { aiRouter } from './routes/ai';
import { trackerRouter } from './routes/tracker';
import { gamificationRouter } from './routes/gamification';
import { pushRouter } from './routes/push';
import { socialRouter } from './routes/social';
import { chatRouter } from './routes/chat';
import { musicRouter } from './routes/music';
import { coachRouter } from './routes/coach';
import { groupRouter } from './routes/group';
import { reelsRouter } from './routes/reels';
import { notificationsRouter } from './routes/notifications';
import { duelsRouter } from './routes/duels';
import { eventsRouter } from './routes/events';
import { adminReelsRouter } from './routes/adminReels';
import { storeRouter } from './routes/store';
import { dailyRouter } from './routes/daily';
import { boardRouter } from './routes/board';
import { pathRouter } from './routes/path';
import { mealsRouter } from './routes/meals';
import { venuesRouter } from './routes/venues';
import { supportRouter } from './routes/support';
import { partnerPortalRouter } from './routes/partnerPortal';
import { assessmentRouter } from './routes/assessment';
import { wearablesRouter } from './routes/wearables';
import { routinesRouter } from './routes/routines';
import { orgRouter } from './routes/org';
import { localizeResponse } from './lib/localize';
import { optionalAuth } from './middleware/auth';

// Never let a stray async error kill the server.
process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));

const app = express();
// Behind IIS/ARR in production: trust the first proxy hop so req.ip is the real
// client (correct per-user rate limiting) instead of everyone sharing the proxy IP.
app.set('trust proxy', 1);

// Security headers. CSP off — the API serves JSON and media, not HTML pages, and a
// default CSP would block cross-origin <video>/<img> loads from the web app.
// crossOriginResourcePolicy stays permissive for the same reason (media is consumed
// from the web origin, which differs from the API origin in dev).
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Health touches the DB — a green check with Prisma down is worse than no check.
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1;');
    res.json({ ok: true, ts: Date.now() });
  } catch {
    res.status(503).json({ ok: false, ts: Date.now() });
  }
});

// One-click unsubscribe from the weekly digest — arrives from an email link,
// so no login: the HMAC token is the authorization.
app.get('/api/unsubscribe', async (req, res) => {
  const { u, t } = req.query as { u?: string; t?: string };
  const { unsubToken } = await import('./lib/digest');
  if (!u || !t || t !== unsubToken(u)) return res.status(400).send('Invalid link');
  await prisma.user.updateMany({ where: { id: u }, data: { emailOptOut: true } });
  res.send(
    '<div style="font-family:sans-serif;text-align:center;padding:60px 20px"><h2>تم إلغاء الاشتراك ✓</h2><p>Unsubscribed — you will not receive these emails again.</p><a href="https://pulse.geddo.online" style="color:#f97316;font-weight:bold">pulse.geddo.online</a></div>',
  );
});

// Rate limits: throttle credential stuffing and unbounded (billable) AI calls.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const eventsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false });
// Forgot-password sends real email: without a limit it is an email-bombing tool
// that also burns the SMTP quota. Refresh is a DB hit per call.
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const refreshLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
// Uploads each spawn an ffmpeg transcode on the request path — cap the rate so a
// handful of clients cannot saturate the CPU.
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Public engagement counters feed partner billing (see PARTNER-RATE-CARD.md) —
// unlimited anonymous POSTs would let anyone inflate the numbers with a loop.
const counterLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/events', eventsLimiter);
app.use('/api/social/upload', uploadLimiter);
app.use('/api/admin/upload', uploadLimiter);
// Guest tickets are unauthenticated writes — keep the door open but narrow.
app.use('/api/support/guest', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false }));
// Writes only — GET lists/details must stay unthrottled for normal browsing.
const onPost = (limiter: ReturnType<typeof rateLimit>): express.RequestHandler =>
  (req, res, next) => (req.method === 'POST' ? limiter(req, res, next) : next());
app.use('/api/music', onPost(uploadLimiter));
app.use('/api/banners', onPost(counterLimiter));
app.use('/api/store', onPost(counterLimiter));
app.use('/api/board', onPost(counterLimiter));

/**
 * Localisation, once, before every router.
 *
 * This used to be attached to a few mounts and quietly relied on: `app.use('/api',
 * localizeResponse, contentRouter)` patches res.json for ANY /api request passing
 * through, and that patch leaked forward to every router mounted after it. Arabic on
 * /api/assessment and /api/support worked only by that accident, so reordering these
 * lines would have broken Arabic silently.
 *
 * Mounting it here makes order irrelevant. localize() is idempotent — it strips the
 * *Ar keys on the first pass, so routers that also declare it are harmless — and
 * /api/admin is skipped inside the middleware so editors still get raw rows.
 */
app.use('/api', localizeResponse);

app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);
app.use('/api/me', meRouter);
app.use('/api', contentRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tracker', trackerRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/push', pushRouter);
app.use('/api/social', socialRouter);
app.use('/api/chat', chatRouter);
app.use('/api/music', musicRouter);
app.use('/api/coach', coachRouter);
app.use('/api/group', groupRouter);
app.use('/api/reels', reelsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/duels', duelsRouter);
app.use('/api/events', eventsRouter);
// optionalAuth so countryForRequest can read the signed-in user's saved country —
// without it req.userId is always undefined here and geo scoping silently no-ops.
app.use('/api/store', optionalAuth, storeRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/board', boardRouter);
app.use('/api/path', pathRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/venues', optionalAuth, venuesRouter);
app.use('/api/support', supportRouter);
app.use('/api/partner-portal', partnerPortalRouter);
app.use('/api/assessment', assessmentRouter);
app.use('/api/wearables', wearablesRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/org', orgRouter);
app.use('/api/admin/reels', adminReelsRouter);
app.use('/api/admin', adminRouter);
app.use('/media', mediaRouter);

// Central error handler. 5xx details stay in the logs — clients get a generic
// message (raw Prisma/internal messages leak schema details).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status ?? 500;
  const message = status < 500 ? (err.message ?? 'Request failed') : 'Something went wrong';
  res.status(status).json({ error: message });
});

async function main() {
  // Improve SQLite concurrency for a read-heavy content app.
  try {
    // journal_mode returns a row, so use queryRaw (executeRaw rejects results on SQLite).
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
  } catch (e) {
    console.warn('PRAGMA setup skipped:', e);
  }
  const server = http.createServer(app);
  // Node's default keepAliveTimeout (5s) is shorter than IIS/ARR's idle reuse
  // window: Node closes the kept-alive socket just as ARR sends the next request
  // down it, which surfaces to users as random "network connection was lost" /
  // HTTP2_PROTOCOL_ERROR on requests that actually succeeded. Outlive the proxy.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  initRealtime(server, env.WEB_ORIGIN);
  startReminderScheduler();
  server.listen(env.PORT, () => {
    console.log(`PULSE API + realtime running on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown: stop accepting connections, then release the SQLite handle.
  const shutdown = () => {
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5000).unref(); // don't hang on open sockets
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
