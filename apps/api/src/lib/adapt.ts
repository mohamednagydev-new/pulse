import { prisma } from './prisma';
import { dayString, daysAgoStr, startOfDayTz } from './time';
import type { Bilingual } from './coach';

/**
 * Plan adaptation — what a coach does between assessments.
 *
 * A plan written four weeks ago knows nothing about the week you actually had. This
 * looks at what you completed against what was planned and proposes one change:
 * ease off when life got in the way, take a lighter week after a hard block, or step
 * up when you have clearly outgrown it.
 *
 * Two rules shape the whole thing:
 *   - Never punish. Missing sessions means the plan was wrong for the week, not that
 *     the user failed. The copy says so.
 *   - Propose, never impose. Silently rewriting someone's plan is how they lose
 *     trust in it, so every change is offered and can be declined.
 */

export type Adherence = {
  planned: number;
  done: number;
  ratio: number;
  weeks: number;
  daysSinceLast: number | null;
};

export type Proposal = {
  kind: 'deload' | 'reduce' | 'increase' | 'restart';
  reason: Bilingual;
  fromDays?: number;
  toDays?: number;
  /** Deload only: how many days the lighter week should run. */
  spanDays?: number;
};

/**
 * Training over the trailing window, against what the plan asked for.
 *
 * Counts DISTINCT DAYS trained, from BOTH ways of training:
 *   - finishing a program lesson  (LessonCompletion)
 *   - finishing a muscle-group session (XpEvent 'workout-session')
 *
 * Both matter. Counting only lessons made anyone who trains through the muscle-map
 * look completely inactive, and the coach would offer to cut the days of someone
 * training five times a week. Counting days rather than events also matches the
 * target, which is expressed in days per week — three lessons in one evening is one
 * training day, not three.
 */
export async function adherenceFor(userId: string, daysPerWeek: number, weeks = 2): Promise<Adherence> {
  const since = startOfDayTz(daysAgoStr(weeks * 7 - 1));

  const [lessons, sessions, lastLesson, lastSession] = await Promise.all([
    prisma.lessonCompletion.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.xpEvent.findMany({
      where: { userId, reason: { in: ['workout-session', 'wearable_import'] }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.lessonCompletion.findFirst({ where: { userId }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
    prisma.xpEvent.findFirst({
      where: { userId, reason: { in: ['workout-session', 'wearable_import'] } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const trainedOn = new Set<string>([
    ...lessons.map((l) => dayString(l.completedAt)),
    ...sessions.map((s) => dayString(s.createdAt)),
  ]);
  const done = trainedOn.size;

  const lastAt = [lastLesson?.completedAt, lastSession?.createdAt]
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];

  const planned = Math.max(1, daysPerWeek * weeks);
  const daysSinceLast = lastAt ? Math.floor((Date.now() - (lastAt as Date).getTime()) / 86400000) : null;

  return { planned, done, ratio: done / planned, weeks, daysSinceLast };
}

/**
 * One proposal at a time, most urgent first. Returning a single change is
 * deliberate: a list of four adjustments is a plan nobody follows.
 */
export function proposeChange(a: Adherence, daysPerWeek: number, weeksSinceDeload: number): Proposal | null {
  // Gone quiet for over a week — the ask now is "come back", not "do more".
  if (a.daysSinceLast !== null && a.daysSinceLast >= 7) {
    const to = Math.max(2, daysPerWeek - 1);
    return {
      kind: 'restart',
      fromDays: daysPerWeek,
      toDays: to,
      reason: {
        en: `It's been ${a.daysSinceLast} days. Let's restart at ${to} days a week — easier to say yes to than picking up where you left off.`,
        ar: `بقالك ${a.daysSinceLast} يوم. يلا نبدأ من جديد بـ${to} أيام في الأسبوع — أسهل إنك توافق عليها من إنك تكمل من مكانك.`,
      },
    };
  }

  // Never trained at all yet — nothing to adapt from.
  if (a.daysSinceLast === null) return null;

  // Falling well short: the plan is too big for the life around it.
  if (a.ratio < 0.5 && daysPerWeek > 2) {
    const to = Math.max(2, daysPerWeek - 1);
    return {
      kind: 'reduce',
      fromDays: daysPerWeek,
      toDays: to,
      reason: {
        en: `You've done ${a.done} of ${a.planned} sessions. That's a plan problem, not a you problem — drop to ${to} days a week and actually hit them.`,
        ar: `عملت ${a.done} من ${a.planned} تمرينة. دي مشكلة الخطة مش مشكلتك — انزل لـ${to} أيام في الأسبوع وخلّينا نكملهم فعلاً.`,
      },
    };
  }

  // Four solid weeks without a lighter one: take the deload before the body forces it.
  if (a.ratio >= 0.8 && weeksSinceDeload >= 4) {
    return {
      kind: 'deload',
      spanDays: 7,
      reason: {
        en: "Four strong weeks. Take a lighter one — half the sets, same days. This is how you keep going instead of breaking.",
        ar: 'أربع أسابيع قوية. خد أسبوع أخف — نص المجموعات وبنفس الأيام. كده بتكمل بدل ما تتكسر.',
      },
    };
  }

  // Consistently clearing the bar with room to spare: offer more.
  if (a.ratio >= 1 && daysPerWeek < 6) {
    const to = daysPerWeek + 1;
    return {
      kind: 'increase',
      fromDays: daysPerWeek,
      toDays: to,
      reason: {
        en: `You hit every session for ${a.weeks} weeks. Ready for ${to} days a week?`,
        ar: `عملت كل التمرينات على مدار ${a.weeks} أسابيع. جاهز لـ${to} أيام في الأسبوع؟`,
      },
    };
  }

  return null;
}

/** Weeks since the last deload was taken; large number when there has never been one. */
export async function weeksSinceDeload(userId: string, planStarted: Date): Promise<number> {
  const last = await prisma.planAdjustment.findFirst({
    where: { userId, kind: 'deload', appliedAt: { not: null } },
    orderBy: { appliedAt: 'desc' },
    select: { appliedAt: true },
  });
  const from = last?.appliedAt ?? planStarted;
  return Math.floor((Date.now() - from.getTime()) / (7 * 86400000));
}

/** Is a lighter week running right now? Drives the reduced targets in the UI. */
export async function activeDeload(userId: string) {
  const today = dayString();
  return prisma.planAdjustment.findFirst({
    where: { userId, kind: 'deload', appliedAt: { not: null }, activeUntil: { gte: today } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Rebuild the weekly split for a new number of training days, keeping the focuses. */
export function rescheduleDays(
  schedule: { day: string; focus: string; groups: string[] }[],
  newDays: string[],
): { day: string; focus: string; groups: string[] }[] {
  const focuses = schedule.filter((d) => d.groups.length > 0);
  const wanted = new Set(newDays);
  let i = 0;
  return schedule.map((d) => {
    if (!wanted.has(d.day)) return { day: d.day, focus: 'Rest', groups: [] };
    const src = focuses[i++ % Math.max(1, focuses.length)];
    return { day: d.day, focus: src?.focus ?? 'Full body', groups: src?.groups ?? [] };
  });
}
