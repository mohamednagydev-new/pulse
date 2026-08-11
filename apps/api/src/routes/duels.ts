import { Router } from 'express';
import { z } from 'zod';
import type { BuddyChallenge } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { areConnected, awardXp, levelForXp } from '../lib/social';
import { notifyUser } from './push';
import { emitToUser } from '../lib/realtime';

export const duelsRouter = Router();
duelsRouter.use(requireAuth);

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;
const METRIC_LABEL: Record<string, string> = { workouts: 'most workouts', xp: 'most XP' };
const METRIC_LABEL_AR: Record<string, string> = { workouts: 'أكتر تمارين', xp: 'أكتر XP' };

/** Progress for one side of a duel within its window.
 *  workouts = lesson completions + guided sessions; xp excludes duel transfers
 *  (else winning one duel would snowball into concurrent ones). */
async function scoreFor(userId: string, metric: string, from: Date, to: Date): Promise<number> {
  if (metric === 'workouts') {
    const [lessons, sessions] = await Promise.all([
      prisma.lessonCompletion.count({ where: { userId, completedAt: { gte: from, lte: to } } }),
      prisma.xpEvent.count({ where: { userId, reason: 'workout-session', createdAt: { gte: from, lte: to } } }),
    ]);
    return lessons + sessions;
  }
  const agg = await prisma.xpEvent.aggregate({
    where: { userId, createdAt: { gte: from, lte: to }, OR: [{ reason: null }, { reason: { notIn: ['duel_win', 'duel_loss'] } }] },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Settle any active duel whose window ended: decide winner, move the wager, notify.
 *  The claim is atomic (status guard in the WHERE), so concurrent fetches settle once. */
async function settleIfDue(duel: BuddyChallenge): Promise<BuddyChallenge> {
  if (duel.status !== 'active' || !duel.endsAt || !duel.startsAt || duel.endsAt > new Date()) return duel;

  // Atomic claim — only one caller wins the right to settle.
  const claimed = await prisma.buddyChallenge.updateMany({
    where: { id: duel.id, status: 'active' },
    data: { status: 'finished' },
  });
  if (claimed.count !== 1) {
    return (await prisma.buddyChallenge.findUnique({ where: { id: duel.id } })) ?? duel;
  }

  const [a, b] = await Promise.all([
    scoreFor(duel.challengerId, duel.metric, duel.startsAt, duel.endsAt),
    scoreFor(duel.opponentId, duel.metric, duel.startsAt, duel.endsAt),
  ]);
  const winnerId = a > b ? duel.challengerId : b > a ? duel.opponentId : null;
  const updated = await prisma.buddyChallenge.update({ where: { id: duel.id }, data: { winnerId } });

  const [challenger, opponent] = await Promise.all([
    prisma.user.findUnique({ where: { id: duel.challengerId }, select: { firstName: true } }),
    prisma.user.findUnique({ where: { id: duel.opponentId }, select: { firstName: true } }),
  ]);
  if (winnerId) {
    const loserId = winnerId === duel.challengerId ? duel.opponentId : duel.challengerId;
    const winnerName = winnerId === duel.challengerId ? challenger?.firstName : opponent?.firstName;
    if (duel.wagerXp > 0) {
      // Transfer, not mint: loser pays what they actually have (floored at 0),
      // winner receives exactly that, and both sides hit the XP ledger.
      const loser = await prisma.user.findUnique({ where: { id: loserId }, select: { xp: true } });
      const paid = Math.min(duel.wagerXp, Math.max(0, loser?.xp ?? 0));
      if (paid > 0) {
        const newXp = (loser?.xp ?? 0) - paid;
        await prisma.user.update({ where: { id: loserId }, data: { xp: newXp, level: levelForXp(newXp) } });
        await prisma.xpEvent.create({ data: { userId: loserId, amount: -paid, reason: 'duel_loss' } });
        await awardXp(winnerId, paid, 'duel_win');
      }
    }
    const score = a > b ? `${a}–${b}` : `${b}–${a}`;
    emitToUser(winnerId, 'notify', { type: 'duel' });
    notifyUser(winnerId, {
      title: 'Duel won! 🏆',
      titleAr: 'كسبت التحدي! 🏆',
      body: `You beat your buddy ${score}${duel.wagerXp ? ` and won ${duel.wagerXp} XP` : ''}!`,
      bodyAr: `كسبت صاحبك ${score}${duel.wagerXp ? ` وخدت ${duel.wagerXp} XP` : ''}!`,
      url: '/buddies',
      type: 'general',
    });
    emitToUser(loserId, 'notify', { type: 'duel' });
    notifyUser(loserId, {
      title: 'Duel finished',
      titleAr: 'التحدي خلص',
      body: `${winnerName ?? 'Your buddy'} took this one${duel.wagerXp ? ` (+${duel.wagerXp} XP to them)` : ''}. Rematch? 😤`,
      bodyAr: `${winnerName ?? 'صاحبك'} خدها المرة دي${duel.wagerXp ? ` (+${duel.wagerXp} XP ليه)` : ''}. نعيدها؟ 😤`,
      url: '/buddies',
      type: 'general',
    });
  } else {
    for (const uid of [duel.challengerId, duel.opponentId]) {
      emitToUser(uid, 'notify', { type: 'duel' });
      notifyUser(uid, {
        title: "It's a draw 🤝",
        titleAr: 'تعادل 🤝',
        body: `You tied ${a}–${b}. Settle it with a rematch!`,
        bodyAr: `اتعادلتوا ${a}–${b}. اعيدوها واحسموها!`,
        url: '/buddies',
        type: 'general',
      });
    }
  }
  return updated;
}

// ---- Create a duel ----
duelsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      opponentId: z.string().min(1),
      metric: z.enum(['workouts', 'xp']),
      durationDays: z.union([z.literal(3), z.literal(7), z.literal(14)]),
      wagerXp: z.union([z.literal(0), z.literal(50), z.literal(100)]),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Pick an opponent, metric, duration and wager' });
  const { opponentId, metric, durationDays, wagerXp } = parsed.data;
  if (opponentId === req.userId) return res.status(400).json({ error: "You can't duel yourself" });
  if (!(await areConnected(req.userId!, opponentId))) return res.status(403).json({ error: 'Connect with this buddy first' });

  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true, xp: true } });
  if (wagerXp > 0 && (me?.xp ?? 0) < wagerXp) return res.status(400).json({ error: `You need ${wagerXp} XP to stake` });

  const existing = await prisma.buddyChallenge.findFirst({
    where: {
      status: { in: ['pending', 'active'] },
      OR: [
        { challengerId: req.userId!, opponentId },
        { challengerId: opponentId, opponentId: req.userId! },
      ],
    },
  });
  if (existing) return res.status(409).json({ error: 'You already have a duel with this buddy' });

  const duel = await prisma.buddyChallenge.create({
    data: { challengerId: req.userId!, opponentId, metric, durationDays, wagerXp },
  });
  emitToUser(opponentId, 'notify', { type: 'duel' });
  notifyUser(opponentId, {
    title: 'Duel challenge! ⚔️',
    titleAr: 'تحدي جديد! ⚔️',
    body: `${me?.firstName ?? 'A buddy'} challenges you: ${METRIC_LABEL[metric]} in ${durationDays} days${wagerXp ? ` — ${wagerXp} XP on the line` : ''}!`,
    bodyAr: `${me?.firstName ?? 'صاحبك'} بيتحداك: ${METRIC_LABEL_AR[metric]} خلال ${durationDays} يوم${wagerXp ? ` — على ${wagerXp} XP` : ''}!`,
    url: '/buddies',
    type: 'general',
  });
  res.status(201).json(duel);
});

