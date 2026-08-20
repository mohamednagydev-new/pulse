import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { audit } from '../lib/audit';

export const adminIntegrityRouter = Router();
adminIntegrityRouter.use(requireAuth, requireAdmin);

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  currentStreak: true,
  xp: true,
  bannedAt: true,
} as const;

/**
 * The integrity queue. Every IntegrityEvent is a rejected fake-progress
 * attempt (the guard already blocked it) — this endpoint surfaces who keeps
 * hammering the guards, plus an XP-velocity anomaly check.
 */
adminIntegrityRouter.get('/', async (_req: AuthedRequest, res) => {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // -- Repeat offenders: most guard trips in the last 30 days --
  const grouped = await prisma.integrityEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: since30d } },
    _count: { _all: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 50,
  });
  const offenderIds = grouped.map((g) => g.userId);
  const [offenderEvents, offenderUsers] = await Promise.all([
    prisma.integrityEvent.findMany({
      where: { userId: { in: offenderIds }, createdAt: { gte: since30d } },
      select: { userId: true, kind: true },
    }),
    prisma.user.findMany({ where: { id: { in: offenderIds } }, select: userSelect }),
  ]);
  const kindsByUser = new Map<string, Record<string, number>>();
  for (const e of offenderEvents) {
    const k = kindsByUser.get(e.userId) ?? {};
    k[e.kind] = (k[e.kind] ?? 0) + 1;
    kindsByUser.set(e.userId, k);
  }
  const usersById = new Map(offenderUsers.map((u) => [u.id, u]));
  const offenders = grouped.map((g) => ({
    userId: g.userId,
    total: g._count._all,
    kinds: kindsByUser.get(g.userId) ?? {},
    user: usersById.get(g.userId) ?? null,
  }));

  // -- Recent events, newest first --
  const recentRows = await prisma.integrityEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const recentUserIds = Array.from(new Set(recentRows.map((e) => e.userId)));
  const recentUsers = await prisma.user.findMany({
    where: { id: { in: recentUserIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const recentUsersById = new Map(recentUsers.map((u) => [u.id, u]));
  const recent = recentRows.map((e) => ({
    id: e.id,
    userId: e.userId,
    kind: e.kind,
    detail: e.detail,
    createdAt: e.createdAt,
    user: recentUsersById.get(e.userId) ?? null,
  }));

  // -- XP spikes: more than 600 XP gained in the last 24h is not human --
  const XP_SPIKE_THRESHOLD = 600;
  const xpGrouped = await prisma.xpEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: since24h } },
    _sum: { amount: true },
  });
  const spikes = xpGrouped
    .filter((g) => (g._sum.amount ?? 0) > XP_SPIKE_THRESHOLD)
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, 20);
  const spikeUsers = await prisma.user.findMany({
    where: { id: { in: spikes.map((s) => s.userId) } },
    select: userSelect,
  });
  const spikeUsersById = new Map(spikeUsers.map((u) => [u.id, u]));
  const xpSpikes = spikes.map((s) => ({
    userId: s.userId,
    xp24h: s._sum.amount ?? 0,
    user: spikeUsersById.get(s.userId) ?? null,
  }));

  res.json({ offenders, recent, xpSpikes });
});

/** "Reviewed, they're fine" — wipe a user's integrity events (audited). */
adminIntegrityRouter.post('/clear/:userId', async (req: AuthedRequest, res) => {
  const userId = req.params.userId;
  const { count } = await prisma.integrityEvent.deleteMany({ where: { userId } });
  audit(req.userId!, 'integrity.clear', { targetType: 'user', targetId: userId });
  res.json({ ok: true, deleted: count });
});
