import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { touchStreak } from '../lib/gamify';
import { bumpChallenges } from '../lib/social';
import { dayString } from '../lib/time';

export const trackerRouter = Router();
trackerRouter.use(requireAuth);

// App-timezone day (Cairo), not UTC — a meal logged at 23:00 must count for today,
// or quests/challenges querying today's date never see it.
function today(): string {
  return dayString();
}

trackerRouter.get('/day', async (req: AuthedRequest, res) => {
  const date = String(req.query.date || today());
  const [entries, user] = await Promise.all([
    prisma.calorieEntry.findMany({ where: { userId: req.userId!, date }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findUnique({ where: { id: req.userId! } }),
  ]);
  const totals = entries.reduce(
    (a, e) => ({
      calories: a.calories + e.calories,
      protein: a.protein + (e.protein ?? 0),
      carbs: a.carbs + (e.carbs ?? 0),
      fat: a.fat + (e.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  res.json({
    date,
    entries,
    totals,
    goals: {
      calories: user?.goalCalories ?? null,
      protein: user?.goalProtein ?? null,
      carbs: user?.goalCarbs ?? null,
      fat: user?.goalFat ?? null,
    },
  });
});

trackerRouter.post('/calories', async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string(),
    calories: z.number(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    mealType: z.string().optional(),
    date: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const d = parsed.data;
  const entry = await prisma.calorieEntry.create({
    data: {
      userId: req.userId!,
      date: d.date ?? today(),
      name: d.name,
      calories: Math.round(d.calories),
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      mealType: d.mealType ?? 'meal',
    },
  });
  await touchStreak(req.userId!);
  await bumpChallenges(req.userId!, 'calorie');
  res.status(201).json(entry);
});

trackerRouter.delete('/calories/:id', async (req: AuthedRequest, res) => {
  await prisma.calorieEntry.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

trackerRouter.get('/weight', async (req: AuthedRequest, res) => {
  const logs = await prisma.weightLog.findMany({ where: { userId: req.userId! }, orderBy: { date: 'asc' }, take: 90 });
  res.json(logs);
});

trackerRouter.post('/weight', async (req: AuthedRequest, res) => {
  const schema = z.object({ weightKg: z.number(), date: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const log = await prisma.weightLog.create({
    data: { userId: req.userId!, weightKg: parsed.data.weightKg, date: parsed.data.date ?? today() },
  });
  await prisma.user.update({ where: { id: req.userId! }, data: { weightKg: parsed.data.weightKg } });
  res.status(201).json(log);
});

trackerRouter.get('/progress', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const since = new Date();
  since.setDate(since.getDate() - 27);
  const [totalCompletions, workoutSessions, recent, weights] = await Promise.all([
    prisma.lessonCompletion.count({ where: { userId: req.userId! } }),
    prisma.xpEvent.count({ where: { userId: req.userId!, reason: 'workout-session' } }),
    prisma.lessonCompletion.findMany({ where: { userId: req.userId!, completedAt: { gte: since } } }),
    prisma.weightLog.findMany({ where: { userId: req.userId! }, orderBy: { date: 'asc' }, take: 60 }),
  ]);

  // Last 7 days activity counts (app-timezone day boundaries).
  const week: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayString(d);
    week.push({ day: key, count: recent.filter((r) => dayString(r.completedAt) === key).length });
  }

  res.json({
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    totalCompletions,
    // Lesson completions + standalone workout sessions — "have you ever worked
    // out in the app at all", which is what comeback/first-workout UI wants.
    totalWorkouts: totalCompletions + workoutSessions,
    weekActivity: week,
    weights,
  });
});

trackerRouter.patch('/goals', async (req: AuthedRequest, res) => {
  const schema = z.object({
    goalCalories: z.number().optional(),
    goalProtein: z.number().optional(),
    goalCarbs: z.number().optional(),
    goalFat: z.number().optional(),
    fitnessGoal: z.string().optional(),
    fitnessLevel: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
    birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 5).optional(),
    heightCm: z.number().optional(),
    weightKg: z.number().optional(),
    onboarded: z.boolean().optional(),
    reminderHour: z.number().min(0).max(23).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.update({ where: { id: req.userId! }, data: parsed.data });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// ---- Strength logging & personal records ----
trackerRouter.post('/lifts', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({ exercise: z.string().min(1).max(80), weightKg: z.number().positive().max(1000), reps: z.number().int().positive().max(200) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a weight and reps' });
  const { exercise, weightKg, reps } = parsed.data;
  const prev = await prisma.liftLog.findFirst({
    where: { userId: req.userId!, exercise },
    orderBy: { weightKg: 'desc' },
  });
  const log = await prisma.liftLog.create({ data: { userId: req.userId!, exercise, weightKg, reps } });
  const isPR = !prev || weightKg > prev.weightKg;
  await touchStreak(req.userId!);
  res.status(201).json({ ok: true, id: log.id, isPR, prevBest: prev?.weightKg ?? null });
});

trackerRouter.get('/lifts', async (req: AuthedRequest, res) => {
  const exercise = String(req.query.exercise || '').trim();
  const logs = await prisma.liftLog.findMany({
    where: { userId: req.userId!, ...(exercise ? { exercise } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(logs);
});

// Personal records: best weight per exercise (with the reps at that weight).
trackerRouter.get('/prs', async (req: AuthedRequest, res) => {
  const logs = await prisma.liftLog.findMany({ where: { userId: req.userId! }, orderBy: { weightKg: 'desc' } });
  const best = new Map<string, { exercise: string; weightKg: number; reps: number; createdAt: Date }>();
  for (const l of logs) if (!best.has(l.exercise)) best.set(l.exercise, l);
  res.json([...best.values()].sort((a, b) => b.weightKg - a.weightKg));
});
