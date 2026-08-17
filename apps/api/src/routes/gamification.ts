import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { localizeResponse } from '../lib/localize';
import { emitToChallenge } from '../lib/realtime';
import { aiEnabled, chatComplete } from '../lib/openai';
import { currentStandings, leagueHistory } from '../lib/leagues';
import { dayString } from '../lib/time';

export const gamificationRouter = Router();
gamificationRouter.use(requireAuth, localizeResponse);

const chatUserSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;

/**
 * Personal and group challenges are private rooms: only the owner and joined
 * participants may read the detail/leaderboard/chat. Global challenges are
 * readable by any signed-in user. Returns the challenge when allowed, null when
 * missing, and false when forbidden.
 */
async function challengeForViewer(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { _count: { select: { participants: true } } },
  });
  if (!challenge) return null;
  if (challenge.kind === 'global' || challenge.ownerId === userId) return challenge;
  const member = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  return member ? challenge : false;
}

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
  // Public challenges in their live window + any I created or joined.
  // Global challenges staged for future waves (or already ended) stay hidden
  // until their startsOn/endsOn window — unless I'm already a participant.
  const today = dayString();
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { kind: 'global', startsOn: { lte: today }, endsOn: { gte: today } },
        { ownerId: req.userId! },
        { id: { in: joinedIds } },
      ],
    },
    include: { _count: { select: { participants: true } } },
    orderBy: { startsOn: 'desc' },
    take: 200,
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
      // 'walk' — low-pressure walking challenges; advanced by POST /api/social/walks
      // and wearable walk imports (lib/walks.ts), not by gym workouts.
      goalType: z.enum(['lessons', 'streak', 'calories', 'water', 'lifts', 'reels', 'xp', 'walk']),
      goalValue: z.number().int().min(1).max(100000),
      durationDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)]),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Add a title, goal and duration' });
  const { kind, title, goalType, goalValue, durationDays } = parsed.data;

  const active = await prisma.challenge.count({ where: { ownerId: req.userId!, endsOn: { gte: dayString() } } });
  if (active >= 5) return res.status(429).json({ error: 'You already have 5 active challenges' });

  const startsOn = dayString();
  const endsOn = dayString(new Date(Date.now() + durationDays * 86400000));
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
  if (challenge.endsOn < dayString()) return res.status(410).json({ error: 'This challenge has ended' });
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

// Leave a challenge — joining was permanent before; a mistaken join dragged a
// dead 0/N progress bar in "Mine" forever.
gamificationRouter.post('/challenges/:id/leave', async (req: AuthedRequest, res) => {
  await prisma.challengeParticipant.deleteMany({ where: { challengeId: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

gamificationRouter.post('/challenges/:id/join', async (req: AuthedRequest, res) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
  if (!challenge) return res.status(404).json({ error: 'Not found' });
  // Personal challenges are private to their owner.
  if (challenge.kind === 'personal' && challenge.ownerId !== req.userId) {
    return res.status(403).json({ error: 'This challenge is private' });
  }
  // Same window rule as join-by-code: an ended challenge is history, not joinable.
  if (challenge.endsOn < dayString()) return res.status(410).json({ error: 'This challenge has ended' });
  const p = await prisma.challengeParticipant.upsert({
    where: { challengeId_userId: { challengeId: req.params.id, userId: req.userId! } },
    create: { challengeId: req.params.id, userId: req.userId! },
    update: {},
  });
  res.json(p);
});

gamificationRouter.get('/challenges/:id/leaderboard', async (req: AuthedRequest, res) => {
  const challenge = await challengeForViewer(req.params.id, req.userId!);
  if (challenge === null) return res.status(404).json({ error: 'Not found' });
  if (challenge === false) return res.status(403).json({ error: 'This challenge is private' });
  const rows = await prisma.challengeParticipant.findMany({
    where: { challengeId: req.params.id },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { progress: 'desc' },
    take: 50,
  });
  res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: `${r.user.firstName} ${r.user.lastName}`,
      avatarUrl: r.user.avatarUrl,
      progress: r.progress,
    })),
  );
});

// ---- Challenge chat room ----
gamificationRouter.get('/challenges/:id/detail', async (req: AuthedRequest, res) => {
  const challenge = await challengeForViewer(req.params.id, req.userId!);
  if (challenge === null) return res.status(404).json({ error: 'Not found' });
  if (challenge === false) return res.status(403).json({ error: 'This challenge is private' });
  // Joined-state + own progress ride along so the room can show an overview
  // instead of dropping people straight into a bare chat.
  const mine = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: req.params.id, userId: req.userId! } },
  });
  const { _count, ...c } = challenge as any;
  res.json({
    ...c,
    joined: !!mine,
    myProgress: mine?.progress ?? 0,
    completedAt: mine?.completedAt ?? null,
    participantCount: _count?.participants ?? 0,
  });
});

