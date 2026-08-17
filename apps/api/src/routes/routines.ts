import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { parseArray } from '../lib/json';
import { notifyUser } from './push';
import { enrichExercises, userLimitations } from '../lib/enrich';
import { preferredGender } from '../lib/genderMedia';

// Routines: Hevy-style shareable workout objects — save a finished session as
// a routine, copy someone else's, start a session from one.
export const routinesRouter = Router();
routinesRouter.use(requireAuth);

const exerciseSchema = z.object({
  name: z.string().min(1).max(80),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(200),
  weightKg: z.number().min(0).max(1000).optional(),
});

const bodySchema = z.object({
  title: z.string().min(1).max(80),
  exercises: z.array(exerciseSchema).min(1).max(15),
  muscleFocus: z.string().max(60).optional(),
  isPublic: z.boolean().optional(),
});

const shape = (r: { exercises: string } & Record<string, unknown>) => ({
  ...r,
  exercises: parseArray(r.exercises),
});

// ---- My routines, newest first ----
routinesRouter.get('/', async (req: AuthedRequest, res) => {
  const mine = await prisma.routine.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });
  res.json(mine.map(shape));
});

// ---- Someone's public routines (profile section) ----
// Registered before '/:id' so "user" is never swallowed as a routine id.
routinesRouter.get('/user/:userId', async (req, res) => {
  const list = await prisma.routine.findMany({
    where: { userId: req.params.userId, isPublic: true },
    orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
  res.json(list.map(shape));
});

// ---- Save a routine (usually straight off a finished session) ----
routinesRouter.post('/', async (req: AuthedRequest, res) => {
  const p = bodySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Add a title and 1–15 exercises' });
  const r = await prisma.routine.create({
    data: {
      userId: req.userId!,
      title: p.data.title,
      exercises: JSON.stringify(p.data.exercises),
      muscleFocus: p.data.muscleFocus,
      ...(p.data.isPublic === undefined ? {} : { isPublic: p.data.isPublic }),
    },
  });
  res.status(201).json(shape(r));
});

// ---- Edit (owner only) ----
routinesRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const p = bodySchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const existing = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: 'Routine not found' });
  const r = await prisma.routine.update({
    where: { id: existing.id },
    data: {
      ...(p.data.title === undefined ? {} : { title: p.data.title }),
      ...(p.data.isPublic === undefined ? {} : { isPublic: p.data.isPublic }),
      ...(p.data.exercises === undefined ? {} : { exercises: JSON.stringify(p.data.exercises) }),
      ...(p.data.muscleFocus === undefined ? {} : { muscleFocus: p.data.muscleFocus }),
    },
  });
  res.json(shape(r));
});

// ---- Delete (owner only) ----
routinesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const gone = await prisma.routine.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  if (!gone.count) return res.status(404).json({ error: 'Routine not found' });
  res.json({ ok: true });
});

// ---- Copy someone's routine into my list ----
routinesRouter.post('/:id/copy', async (req: AuthedRequest, res) => {
  const src = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!src || (!src.isPublic && src.userId !== req.userId)) {
    return res.status(404).json({ error: 'Routine not found' });
  }
  const copy = await prisma.routine.create({
    data: {
      userId: req.userId!,
      title: src.title,
      exercises: src.exercises,
      muscleFocus: src.muscleFocus,
      sourceId: src.id,
    },
  });
  await prisma.routine.update({ where: { id: src.id }, data: { copies: { increment: 1 } } });
  if (src.userId !== req.userId) {
    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
    notifyUser(src.userId, {
      title: 'Your routine got copied! 💪',
      titleAr: 'روتينك اتنسخ! 💪',
      body: `${me?.firstName ?? 'Someone'} copied your routine "${src.title}" — people are training your way.`,
      bodyAr: `${me?.firstName ?? 'حد'} نسخ روتينك «${src.title}» — الناس بتتمرن بطريقتك.`,
      url: '/routines',
      type: 'general',
    });
  }
  res.status(201).json(shape(copy));
});

// ---- One routine, ready for the session player (owner or public) ----
// Free-text names get matched to the exercise library on the way out — same
// enrichment coach workouts use — so a routine session has form demos and the
// user's own injury flags.
routinesRouter.get('/:id', async (req: AuthedRequest, res) => {
  const r = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!r || (!r.isPublic && r.userId !== req.userId)) {
    return res.status(404).json({ error: 'Routine not found' });
  }
  const raw = parseArray(r.exercises) as { name: string; sets: number; reps: number; weightKg?: number }[];
  // Sets/reps as display strings ("3 sets" / "10 reps") — the session player
  // translates those units in place for Arabic users.
  const display = raw.map((e) => ({
    ...e,
    sets: `${e.sets} sets`,
    reps: `${e.reps} reps`,
  }));
  const [gender, limitations] = await Promise.all([
    preferredGender(req.userId),
    userLimitations(req.userId),
  ]);
  const exercises = await enrichExercises(display, gender, limitations);
  res.json({ ...r, exercises });
});
