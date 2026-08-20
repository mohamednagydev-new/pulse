import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { dayString, weekStart, startOfDayTz, endOfDayTz } from '../lib/time';

export const recapRouter = Router();
recapRouter.use(requireAuth);

/**
 * Weekly recap + monthly wrapped.
 *
 * Weeks run Saturday→Friday (Egyptian convention, same as leagues). "Last
 * completed week" is therefore the 7 days ending on the most recent Friday —
 * mid-week we still recap the week that already finished, never a half week.
 * All day math goes through lib/time so a UTC host cannot shift anyone's
 * Saturday.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** day + n days, YYYY-MM-DD (pure calendar arithmetic on the day string). */
function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

/** The 7 day-strings of the week starting at `start` (a Saturday). */
function spanDays(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

type WindowStats = {
  week: { start: string; end: string };
  workouts: number;
  xp: number;
  activeDays: number;
  calorieDaysLogged: number;
  avgCalories: number | null;
  weightStart: number | null;
  weightEnd: number | null;
};

/** Aggregate one [startDay..endDay] window (inclusive, app-timezone days). */
async function gatherWindow(userId: string, startDay: string, endDay: string): Promise<WindowStats> {
  const from = startOfDayTz(startDay);
  const to = endOfDayTz(endDay);

  const [workouts, xpEvents, entries, weights] = await Promise.all([
    prisma.lessonCompletion.count({ where: { userId, completedAt: { gte: from, lte: to } } }),
    prisma.xpEvent.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
      select: { amount: true, createdAt: true },
    }),
    prisma.calorieEntry.findMany({
      where: { userId, date: { gte: startDay, lte: endDay } },
      select: { date: true, calories: true },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: startDay, lte: endDay } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { weightKg: true },
    }),
  ]);

  const active = new Set<string>();
  let xp = 0;
  for (const e of xpEvents) {
    xp += e.amount;
    active.add(dayString(e.createdAt));
  }

  // Average only over days actually logged — dividing by the calendar length
  // under-reports intake for anyone who logs a few days a week.
  const byDay = new Map<string, number>();
  for (const e of entries) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.calories);
  const calorieDaysLogged = byDay.size;
  const avgCalories = calorieDaysLogged
    ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / calorieDaysLogged)
    : null;

  return {
    week: { start: startDay, end: endDay },
    workouts,
    xp,
    activeDays: active.size,
    calorieDaysLogged,
    avgCalories,
    weightStart: weights.length ? weights[0].weightKg : null,
    weightEnd: weights.length ? weights[weights.length - 1].weightKg : null,
  };
}

/** ONE rule-based focus suggestion, first matching rule wins. */
function pickFocus(s: WindowStats): { focusEn: string; focusAr: string } {
  if (s.workouts === 0) {
    return {
      focusEn: 'No workouts logged — restart small: one short session this week gets you moving again.',
      focusAr: 'مفيش تمارين متسجلة — ابدأ صغير: حصة واحدة قصيرة الأسبوع ده ترجّعك تاني.',
    };
  }
  if (s.calorieDaysLogged < 3) {
    return {
      focusEn: 'Training is there, but food logging is thin. Aim to log your meals at least 4 days this week.',
      focusAr: 'التمرين ماشي، بس تسجيل الأكل قليل. حاول تسجّل أكلك ٤ أيام على الأقل الأسبوع ده.',
    };
  }
  const delta =
    s.weightStart !== null && s.weightEnd !== null ? round1(s.weightEnd - s.weightStart) : null;
  if (delta !== null && Math.abs(delta) < 0.2) {
    return {
      focusEn: 'Weight held steady — that is normal. Plateaus break with patience: keep the same routine two more weeks.',
      focusAr: 'الوزن ثابت — ده طبيعي. الثبات بيتكسر بالصبر: كمّل على نفس النظام أسبوعين كمان.',
    };
  }
  return {
    focusEn: `Solid week — keep going. Next step: add one extra active day (${s.activeDays} → ${Math.min(7, s.activeDays + 1)}).`,
    focusAr: `أسبوع كويس — كمّل. الخطوة الجاية: زوّد يوم نشاط واحد (${s.activeDays} ← ${Math.min(7, s.activeDays + 1)}).`,
  };
}