gamificationRouter.get('/challenges/:id/messages', async (req: AuthedRequest, res) => {
  const challenge = await challengeForViewer(req.params.id, req.userId!);
  if (challenge === null) return res.status(404).json({ error: 'Not found' });
  if (challenge === false) return res.status(403).json({ error: 'This challenge is private' });
  const messages = await prisma.challengeMessage.findMany({
    where: { challengeId: req.params.id },
    include: { user: { select: chatUserSelect } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  res.json(messages);
});

gamificationRouter.post('/challenges/:id/messages', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      text: z.string().max(1000).default(''),
      // Proof check-ins: media uploaded via /api/social/upload, flagged as
      // evidence. Counted in the winner audit.
      mediaType: z.enum(['image', 'video']).optional(),
      mediaUrl: z.string().max(500).optional(),
      isProof: z.boolean().optional(),
      /** Consent: cross-post this proof to the community feed (default yes). */
      shareToFeed: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const d = parsed.data;
  if (!d.text.trim() && !d.mediaUrl) return res.status(400).json({ error: 'Say something or attach a photo' });

  // Posting requires actually being in the challenge — join first, then chat.
  const member = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: req.params.id, userId: req.userId! } },
  });
  if (!member) return res.status(403).json({ error: 'Join the challenge to chat' });

  const message = await prisma.challengeMessage.create({
    data: {
      challengeId: req.params.id,
      userId: req.userId!,
      text: d.text.trim(),
      mediaType: d.mediaUrl ? d.mediaType : null,
      mediaUrl: d.mediaUrl || null,
      isProof: !!d.isProof && !!d.mediaUrl,
    },
    include: { user: { select: chatUserSelect } },
  });
  emitToChallenge(req.params.id, 'challenge:msg', message);

  // Proof check-ins in GLOBAL challenges cross-post to the community feed —
  // real people sweating is the best content this feed can carry. The user
  // consents via a checkbox on the proof composer (defaults to sharing).
  if (message.isProof && message.mediaUrl && d.shareToFeed !== false) {
    const ch = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      select: { kind: true, title: true, titleAr: true },
    });
    if (ch?.kind === 'global') {
      const { createFeedPost } = await import('../lib/social');
      createFeedPost(
        req.userId!,
        'proof',
        `📸 Workout proof — "${ch.title}" challenge${d.text.trim() ? `: ${d.text.trim()}` : ''}`,
        'challenge',
        req.params.id,
        { mediaType: message.mediaType ?? undefined, mediaUrl: message.mediaUrl, textAr: `📸 إثبات تمرين — تحدي «${ch.titleAr ?? ch.title}»${d.text.trim() ? `: ${d.text.trim()}` : ''}` },
      ).catch(() => {});
    }
  }

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

/* ------------------------------------------------------------------ *
 * Wall of Champions — finished prize challenges with their podiums.
 * Social proof that the prizes are real, and permanent fame for winners:
 * the strongest motivation for the NEXT challenge.
 * ------------------------------------------------------------------ */
gamificationRouter.get('/champions', async (_req: AuthedRequest, res) => {
  const { dayString } = await import('../lib/time');
  const done = await prisma.challenge.findMany({
    where: { kind: 'global', endsOn: { lt: dayString() }, prizeText: { not: null } },
    orderBy: { endsOn: 'desc' },
    take: 12,
    include: {
      participants: {
        orderBy: { progress: 'desc' },
        take: 3,
        where: { progress: { gt: 0 } },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } } },
      },
    },
  });
  const raffleIds = done.map((c) => c.raffleWinnerId).filter(Boolean) as string[];
  const raffleUsers = raffleIds.length
    ? await prisma.user.findMany({ where: { id: { in: raffleIds } }, select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } })
    : [];
  const raffleMap = new Map(raffleUsers.map((u) => [u.id, u]));
  res.json(
    done
      .filter((c) => c.participants.length > 0)
      .map((c) => ({
        id: c.id,
        title: c.title,
        titleAr: c.titleAr,
        endsOn: c.endsOn,
        prizeText: c.prizeText,
        prizeTextAr: c.prizeTextAr,
        coverImage: c.coverImage,
        podium: c.participants.map((p) => ({ user: p.user, progress: p.progress })),
        raffleWinner: c.raffleWinnerId ? raffleMap.get(c.raffleWinnerId) ?? null : null,
      })),
  );
});