// ---- Rematch a finished duel ----
// Same opponent, same terms, one tap — losers want revenge and winners want to
// prove it wasn't luck; both are retention.
duelsRouter.post('/:id/rematch', async (req: AuthedRequest, res) => {
  const old = await prisma.buddyChallenge.findUnique({ where: { id: req.params.id } });
  if (!old || old.status !== 'finished' || (old.challengerId !== req.userId && old.opponentId !== req.userId)) {
    return res.status(404).json({ error: 'No finished duel to rematch' });
  }
  const opponentId = old.challengerId === req.userId ? old.opponentId : old.challengerId;
  if (!(await areConnected(req.userId!, opponentId))) return res.status(403).json({ error: 'Connect with this buddy first' });

  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true, xp: true } });
  if (old.wagerXp > 0 && (me?.xp ?? 0) < old.wagerXp) {
    return res.status(400).json({ error: `You need ${old.wagerXp} XP to stake` });
  }
  const existing = await prisma.buddyChallenge.findFirst({
    where: {
      status: { in: ['pending', 'active'] },
      OR: [
        { challengerId: req.userId!, opponentId },
        { challengerId: opponentId, opponentId: req.userId! },
      ],
    },
  });
  if (existing) return res.status(409).json({ error: 'You already have a duel with this buddy' });

  const duel = await prisma.buddyChallenge.create({
    data: { challengerId: req.userId!, opponentId, metric: old.metric, durationDays: old.durationDays, wagerXp: old.wagerXp },
  });
  emitToUser(opponentId, 'notify', { type: 'duel' });
  notifyUser(opponentId, {
    title: 'Rematch! ⚔️',
    titleAr: 'العودة! ⚔️',
    body: `${me?.firstName ?? 'Your buddy'} wants a rematch — same terms. Accept?`,
    bodyAr: `${me?.firstName ?? 'صاحبك'} عايز يعيدها — نفس الشروط. قابل؟`,
    url: '/buddies',
    type: 'general',
  });
  res.status(201).json(duel);
});

