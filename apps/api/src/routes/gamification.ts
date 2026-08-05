import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { localizeResponse } from '../lib/localize';
import { emitToChallenge } from '../lib/realtime';
import { aiEnabled, chatComplete } from '../lib/openai';
import { currentStandings, leagueHistory } from '../lib/leagues';

export const gamificationRouter = Router();
gamificationRouter.use(requireAuth, localizeResponse);

const chatUserSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;

gamificationRouter.get('/badges', async (req: AuthedRequest, res) => {
  const [all, mine] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId: req.userId! } }),
  ]);
  const earned = new Set(mine.map((b) => b.badgeId));
  res.json({
    badges: all.map((b) => ({ ...b, earned: earned.has(b.id) })),
    earnedCount: mine.length,
  });
});

gamificationRouter.get('/challenges', async (req: AuthedRequest, res) => {
  const mine = await prisma.challengeParticipant.findMany({ where: { userId: req.userId! } });
  const joinedIds = mine.map((m) => m.challengeId);
  // Public challenges + any personal/group ones I created or joined.
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { kind: 'global' },
        { ownerId: req.userId! },
        { id: { in: joinedIds } },
      ],
    },
    include: { _count: { select: { participants: true } } },
  });
  const joined = new Map(mine.map((m) => [m.challengeId, m]));
  res.json(
    challenges.map((c) => ({
      ...c,
      joined: joined.has(c.id),
      myProgress: joined.get(c.id)?.progress ?? 0,
      completedAt: joined.get(c.id)?.completedAt ?? null,
      participantCount: c._count.participants,
      isMine: c.ownerId === req.userId,
    })),
  );
});

/** Create a personal (just me) or group (invite friends) challenge. */
gamificationRouter.post('/challenges', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      kind: z.enum(['personal', 'group']),
      title: z.string().min(1).max(80),
      goalType: z.enum(['lessons', 'streak', 'calories', 'water', 'lifts', 'reels', 'xp']),
      goalValue: z.number().int().min(1).max(100000),
      durationDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)]),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Add a title, goal and duration' });
  const { kind, title, goalType, goalValue, durationDays } = parsed.data;

  const active = await prisma.challenge.count({ where: { ownerId: req.userId!, endsOn: { gte: new Date().toISOString().slice(0, 10) } } });
  if (active >= 5) return res.status(429).json({ error: 'You already have 5 active challenges' });

  const startsOn = new Date().toISOString().slice(0, 10);
  const endsOn = new Date(Date.now() + durationDays * 86400000).toISOString().slice(0, 10);
  const inviteCode = kind === 'group' ? Math.random().toString(36).slice(2, 8).toUpperCase() : null;

  const challenge = await prisma.challenge.create({
    data: { kind, title, goalType, goalValue, startsOn, endsOn, ownerId: req.userId!, inviteCode },
  });
  // The creator always participates.
  await prisma.challengeParticipant.create({ data: { challengeId: challenge.id, userId: req.userId! } });
  res.status(201).json(challenge);
});

/** Join a group challenge by its share code. */
gamificationRouter.post('/challenges/join-code', async (req: AuthedRequest, res) => {
  const parsed = z.object({ code: z.string().min(4).max(12) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid code' });
  const challenge = await prisma.challenge.findUnique({ where: { inviteCode: parsed.data.code.toUpperCase() } });
  if (!challenge) return res.status(404).json({ error: 'No challenge with that code' });
  if (challenge.endsOn < new Date().toISOString().slice(0, 10)) return res.status(410).json({ error: 'This challenge has ended' });
  await prisma.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: challenge.id, userId: req.userId! } },
    create: { challengeId: challenge.id, userId: req.userId! },
    update: {},
  });
  res.json(challenge);
});

/** Delete my own personal/group challenge. */
gamificationRouter.delete('/challenges/:id', async (req: AuthedRequest, res) => {
  const challenge = await prisma.challenge.findFirst({ where: { id: req.params.id, ownerId: req.userId! } });
  if (!challenge) return res.status(404).json({ error: 'Not found' });
  await prisma.challengeParticipant.deleteMany({ where: { challengeId: challenge.id } });
  await prisma.challengeMessage.deleteMany({ where: { challengeId: challenge.id } });
  await prisma.challenge.delete({ where: { id: challenge.id } });
  res.json({ ok: true });
});

gamificationRouter.post('/challenges/:id/join', async (req: AuthedRequest, res) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
  if (!challenge) return res.status(404).json({ error: 'Not found' });
  // Personal challenges are private to their owner.
  if (challenge.kind === 'personal' && challenge.ownerId !== req.userId) {
    return res.status(403).json({ error: 'This challenge is private' });
  }
  const p = await prisma.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: req.params.id, userId: req.userId! } },
    create: { challengeId: req.params.id, userId: req.userId! },
    update: {},
  });
  res.json(p);
});

gamificationRouter.get('/challenges/:id/leaderboard', async (req, res) => {
  const rows = await prisma.challengeParticipant.findMany({
    where: { challengeId: req.params.id },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { progress: 'desc' },
    take: 50,
  });
  res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      name: `${r.user.firstName} ${r.user.lastName}`,
      avatarUrl: r.user.avatarUrl,
      progress: r.progress,
    })),
  );
});

// ---- Challenge chat room ----
gamificationRouter.get('/challenges/:id/detail', async (req, res) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { participants: true } } },
  });
  if (!challenge) return res.status(404).json({ error: 'Not found' });
  res.json(challenge);
});

gamificationRouter.get('/challenges/:id/messages', async (req, res) => {
  const messages = await prisma.challengeMessage.findMany({
    where: { challengeId: req.params.id },
    include: { user: { select: chatUserSelect } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  res.json(messages);
});

gamificationRouter.post('/challenges/:id/messages', async (req: AuthedRequest, res) => {
  const parsed = z.object({ text: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const message = await prisma.challengeMessage.create({
    data: { challengeId: req.params.id, userId: req.userId!, text: parsed.data.text },
    include: { user: { select: chatUserSelect } },
  });
  emitToChallenge(req.params.id, 'challenge:msg', message);

  // "@coach ..." triggers an AI reply posted into the room
  if (parsed.data.text.trim().toLowerCase().startsWith('@coach') && aiEnabled()) {
    const question = parsed.data.text.replace(/@coach/i, '').trim();
    chatComplete(
      [
        { role: 'system', content: 'You are the PULSE Coach in a group challenge chat. Be brief, motivating and practical.' },
        { role: 'user', content: question },
      ],
      { temperature: 0.6 },
    )
      .then(async (answer) => {
        const coachMsg = await prisma.challengeMessage.create({
          data: { challengeId: req.params.id, isCoach: true, text: answer },
          include: { user: { select: chatUserSelect } },
        });
        emitToChallenge(req.params.id, 'challenge:msg', coachMsg);
      })
      .catch(() => {});
  }

  res.status(201).json(message);
});

/* ---------------------------------- Leagues ---------------------------------- */

/** This week's room, live-ranked, plus the tier ladder for the header. */
gamificationRouter.get('/league', async (req: AuthedRequest, res) => {
  const standings = await currentStandings(req.userId!);
  if (!standings) return res.status(500).json({ error: 'Could not load your league' });
  res.json(standings);
});

/** Past weeks — how far you climbed and where you slipped. */
gamificationRouter.get('/league/history', async (req: AuthedRequest, res) => {
  res.json(await leagueHistory(req.userId!));
});
