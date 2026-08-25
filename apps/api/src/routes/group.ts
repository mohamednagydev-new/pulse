import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { parseArray } from '../lib/json';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { emitToUser } from '../lib/realtime';
import { notifyUser } from './push';

export const groupRouter = Router();
groupRouter.use(requireAuth);

const pubUser = {
  id: true, firstName: true, lastName: true, avatarUrl: true,
  isCoach: true, coachVerified: true,
} as const;

/** Attach coach, participantCount and isJoined to a list of sessions. */
async function shape(sessions: { id: string; coachUserId: string }[], meId: string) {
  const coaches = await prisma.user.findMany({ where: { id: { in: sessions.map((s) => s.coachUserId) } }, select: pubUser });
  const coachMap = new Map(coaches.map((c) => [c.id, c]));
  const counts = await prisma.groupParticipant.groupBy({ by: ['sessionId'], where: { sessionId: { in: sessions.map((s) => s.id) } }, _count: true });
  const countMap = new Map(counts.map((c) => [c.sessionId, c._count]));
  const mine = await prisma.groupParticipant.findMany({ where: { userId: meId, sessionId: { in: sessions.map((s) => s.id) } }, select: { sessionId: true } });
  const joinedSet = new Set(mine.map((m) => m.sessionId));
  return sessions.map((s) => ({
    ...s,
    coach: coachMap.get(s.coachUserId) ?? null,
    participantCount: countMap.get(s.id) ?? 0,
    isJoined: joinedSet.has(s.id),
  }));
}

// ---- Create ----
groupRouter.post('/', async (req: AuthedRequest, res) => {
  // Open to everyone — training together is a community feature, not a coach
  // perk. The creator becomes the session host (timer/video controls). A cap
  // on upcoming sessions keeps the schedule from being spammed.
  const upcoming = await prisma.groupSession.count({
    where: { coachUserId: req.userId!, scheduledAt: { gte: new Date() } },
  });
  if (upcoming >= 5) return res.status(429).json({ error: 'You already have 5 upcoming sessions — run those first 💪' });
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    instructions: z.string().max(4000).optional(),
    muscleFocus: z.string().optional(),
    coachWorkoutId: z.string().optional(),
    scheduledAt: z.string().min(1),
    streamUrl: z.string().trim().max(300).optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Add a title and a scheduled time' });
  const scheduledAt = new Date(p.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ error: 'Invalid scheduled time' });
  // Live stream embeds are a coach/admin feature (flagship classes) — and only
  // YouTube/Facebook, so a room can never frame an arbitrary site.
  let streamUrl: string | null = null;
  if (p.data.streamUrl) {
    if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)\//i.test(p.data.streamUrl)) {
      return res.status(400).json({ error: 'Stream link must be a YouTube or Facebook URL', errorAr: 'لينك البث لازم يكون يوتيوب أو فيسبوك' });
    }
    const creator = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isCoach: true, role: true } });
    if (creator?.isCoach || creator?.role === 'ADMIN') streamUrl = p.data.streamUrl;
  }
  const session = await prisma.groupSession.create({
    data: {
      coachUserId: req.userId!,
      title: p.data.title,
      description: p.data.description,
      instructions: p.data.instructions,
      muscleFocus: p.data.muscleFocus,
      coachWorkoutId: p.data.coachWorkoutId,
      streamUrl,
      scheduledAt,
    },
  });
  res.status(201).json(session);
});

/** Next flagship LIVE class (has a stream) inside 7 days — the Home countdown. */
groupRouter.get('/next-live', async (req: AuthedRequest, res) => {
  const s = await prisma.groupSession.findFirst({
    where: {
      streamUrl: { not: null },
      scheduledAt: { gte: new Date(Date.now() - 90 * 60 * 1000), lte: new Date(Date.now() + 7 * 86400000) },
    },
    orderBy: { scheduledAt: 'asc' },
    select: { id: true, title: true, scheduledAt: true, muscleFocus: true },
  });
  res.json({ session: s });
});

// ---- Upcoming ----
groupRouter.get('/upcoming', async (req: AuthedRequest, res) => {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const sessions = await prisma.groupSession.findMany({
    where: { scheduledAt: { gte: since } },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  });
  res.json(await shape(sessions, req.userId!));
});

// ---- Mine (created or joined) ----
groupRouter.get('/mine', async (req: AuthedRequest, res) => {
  const joined = await prisma.groupParticipant.findMany({ where: { userId: req.userId! }, select: { sessionId: true } });
  const sessions = await prisma.groupSession.findMany({
    where: { OR: [{ coachUserId: req.userId! }, { id: { in: joined.map((j) => j.sessionId) } }] },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(await shape(sessions, req.userId!));
});

// ---- One session ----
groupRouter.get('/:id', async (req: AuthedRequest, res) => {
  const session = await prisma.groupSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  const coach = await prisma.user.findUnique({ where: { id: session.coachUserId }, select: pubUser });
  const rows = await prisma.groupParticipant.findMany({ where: { sessionId: session.id }, orderBy: { joinedAt: 'asc' } });
  const participants = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: pubUser });
  const isJoined = rows.some((r) => r.userId === req.userId);
  let coachWorkout = null;
  if (session.coachWorkoutId) {
    const w = await prisma.coachWorkout.findUnique({ where: { id: session.coachWorkoutId } });
    if (w) coachWorkout = { ...w, exercises: parseArray(w.exercises) }; // one bad row must not 500 the room for everyone
  }
  res.json({ ...session, coach, participants, participantCount: rows.length, isJoined, coachWorkout });
});

// ---- Join ----
groupRouter.post('/:id/join', async (req: AuthedRequest, res) => {
  const session = await prisma.groupSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.groupParticipant.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: req.userId! } },
    create: { sessionId: session.id, userId: req.userId! },
    update: {},
  });
  emitToUser(session.coachUserId, 'notify', { type: 'group-join' });
  // Persistent too — a socket emit alone evaporates if the coach is offline.
  const joiner = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  notifyUser(session.coachUserId, {
    title: 'New participant 🙌',
    titleAr: 'مشارك جديد 🙌',
    body: `${joiner?.firstName ?? 'Someone'} joined "${session.title}"`,
    bodyAr: `${joiner?.firstName ?? 'حد'} انضم لـ"${session.title}"`,
    url: `/group/${session.id}`,
    type: 'general',
  }).catch(() => {});
  res.json(row);
});

// ---- Leave ----
groupRouter.post('/:id/leave', async (req: AuthedRequest, res) => {
  await prisma.groupParticipant.deleteMany({ where: { sessionId: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

// ---- Delete (owner only) ----
groupRouter.delete('/:id', async (req: AuthedRequest, res) => {
  await prisma.groupSession.deleteMany({ where: { id: req.params.id, coachUserId: req.userId! } });
  res.json({ ok: true });
});