// ---- Accept / decline ----
duelsRouter.post('/:id/accept', async (req: AuthedRequest, res) => {
  const duel = await prisma.buddyChallenge.findUnique({ where: { id: req.params.id } });
  if (!duel || duel.opponentId !== req.userId || duel.status !== 'pending') {
    return res.status(404).json({ error: 'No pending duel' });
  }
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true, xp: true } });
  if (duel.wagerXp > 0 && (me?.xp ?? 0) < duel.wagerXp) {
    return res.status(400).json({ error: `You need ${duel.wagerXp} XP to accept this stake` });
  }
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + duel.durationDays * 86400000);
  const updated = await prisma.buddyChallenge.update({ where: { id: duel.id }, data: { status: 'active', startsAt, endsAt } });
  emitToUser(duel.challengerId, 'notify', { type: 'duel' });
  notifyUser(duel.challengerId, {
    title: 'Duel accepted! ⚔️',
    titleAr: 'التحدي اتقبل! ⚔️',
    body: `${me?.firstName ?? 'Your buddy'} is in — ${METRIC_LABEL[duel.metric]} over ${duel.durationDays} days. Go!`,
    bodyAr: `${me?.firstName ?? 'صاحبك'} وافق — ${METRIC_LABEL_AR[duel.metric]} خلال ${duel.durationDays} يوم. يلا بينا!`,
    url: '/buddies',
    type: 'general',
  });
  res.json(updated);
});

duelsRouter.post('/:id/decline', async (req: AuthedRequest, res) => {
  const duel = await prisma.buddyChallenge.findUnique({ where: { id: req.params.id } });
  if (!duel || duel.opponentId !== req.userId || duel.status !== 'pending') {
    return res.status(404).json({ error: 'No pending duel' });
  }
  await prisma.buddyChallenge.update({ where: { id: duel.id }, data: { status: 'declined' } });
  res.json({ ok: true });
});

// ---- Cancel my own outgoing pending challenge ----
duelsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const gone = await prisma.buddyChallenge.deleteMany({
    where: { id: req.params.id, challengerId: req.userId!, status: 'pending' },
  });
  if (!gone.count) return res.status(404).json({ error: 'No pending challenge to cancel' });
  res.json({ ok: true });
});

// ---- My duels (settles any that ended — lazy settlement, no cron needed) ----
duelsRouter.get('/', async (req: AuthedRequest, res) => {
  // Ignored challenges auto-expire after 72h so the pair can duel again.
  await prisma.buddyChallenge.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: new Date(Date.now() - 72 * 3600 * 1000) },
      OR: [{ challengerId: req.userId! }, { opponentId: req.userId! }],
    },
    data: { status: 'declined' },
  });
  const mine = await prisma.buddyChallenge.findMany({
    where: { OR: [{ challengerId: req.userId! }, { opponentId: req.userId! }], status: { in: ['pending', 'active', 'finished'] } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  const settled = await Promise.all(mine.map(settleIfDue));

  const ids = [...new Set(settled.flatMap((d) => [d.challengerId, d.opponentId]))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
  const umap = new Map(users.map((u) => [u.id, u]));

  const now = new Date();
  const shaped = await Promise.all(
    settled.map(async (d) => {
      let myScore = 0;
      let theirScore = 0;
      if (d.status === 'active' && d.startsAt && d.endsAt) {
        const to = now < d.endsAt ? now : d.endsAt;
        const [a, b] = await Promise.all([
          scoreFor(d.challengerId, d.metric, d.startsAt, to),
          scoreFor(d.opponentId, d.metric, d.startsAt, to),
        ]);
        [myScore, theirScore] = d.challengerId === req.userId ? [a, b] : [b, a];
      }
      const otherId = d.challengerId === req.userId ? d.opponentId : d.challengerId;
      return {
        id: d.id,
        metric: d.metric,
        durationDays: d.durationDays,
        wagerXp: d.wagerXp,
        status: d.status,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        iChallenged: d.challengerId === req.userId,
        other: umap.get(otherId) ?? null,
        myScore,
        theirScore,
        iWon: d.status === 'finished' ? (d.winnerId === null ? null : d.winnerId === req.userId) : undefined,
      };
    }),
  );

  res.json({
    incoming: shaped.filter((d) => d.status === 'pending' && !d.iChallenged),
    outgoing: shaped.filter((d) => d.status === 'pending' && d.iChallenged),
    active: shaped.filter((d) => d.status === 'active'),
    finished: shaped.filter((d) => d.status === 'finished').slice(0, 5),
  });
});