/**
 * GET /api/recap/weekly
 * `last` = the last COMPLETED Saturday→Friday week (ends the most recent
 * Friday); `current` = the in-progress week. The Home card shows `last` inside
 * the Fri-noon→Monday recap window and `current` otherwise.
 */
recapRouter.get('/weekly', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const currentStart = weekStart(); // this week's Saturday
  const lastStart = addDays(currentStart, -7); // previous Saturday
  const lastEnd = addDays(currentStart, -1); // the Friday that just ended

  const [user, last, current] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, goalCalories: true, firstName: true },
    }),
    gatherWindow(userId, lastStart, lastEnd),
    gatherWindow(userId, currentStart, dayString()),
  ]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const shared = { goalCalories: user.goalCalories ?? null, streak: user.currentStreak, firstName: user.firstName };
  return res.json({
    last: { ...last, ...shared, ...pickFocus(last) },
    current: { ...current, ...shared, ...pickFocus(current) },
  });
});

/**
 * GET /api/recap/monthly?month=YYYY-MM
 * Defaults to the previous month during the first 4 days of a month (the
 * "wrapped" moment), else the current month-to-date.
 */
recapRouter.get('/monthly', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const today = dayString();

  let month = typeof req.query.month === 'string' ? req.query.month : '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const dayOfMonth = Number(today.slice(8, 10));
    if (dayOfMonth < 5) {
      const [y, m] = today.split('-').map(Number);
      const prev = new Date(Date.UTC(y, m - 2, 1)); // month is 1-based here
      month = prev.toISOString().slice(0, 7);
    } else {
      month = today.slice(0, 7);
    }
  }

  const [y, m] = month.split('-').map(Number);
  const lastDayNum = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startDay = `${month}-01`;
  const fullEnd = `${month}-${String(lastDayNum).padStart(2, '0')}`;
  // A month still in progress ends today — stats must not pretend the future happened.
  const endDay = fullEnd > today ? today : fullEnd;
  const from = startOfDayTz(startDay);
  const to = endOfDayTz(endDay);

  const [user, stats, badgesEarned, xpDays] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, goalCalories: true, firstName: true, xp: true, level: true },
    }),
    gatherWindow(userId, startDay, endDay),
    prisma.userBadge.count({ where: { userId, earnedAt: { gte: from, lte: to } } }),
    prisma.xpEvent.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
  ]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Best streak inside the month, approximated as the longest run of
  // consecutive active days (any XpEvent on the day counts).
  const activeDaysSorted = [...new Set(xpDays.map((e) => dayString(e.createdAt)))].sort();
  let bestStreakInMonth = 0;
  let run = 0;
  let prevDay = '';
  for (const d of activeDaysSorted) {
    run = prevDay && addDays(prevDay, 1) === d ? run + 1 : 1;
    if (run > bestStreakInMonth) bestStreakInMonth = run;
    prevDay = d;
  }

  const weightDelta =
    stats.weightStart !== null && stats.weightEnd !== null
      ? round1(stats.weightEnd - stats.weightStart)
      : null;

  return res.json({
    month,
    range: { start: startDay, end: endDay },
    totalWorkouts: stats.workouts,
    totalXp: stats.xp,
    activeDays: stats.activeDays,
    calorieDaysLogged: stats.calorieDaysLogged,
    avgCalories: stats.avgCalories,
    goalCalories: user.goalCalories ?? null,
    weightStart: stats.weightStart,
    weightEnd: stats.weightEnd,
    weightDelta,
    bestStreakInMonth,
    badgesEarned,
    streak: user.currentStreak,
    firstName: user.firstName,
    xpTotal: user.xp,
    level: user.level,
    ...pickFocus(stats),
  });
});
