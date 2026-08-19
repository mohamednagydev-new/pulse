import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { touchStreak } from '../lib/gamify';
import { bumpChallenges, awardXp } from '../lib/social';
import { notifyUser } from './push';
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

  // Journey finish line: a weigh-in that crosses the target ends the journey
  // with a celebration, not silence — this is the whole point of the program.
  let journeyCompleted = false;
  const u = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { dietStartedAt: true, dietStartWeightKg: true, targetWeightKg: true },
  });
  if (u?.dietStartedAt && u.dietStartWeightKg && u.targetWeightKg) {
    const cutting = u.targetWeightKg < u.dietStartWeightKg;
    const reached = cutting ? parsed.data.weightKg <= u.targetWeightKg : parsed.data.weightKg >= u.targetWeightKg;
    if (reached) {
      journeyCompleted = true;
      await prisma.user.update({
        where: { id: req.userId! },
        data: { dietStartedAt: null, dietStartWeightKg: null, targetWeightKg: null },
      });
      await awardXp(req.userId!, 300, 'diet-journey-complete');
      const moved = Math.abs(Math.round((u.targetWeightKg - u.dietStartWeightKg) * 10) / 10);
      notifyUser(req.userId!, {
        title: 'Target weight reached! 🏆',
        titleAr: 'وصلت لوزنك المستهدف! 🏆',
        body: `${moved} kg — you set a target and you hit it. +300 XP. Set the next one?`,
        bodyAr: `${moved} كجم — حطيت هدف ووصلته. +٣٠٠ نقطة. تحط الهدف اللي بعده؟`,
        url: '/progress',
        type: 'milestone',
      }).catch(() => {});
    }
  }
  res.status(201).json({ ...log, journeyCompleted });
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

/* ------------------------------------------------------------------ *
 * Diet journey — start weight → target weight with a healthy-pace
 * trajectory (±0.5 kg/week). Weight quick-logs become progress against
 * the line; the reminder engine picks up food nudges + Friday weigh-ins
 * for anyone with an active journey.
 * ------------------------------------------------------------------ */
trackerRouter.get('/diet-journey', async (req: AuthedRequest, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { dietStartedAt: true, dietStartWeightKg: true, targetWeightKg: true, weightKg: true },
  });
  if (!u?.dietStartedAt || !u.dietStartWeightKg || !u.targetWeightKg) return res.json({ active: false });
  const latest = await prisma.weightLog.findFirst({ where: { userId: req.userId! }, orderBy: { date: 'desc' } });
  const current = latest?.weightKg ?? u.weightKg ?? u.dietStartWeightKg;
  const totalDelta = u.targetWeightKg - u.dietStartWeightKg; // negative = cut
  const doneDelta = current - u.dietStartWeightKg;
  const pct = totalDelta === 0 ? 100 : Math.max(0, Math.min(100, Math.round((doneDelta / totalDelta) * 100)));
  const weeksIn = (Date.now() - u.dietStartedAt.getTime()) / (7 * 86400000);
  // Healthy pace: 0.5 kg per week in whichever direction.
  const expected = u.dietStartWeightKg + Math.sign(totalDelta) * Math.min(Math.abs(totalDelta), weeksIn * 0.5);
  const etaWeeks = Math.ceil(Math.abs(totalDelta) / 0.5);
  res.json({
    active: true,
    startedAt: u.dietStartedAt,
    startWeightKg: u.dietStartWeightKg,
    targetWeightKg: u.targetWeightKg,
    currentWeightKg: current,
    pct,
    expectedWeightKg: Math.round(expected * 10) / 10,
    onTrack: Math.sign(totalDelta) < 0 ? current <= expected + 0.6 : current >= expected - 0.6,
    etaWeeks,
    weeksIn: Math.floor(weeksIn),
  });
});

