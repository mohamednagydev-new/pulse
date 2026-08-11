import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { parseArray } from '../lib/json';
import { emitToUser } from '../lib/realtime';
import { notifyUser } from './push';
import { enrichExercises, userLimitations } from '../lib/enrich';
import { preferredGender } from '../lib/genderMedia';

export const coachRouter = Router();
coachRouter.use(requireAuth);

const pubUser = {
  id: true, firstName: true, lastName: true, avatarUrl: true, level: true,
  isCoach: true, coachVerified: true, coachHeadline: true,
} as const;

// ---- Coach-authored workouts ----
coachRouter.post('/workouts', async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!me?.isCoach) return res.status(403).json({ error: 'Coaches only' });
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    muscleFocus: z.string().optional(),
    // Path shapes from our own upload endpoints only — never a free string.
    coverImage: z.string().regex(/^images\/[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif)$/i).optional(),
    videoId: z.string().optional(),
    exercises: z.array(z.object({
      name: z.string().min(1),
      sets: z.string().optional(),
      reps: z.string().optional(),
      instructions: z.array(z.string()).optional(),
    })).min(1),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Add a title and at least one exercise' });
  if (p.data.videoId) {
    const vid = await prisma.video.findUnique({ where: { id: p.data.videoId }, select: { id: true } });
    if (!vid) return res.status(400).json({ error: 'Invalid video' });
  }
  const w = await prisma.coachWorkout.create({
    data: {
      coachUserId: req.userId!,
      title: p.data.title,
      description: p.data.description,
      muscleFocus: p.data.muscleFocus,
      coverImage: p.data.coverImage,
      videoId: p.data.videoId,
      exercises: JSON.stringify(p.data.exercises),
    },
  });
  res.status(201).json(w);
});

coachRouter.get('/:userId/workouts', async (req, res) => {
  const list = await prisma.coachWorkout.findMany({ where: { coachUserId: req.params.userId }, orderBy: { createdAt: 'desc' } });
  res.json(list.map((w) => ({ ...w, exercises: parseArray(w.exercises) })));
});

coachRouter.get('/workouts/:id', async (req: AuthedRequest, res) => {
  const w = await prisma.coachWorkout.findUnique({ where: { id: req.params.id } });
  if (!w) return res.status(404).json({ error: 'Not found' });

  // Coaches type exercise names freely, so match them to the library on the way out:
  // that is what gives a coach's session the same form demos and injury flags a
  // muscle-group session already had.
  const [gender, limitations] = await Promise.all([
    preferredGender(req.userId),
    userLimitations(req.userId),
  ]);
  const exercises = await enrichExercises(parseArray(w.exercises), gender, limitations);

  res.json({ ...w, exercises });
});

coachRouter.delete('/workouts/:id', async (req: AuthedRequest, res) => {
  await prisma.coachWorkout.deleteMany({ where: { id: req.params.id, coachUserId: req.userId! } });
  res.json({ ok: true });
});

// ---- Coach multi-day programs ----
coachRouter.post('/programs', async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!me?.isCoach) return res.status(403).json({ error: 'Coaches only' });
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    coverImage: z.string().optional(),
    days: z.array(z.object({ label: z.string().min(1), workoutId: z.string().min(1) })).min(1),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Add a title and at least one day with a workout' });
  const prog = await prisma.coachProgram.create({
    data: { coachUserId: req.userId!, title: p.data.title, description: p.data.description, coverImage: p.data.coverImage, days: JSON.stringify(p.data.days) },
  });
  res.status(201).json(prog);
});

coachRouter.get('/:userId/programs', async (req, res) => {
  const list = await prisma.coachProgram.findMany({ where: { coachUserId: req.params.userId }, orderBy: { createdAt: 'desc' } });
  res.json(list.map((p) => ({ ...p, days: parseArray(p.days) })));
});

