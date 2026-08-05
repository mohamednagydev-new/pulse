import { prisma } from './prisma';
import { dayString, weekStart } from './time';
import type { Bilingual } from './coach';

/**
 * The week in review.
 *
 * Every number here comes from a row someone actually created — sessions finished,
 * lessons completed, meals logged, weight entries, PRs. The prose is assembled from
 * those numbers by rules, so this card works with the OpenAI key unset, offline, and
 * on the day the API bill is turned off. When AI *is* on it gets one job: rewrite
 * these same sentences more warmly. It is never allowed to source a fact.
 *
 * That split is the whole design. A "your week" card that hallucinates a workout you
 * did not do destroys trust faster than having no card at all.
 */

export type RecapStats = {
  weekKey: string;
  /** Distinct days trained, from both the lesson path and free sessions. */
  daysTrained: number;
  plannedDays: number;
  lessonsDone: number;
  sessionsDone: number;
  /** Days on which any food was logged. */
  daysLogged: number;
  avgCalories: number | null;
  goalCalories: number | null;
  weightChangeKg: number | null;
  newPrs: number;
  streak: number;
  xpGained: number;
  /** Comparison with the week before, for the one line people actually care about. */
  prevDaysTrained: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Arabic-Indic digits. The rest of our Arabic prose uses ٤ not 4, and mixing the two
 *  inside one sentence is the tell that a string was assembled rather than written. */
function ad(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/**
 * Arabic counts a thing, a pair of things, and many things differently, and a
 * template that just drops a numeral in front reads like a machine wrote it.
 * One: no numeral at all. Two: the dual form. Three and up: the numeral.
 */
function arCount(n: number, one: string, two: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${ad(n)} ${many}`;
}

/** The seven day-strings of the week starting at `weekKey`. */
function weekDays(weekKey: string): string[] {
  const start = Date.parse(`${weekKey}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(start + i * 86400000).toISOString().slice(0, 10),
  );
}

/** Saturday of the week before the given one. */
function prevWeekKey(weekKey: string): string {
  return new Date(Date.parse(`${weekKey}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10);
}

async function daysTrainedIn(userId: string, days: string[]): Promise<number> {
  const [lessons, sessions] = await Promise.all([
    prisma.lessonCompletion.findMany({
      where: { userId, completedAt: { gte: new Date(`${days[0]}T00:00:00Z`) } },
      select: { completedAt: true },
    }),
    prisma.liftLog.findMany({
      where: { userId, createdAt: { gte: new Date(`${days[0]}T00:00:00Z`) } },
      select: { createdAt: true },
    }),
  ]);
  const set = new Set(days);
  const trained = new Set<string>();
  for (const l of lessons) if (set.has(dayString(l.completedAt))) trained.add(dayString(l.completedAt));
  for (const s of sessions) if (set.has(dayString(s.createdAt))) trained.add(dayString(s.createdAt));
  return trained.size;
}

/**
 * How many lifts this week beat the user's best ever on that exercise.
 *
 * LiftLog has no `isPr` flag, so a PR is derived: the heaviest set logged this week
 * for an exercise, compared against the heaviest logged before this week. Comparing
 * on weight alone is the honest simplification — a true 1RM estimate would need reps
 * and a formula, and claiming that precision from a phone-entered set is false.
 */
async function countNewPrs(userId: string, from: Date, to: Date): Promise<number> {
  const thisWeek = await prisma.liftLog.findMany({
    where: { userId, createdAt: { gte: from, lte: to } },
    select: { exercise: true, weightKg: true },
  });
  if (thisWeek.length === 0) return 0;

  const bestNow = new Map<string, number>();
  for (const l of thisWeek) bestNow.set(l.exercise, Math.max(bestNow.get(l.exercise) ?? 0, l.weightKg));

  const before = await prisma.liftLog.findMany({
    where: { userId, createdAt: { lt: from }, exercise: { in: [...bestNow.keys()] } },
    select: { exercise: true, weightKg: true },
  });

  const bestBefore = new Map<string, number>();
  for (const l of before) bestBefore.set(l.exercise, Math.max(bestBefore.get(l.exercise) ?? 0, l.weightKg));

  let prs = 0;
  for (const [ex, now] of bestNow) {
    const prev = bestBefore.get(ex);
    // A first-ever entry is not a personal record — everyone's first log would be one,
    // and "3 new PRs!" on someone's first week is a lie they will notice.
    if (prev !== undefined && now > prev) prs++;
  }
  return prs;
}

export async function gatherStats(userId: string, weekKey = weekStart()): Promise<RecapStats> {
  const days = weekDays(weekKey);
  const from = new Date(`${days[0]}T00:00:00Z`);
  const to = new Date(`${days[6]}T23:59:59Z`);

  const [user, lessons, sessions, entries, weights, prs, xp, daysTrained, prevDaysTrained] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { goalCalories: true, currentStreak: true, scheduleJson: true },
      }),
      prisma.lessonCompletion.count({ where: { userId, completedAt: { gte: from, lte: to } } }),
      prisma.liftLog.count({ where: { userId, createdAt: { gte: from, lte: to } } }),
      prisma.calorieEntry.findMany({
        where: { userId, date: { in: days } },
        select: { date: true, calories: true },
      }),
      prisma.weightLog.findMany({
        where: { userId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: 'asc' },
        select: { weightKg: true },
      }),
      countNewPrs(userId, from, to),
      prisma.xpEvent.aggregate({
        where: { userId, createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      daysTrainedIn(userId, days),
      daysTrainedIn(userId, weekDays(prevWeekKey(weekKey))),
    ]);

  // Only average over the days they actually logged. Dividing by seven when someone
  // logged three days reports a number less than half their real intake, which would
  // then be "explained" back to them as under-eating.
  const byDay = new Map<string, number>();
  for (const e of entries) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.calories);
  const daysLogged = byDay.size;
  const avgCalories = daysLogged
    ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / daysLogged)
    : null;

  let plannedDays = 0;
  try {
    const sched = user?.scheduleJson ? JSON.parse(user.scheduleJson) : null;
    if (Array.isArray(sched)) plannedDays = sched.length;
  } catch {
    /* no schedule yet */
  }

  return {
    weekKey,
    daysTrained,
    plannedDays,
    lessonsDone: lessons,
    sessionsDone: sessions,
    daysLogged,
    avgCalories,
    goalCalories: user?.goalCalories ?? null,
    weightChangeKg:
      weights.length >= 2 ? round1(weights[weights.length - 1].weightKg - weights[0].weightKg) : null,
    newPrs: typeof prs === 'number' ? prs : 0,
    streak: user?.currentStreak ?? 0,
    xpGained: xp?._sum?.amount ?? 0,
    prevDaysTrained,
  };
}

/**
 * Rules-only prose. This is the version that always ships.
 *
 * Order matters: lead with training, because that is what the app is for; then the
 * comparison with last week, because that is the only number people actually feel;
 * then food; then the one encouraging close. Never more than four sentences — a
 * recap nobody finishes reading is not a recap.
 */
export function writeRecap(s: RecapStats): Bilingual {
  const en: string[] = [];
  const ar: string[] = [];

  // ---- training ----
  if (s.daysTrained === 0) {
    en.push('No training logged this week.');
    ar.push('مفيش تمرين متسجل الأسبوع ده.');
  } else {
    const target = s.plannedDays || 0;
    en.push(
      target
        ? `You trained ${s.daysTrained} of your ${target} planned days.`
        : `You trained ${s.daysTrained} ${s.daysTrained === 1 ? 'day' : 'days'}.`,
    );
    ar.push(
      target
        ? `اتمرنت ${arCount(s.daysTrained, 'يوم واحد', 'يومين', 'أيام')} من ${ad(target)} في خطتك.`
        : `اتمرنت ${arCount(s.daysTrained, 'يوم واحد', 'يومين', 'أيام')}.`,
    );
  }

  // ---- versus last week ----
  const diff = s.daysTrained - s.prevDaysTrained;
  if (s.prevDaysTrained > 0 || s.daysTrained > 0) {
    if (diff > 0) {
      en.push(`That's ${diff} more than last week.`);
      ar.push(`${arCount(diff, 'يوم', 'يومين', 'أيام')} أكتر من الأسبوع اللي فات.`);
    } else if (diff < 0) {
      en.push(`That's ${Math.abs(diff)} fewer than last week.`);
      ar.push(`${arCount(Math.abs(diff), 'يوم', 'يومين', 'أيام')} أقل من الأسبوع اللي فات.`);
    } else if (s.daysTrained > 0) {
      en.push('Same as last week — steady.');
      ar.push('زي الأسبوع اللي فات بالظبط — ثابت.');
    }
  }

  // ---- personal records ----
  if (s.newPrs > 0) {
    en.push(`${s.newPrs} new personal ${s.newPrs === 1 ? 'record' : 'records'}.`);
    ar.push(`${arCount(s.newPrs, 'رقم قياسي جديد', 'رقمين قياسيين جداد', 'أرقام قياسية جديدة')}.`);
  }

  // ---- food ----
  if (s.daysLogged > 0 && s.avgCalories) {
    if (s.goalCalories) {
      const off = s.avgCalories - s.goalCalories;
      const pct = Math.abs(off) / s.goalCalories;
      const dayCount = arCount(s.daysLogged, 'يوم واحد', 'يومين', 'أيام');
      const enDays = `${s.daysLogged} ${s.daysLogged === 1 ? 'day' : 'days'}`;
      if (pct <= 0.1) {
        en.push(`You logged ${enDays} of food and averaged ${s.avgCalories} kcal — right on target.`);
        ar.push(`سجّلت أكلك ${dayCount} بمتوسط ${ad(s.avgCalories)} سعرة — على الهدف بالظبط.`);
      } else {
        en.push(
          `You logged ${enDays} of food, averaging ${s.avgCalories} kcal — about ${Math.abs(off)} ${off > 0 ? 'over' : 'under'} target.`,
        );
        ar.push(
          `سجّلت أكلك ${dayCount} بمتوسط ${ad(s.avgCalories)} سعرة — حوالي ${ad(Math.abs(off))} ${off > 0 ? 'فوق' : 'تحت'} الهدف.`,
        );
      }
    } else {
      en.push(
        `You logged ${s.daysLogged} ${s.daysLogged === 1 ? 'day' : 'days'} of food, averaging ${s.avgCalories} kcal.`,
      );
      ar.push(`سجّلت أكلك ${arCount(s.daysLogged, 'يوم واحد', 'يومين', 'أيام')} بمتوسط ${ad(s.avgCalories)} سعرة.`);
    }
  }

  // ---- weight ----
  if (s.weightChangeKg !== null && Math.abs(s.weightChangeKg) >= 0.3) {
    const dir = s.weightChangeKg < 0 ? 'down' : 'up';
    en.push(`Weight is ${dir} ${Math.abs(s.weightChangeKg)} kg.`);
    ar.push(`الوزن ${s.weightChangeKg < 0 ? 'نزل' : 'زاد'} ${ad(Math.abs(s.weightChangeKg))} كيلو.`);
  }

  // ---- the close ----
  if (s.daysTrained === 0) {
    en.push('One session this week puts you back on track. Start with the shortest one.');
    ar.push('حصة واحدة الأسبوع ده وترجع تاني. ابدأ بأقصر واحدة.');
  } else if (s.streak >= 7) {
    en.push(`${s.streak}-day streak. Keep it.`);
    ar.push(`سلسلة ${ad(s.streak)} يوم. حافظ عليها.`);
  }

  return { en: en.join(' '), ar: ar.join(' ') };
}

/**
 * The prompt for the optional AI rewrite.
 *
 * It is handed the finished sentences and told to rephrase, not to analyse. No raw
 * stats go in, so there is nothing for it to draw a new conclusion from — the worst
 * it can do is word our own facts badly.
 */
export function rewritePrompt(base: Bilingual, lang: string): { system: string; user: string } {
  return {
    system: [
      'You rewrite a fitness app\'s weekly recap so it sounds like a friend, not a report.',
      lang === 'ar'
        ? 'Write in simple Egyptian Arabic, the way people actually speak. Never formal MSA.'
        : 'Write in plain, warm English.',
      'RULES: keep every number exactly as given. Add no facts, no advice, no new numbers.',
      'Two or three short sentences. No emoji. No greeting. No sign-off.',
      'If the week was bad, be kind and matter-of-fact. Never shame, never over-praise.',
      'Return only the rewritten text.',
    ].join('\n'),
    user: lang === 'ar' ? base.ar : base.en,
  };
}