trackerRouter.post('/diet-journey', async (req: AuthedRequest, res) => {
  const parsed = z.object({ targetWeightKg: z.number().min(30).max(300) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid target' });
  const u = await prisma.user.findUnique({ where: { id: req.userId! }, select: { weightKg: true } });
  if (!u?.weightKg) return res.status(400).json({ error: 'Log your current weight first' });
  await prisma.user.update({
    where: { id: req.userId! },
    data: { dietStartedAt: new Date(), dietStartWeightKg: u.weightKg, targetWeightKg: parsed.data.targetWeightKg },
  });
  // The journey starts with a data point, not an intention.
  await prisma.weightLog.create({ data: { userId: req.userId!, weightKg: u.weightKg, date: today() } }).catch(() => {});
  res.status(201).json({ ok: true });
});

trackerRouter.delete('/diet-journey', async (req: AuthedRequest, res) => {
  await prisma.user.update({
    where: { id: req.userId! },
    data: { dietStartedAt: null, dietStartWeightKg: null, targetWeightKg: null },
  });
  res.json({ ok: true });
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
const SET_TYPES = ['normal', 'warmup', 'dropset', 'failure'] as const;

trackerRouter.post('/lifts', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      exercise: z.string().min(1).max(80),
      // 0 = bodyweight set (push-ups, air squats) — weight is optional, reps aren't.
      weightKg: z.number().min(0).max(1000),
      reps: z.number().int().positive().max(200),
      // Optional so offline-queued sets from older clients replay unchanged.
      setType: z.enum(SET_TYPES).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter your reps (weight is optional)' });
  const { exercise, weightKg, reps } = parsed.data;
  const setType = parsed.data.setType ?? 'normal';
  // Warm-up plates and bodyweight (0 kg) sets must never set (or beat) a PR —
  // compare against weighted working sets only.
  const prev = await prisma.liftLog.findFirst({
    where: { userId: req.userId!, exercise, setType: { not: 'warmup' }, weightKg: { gt: 0 } },
    orderBy: { weightKg: 'desc' },
  });
  const log = await prisma.liftLog.create({ data: { userId: req.userId!, exercise, weightKg, reps, setType } });
  const isPR = setType !== 'warmup' && weightKg > 0 && (!prev || weightKg > prev.weightKg);
  await touchStreak(req.userId!);
  res.status(201).json({ ok: true, id: log.id, isPR, prevBest: prev?.weightKg ?? null });
});

// Fix a fat-fingered set right after logging it — ownership enforced.
trackerRouter.patch('/lifts/:id', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      // 0 = bodyweight — an edit may clear the weight, matching POST's rule.
      weightKg: z.number().min(0).max(1000).optional(),
      reps: z.number().int().positive().max(200).optional(),
      setType: z.enum(SET_TYPES).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const lift = await prisma.liftLog.findUnique({ where: { id: req.params.id } });
  if (!lift || lift.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.liftLog.update({ where: { id: lift.id }, data: parsed.data });
  res.json(updated);
});

trackerRouter.delete('/lifts/:id', async (req: AuthedRequest, res) => {
  const lift = await prisma.liftLog.findUnique({ where: { id: req.params.id } });
  if (!lift || lift.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  await prisma.liftLog.delete({ where: { id: lift.id } });
  res.json({ ok: true });
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
// Warm-up and bodyweight (0 kg) sets are excluded — neither is a "best weight".
trackerRouter.get('/prs', async (req: AuthedRequest, res) => {
  const logs = await prisma.liftLog.findMany({
    where: { userId: req.userId!, setType: { not: 'warmup' }, weightKg: { gt: 0 } },
    orderBy: { weightKg: 'desc' },
  });
  const best = new Map<string, { exercise: string; weightKg: number; reps: number; createdAt: Date }>();
  for (const l of logs) if (!best.has(l.exercise)) best.set(l.exercise, l);
  res.json([...best.values()].sort((a, b) => b.weightKg - a.weightKg));
});