coachRouter.get('/programs/:id', async (req: AuthedRequest, res) => {
  const prog = await prisma.coachProgram.findUnique({ where: { id: req.params.id } });
  if (!prog) return res.status(404).json({ error: 'Not found' });
  const days = parseArray(prog.days) as { label: string; workoutId: string }[];
  const workouts = await prisma.coachWorkout.findMany({ where: { id: { in: days.map((d) => d.workoutId) } } });
  const wmap = new Map(workouts.map((w) => [w.id, w]));
  // The viewer's own progress rides along — the page can finally remember
  // which day you're on instead of looking unstarted forever.
  const enrollment = await prisma.coachProgramEnrollment.findUnique({
    where: { userId_programId: { userId: req.userId!, programId: prog.id } },
  });
  res.json({
    ...prog,
    days: days.map((d) => ({ ...d, workout: wmap.get(d.workoutId) ? { id: d.workoutId, title: wmap.get(d.workoutId)!.title, muscleFocus: wmap.get(d.workoutId)!.muscleFocus } : null })),
    completedDays: enrollment ? parseArray(enrollment.completedDays) : [],
    enrolled: Boolean(enrollment),
  });
});

// Enroll (idempotent) — creates the memory the detail page reads back.
coachRouter.post('/programs/:id/enroll', async (req: AuthedRequest, res) => {
  const prog = await prisma.coachProgram.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!prog) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.coachProgramEnrollment.upsert({
    where: { userId_programId: { userId: req.userId!, programId: prog.id } },
    create: { userId: req.userId!, programId: prog.id },
    update: {},
  });
  res.json({ ok: true, completedDays: parseArray(row.completedDays) });
});

// Toggle a day done/undone.
coachRouter.post('/programs/:id/day-done', async (req: AuthedRequest, res) => {
  const parsed = z.object({ day: z.number().int().min(0).max(365), done: z.boolean().default(true) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const row = await prisma.coachProgramEnrollment.upsert({
    where: { userId_programId: { userId: req.userId!, programId: req.params.id } },
    create: { userId: req.userId!, programId: req.params.id },
    update: {},
  });
  const set = new Set(parseArray(row.completedDays) as number[]);
  if (parsed.data.done) set.add(parsed.data.day);
  else set.delete(parsed.data.day);
  const completedDays = Array.from(set).sort((a, b) => a - b);
  await prisma.coachProgramEnrollment.update({
    where: { id: row.id },
    data: { completedDays: JSON.stringify(completedDays) },
  });
  res.json({ ok: true, completedDays });
});

coachRouter.delete('/programs/:id', async (req: AuthedRequest, res) => {
  await prisma.coachProgram.deleteMany({ where: { id: req.params.id, coachUserId: req.userId! } });
  res.json({ ok: true });
});

// ---- Coaching requests / clients ----
coachRouter.post('/:userId/request', async (req: AuthedRequest, res) => {
  if (req.params.userId === req.userId) return res.status(400).json({ error: "Can't request yourself" });
  // coachUserId is a plain string column with no FK — without this check the row
  // can point at a deleted user or someone who never became a coach.
  const target = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { isCoach: true } });
  if (!target?.isCoach) return res.status(404).json({ error: 'Coach not found' });
  const row = await prisma.coachRequest.upsert({
    where: { clientId_coachUserId: { clientId: req.userId!, coachUserId: req.params.userId } },
    create: { clientId: req.userId!, coachUserId: req.params.userId, message: req.body?.message },
    update: { status: 'pending' },
  });
  emitToUser(req.params.userId, 'notify', { type: 'coach-request' });
  notifyUser(req.params.userId, { title: 'New coaching request', titleAr: 'طلب تدريب جديد', body: 'A member wants your coaching', bodyAr: 'في عضو عايزك تدربه', url: '/coach-dashboard' });
  res.json(row);
});

coachRouter.get('/requests', async (req: AuthedRequest, res) => {
  const reqs = await prisma.coachRequest.findMany({ where: { coachUserId: req.userId!, status: 'pending' }, orderBy: { createdAt: 'desc' } });
  const clients = await prisma.user.findMany({ where: { id: { in: reqs.map((r) => r.clientId) } }, select: pubUser });
  const map = new Map(clients.map((c) => [c.id, c]));
  res.json(reqs.map((r) => ({ ...r, client: map.get(r.clientId) })));
});

coachRouter.post('/requests/:id/:action', async (req: AuthedRequest, res) => {
  const status = req.params.action === 'accept' ? 'accepted' : 'declined';
  const row = await prisma.coachRequest.findFirst({ where: { id: req.params.id, coachUserId: req.userId! } });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await prisma.coachRequest.update({ where: { id: row.id }, data: { status } });
  if (status === 'accepted') {
    // Coaching without a channel is a brochure: acceptance auto-connects the
    // pair so DMs (and voice notes) open immediately for both sides.
    const existing = await prisma.connection.findFirst({
      where: { OR: [
        { requesterId: req.userId!, addresseeId: row.clientId },
        { requesterId: row.clientId, addresseeId: req.userId! },
      ] },
    });
    if (existing) {
      if (existing.status !== 'accepted') {
        await prisma.connection.update({ where: { id: existing.id }, data: { status: 'accepted' } });
      }
    } else {
      await prisma.connection.create({ data: { requesterId: req.userId!, addresseeId: row.clientId, status: 'accepted' } });
    }
  }
  emitToUser(row.clientId, 'notify', { type: `coach-${status}` });
  notifyUser(row.clientId, {
    title: `Coaching ${status}`,
    titleAr: status === 'accepted' ? 'طلب التدريب اتقبل 🎉' : 'طلب التدريب اترفض',
    body: status === 'accepted' ? 'Your coach accepted you — you can chat now!' : 'Request declined',
    bodyAr: status === 'accepted' ? 'الكوتش وافق عليك — تقدروا تتكلموا في الشات دلوقتي!' : 'الطلب اترفض',
    url: status === 'accepted' ? '/chat' : '/community',
  });
  res.json({ ok: true });
});

coachRouter.get('/clients', async (req: AuthedRequest, res) => {
  const rows = await prisma.coachRequest.findMany({ where: { coachUserId: req.userId!, status: 'accepted' } });
  const clients = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.clientId) } }, select: { ...pubUser, currentStreak: true } });
  res.json(clients);
});

coachRouter.get('/my-coaches', async (req: AuthedRequest, res) => {
  const rows = await prisma.coachRequest.findMany({ where: { clientId: req.userId!, status: 'accepted' } });
  const coaches = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.coachUserId) } }, select: pubUser });
  res.json(coaches);
});

coachRouter.get('/:userId/status', async (req: AuthedRequest, res) => {
  const row = await prisma.coachRequest.findUnique({ where: { clientId_coachUserId: { clientId: req.userId!, coachUserId: req.params.userId } } });
  res.json({ status: row?.status ?? null });
});

// ---- Ratings ----
coachRouter.post('/:userId/rate', async (req: AuthedRequest, res) => {
  const schema = z.object({ stars: z.number().min(1).max(5), comment: z.string().max(300).optional() });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid rating' });
  // Ratings drive the coach directory ordering, so only actual clients may rate:
  // an accepted coaching request is the relationship proof.
  const relationship = await prisma.coachRequest.findUnique({
    where: { clientId_coachUserId: { clientId: req.userId!, coachUserId: req.params.userId } },
  });
  if (relationship?.status !== 'accepted') {
    return res.status(403).json({ error: 'Only clients this coach accepted can rate them' });
  }
  const row = await prisma.coachRating.upsert({
    where: { clientId_coachUserId: { clientId: req.userId!, coachUserId: req.params.userId } },
    create: { clientId: req.userId!, coachUserId: req.params.userId, stars: p.data.stars, comment: p.data.comment },
    update: { stars: p.data.stars, comment: p.data.comment },
  });
  res.json(row);
});

coachRouter.get('/:userId/rating', async (req: AuthedRequest, res) => {
  const agg = await prisma.coachRating.aggregate({ where: { coachUserId: req.params.userId }, _avg: { stars: true }, _count: true });
  const mine = await prisma.coachRating.findUnique({ where: { clientId_coachUserId: { clientId: req.userId!, coachUserId: req.params.userId } } });
  // Written reviews were write-only dead data: accepted by POST, returned by
  // nothing. The last few now show on the profile.
  const reviews = await prisma.coachRating.findMany({
    where: { coachUserId: req.params.userId, comment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { stars: true, comment: true, clientId: true, createdAt: true },
  });
  const raters = await prisma.user.findMany({
    where: { id: { in: reviews.map((r) => r.clientId) } },
    select: { id: true, firstName: true },
  });
  const nameMap = new Map(raters.map((u) => [u.id, u.firstName]));
  res.json({
    avg: agg._avg.stars,
    count: agg._count,
    mine: mine?.stars ?? null,
    reviews: reviews.map((r) => ({ stars: r.stars, comment: r.comment, by: nameMap.get(r.clientId) ?? '—', createdAt: r.createdAt })),
  });
});
