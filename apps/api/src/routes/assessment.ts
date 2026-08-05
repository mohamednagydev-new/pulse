import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { dayString } from '../lib/time';
import {
  Answers, decideLevel, spreadDays, cautionsFor, rationaleFor, pickProgram, nextCheckDate,
} from '../lib/coach';
import { adherenceFor, proposeChange, weeksSinceDeload, activeDeload, rescheduleDays } from '../lib/adapt';
import { measureOutcome } from '../lib/outcome';
import { computeTargets } from '../lib/nutrition';

/**
 * Coaching intake.
 *
 * Nine questions, then a plan: level, program, training days, the reasons behind
 * each choice, and cautions for anything they said hurts. Enrolling and writing the
 * weekly schedule happen here too, so finishing the form leaves the user with
 * somewhere to be tomorrow rather than a result page.
 */
export const assessmentRouter = Router();
assessmentRouter.use(requireAuth);

const schema = z.object({
  goal: z.enum(['lose_weight', 'build_muscle', 'stay_fit', 'get_strong', 'more_energy']),
  experience: z.enum(['none', 'some', 'regular', 'advanced']),
  daysPerWeek: z.number().int().min(1).max(7),
  minutesPerSession: z.number().int().min(10).max(120),
  equipment: z.enum(['none', 'home_basic', 'full_gym']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']),
  limitations: z.array(z.enum(['knee', 'back', 'shoulder', 'wrist', 'neck'])).max(5).default([]),
  preferMornings: z.boolean().default(false),
  // Optional, and only asked when we don't already have them. With these the calorie
  // target is calculated; without them it falls back to a goal default.
  heightCm: z.number().int().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  birthYear: z.number().int().min(1920).max(new Date().getFullYear() - 12).optional(),
  gender: z.enum(['male', 'female']).optional(),
});

/** Muscle groups to put on a training day, so the generated schedule is usable. */
const SPLIT: Record<string, string[][]> = {
  strength: [['Chest', 'Triceps'], ['Lats', 'Biceps'], ['Quads', 'Glutes'], ['Shoulders', 'Abs'], ['Hamstrings', 'Calves'], ['Abs', 'Obliques']],
  full: [['Quads', 'Chest', 'Lats'], ['Glutes', 'Shoulders', 'Abs'], ['Hamstrings', 'Biceps', 'Triceps']],
};

/** Fewer days means each session has to cover more ground. */
function groupsFor(dayIndex: number, daysPerWeek: number, goal: string): string[] {
  const table = daysPerWeek >= 4 && goal !== 'stay_fit' ? SPLIT.strength : SPLIT.full;
  return table[dayIndex % table.length];
}

const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** The most recent plan, plus whether it is due a re-check. */
assessmentRouter.get('/', async (req: AuthedRequest, res) => {
  const latest = await prisma.assessment.findFirst({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return res.json({ hasPlan: false });

  const program = latest.programId
    ? await prisma.program.findUnique({
        where: { id: latest.programId },
        include: { coach: { select: { name: true, type: true } }, _count: { select: { lessons: true } } },
      })
    : null;

  const today = dayString();
  res.json({
    hasPlan: true,
    assessment: {
      ...latest,
      limitations: safeParse(latest.limitations),
      scheduleDays: safeParse(latest.scheduleDays),
      rationale: safeParse(latest.rationale),
      cautions: safeParse(latest.cautions),
    },
    program,
    dueRecheck: !!latest.nextCheckOn && latest.nextCheckOn <= today,
    history: await prisma.assessment.count({ where: { userId: req.userId! } }),
  });
});

function safeParse(v: string | null): any[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** Run the intake: score it, choose a program, write the schedule, enrol them. */
assessmentRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please answer every question.' });
  const a: Answers = parsed.data;

  const { level, why } = decideLevel(a);
  const days = spreadDays(a.daysPerWeek);
  const cautions = cautionsFor(a.limitations);
  const rationale = rationaleFor(a, level, why, days);

  const programs = await prisma.program.findMany({
    include: { coach: { select: { type: true } }, _count: { select: { lessons: true } } },
    orderBy: { order: 'asc' },
  });
  const chosen = pickProgram(programs as any, a, level);

  // Weekly split: training days get muscle groups, the rest are rest days.
  const trainingDays = new Set(days);
  let i = 0;
  const schedule = ALL_DAYS.map((day) => {
    if (!trainingDays.has(day)) return { day, focus: 'Rest', groups: [] as string[] };
    const groups = groupsFor(i++, a.daysPerWeek, a.goal);
    return { day, focus: groups.join(' + '), groups };
  });

  const today = dayString();
  const assessment = await prisma.assessment.create({
    data: {
      userId: req.userId!,
      goal: a.goal,
      experience: a.experience,
      daysPerWeek: a.daysPerWeek,
      minutesPerSession: a.minutesPerSession,
      equipment: a.equipment,
      activityLevel: a.activityLevel,
      limitations: JSON.stringify(a.limitations),
      preferMornings: a.preferMornings,
      recommendedLevel: level,
      programId: chosen?.id ?? null,
      scheduleDays: JSON.stringify(days),
      rationale: JSON.stringify(rationale),
      cautions: JSON.stringify(cautions),
      nextCheckOn: nextCheckDate(today),
    },
  });

  // Body stats: whatever they just gave us, else whatever we already had.
  const existing = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { heightCm: true, weightKg: true, birthYear: true, gender: true },
  });
  const body = {
    heightCm: parsed.data.heightCm ?? existing?.heightCm ?? null,
    weightKg: parsed.data.weightKg ?? existing?.weightKg ?? null,
    birthYear: parsed.data.birthYear ?? existing?.birthYear ?? null,
    gender: parsed.data.gender ?? existing?.gender ?? null,
  };

  // Calorie and macro targets used to belong only to the /setup wizard, which Google
  // sign-ups never reached — leaving them with an empty Tracker and nothing to
  // measure against. The intake knows enough to work them out, so it does.
  const targets = computeTargets(a.goal, a.activityLevel, a.daysPerWeek, body);

  // The plan is only real if it changes the app: the schedule, the level, the
  // reminder hour, the nutrition targets, and the programme they are on.
  await prisma.user.update({
    where: { id: req.userId! },
    data: {
      scheduleJson: JSON.stringify(schedule),
      fitnessLevel: level,
      fitnessGoal: a.goal,
      reminderHour: a.preferMornings ? 7 : 19,
      goalCalories: targets.calories,
      goalProtein: targets.protein,
      goalCarbs: targets.carbs,
      goalFat: targets.fat,
      // Finishing the intake IS being onboarded, whichever way they signed up.
      onboarded: true,
      ...(parsed.data.heightCm ? { heightCm: parsed.data.heightCm } : {}),
      ...(parsed.data.weightKg ? { weightKg: parsed.data.weightKg } : {}),
      ...(parsed.data.birthYear ? { birthYear: parsed.data.birthYear } : {}),
      ...(parsed.data.gender ? { gender: parsed.data.gender } : {}),
    },
  }).catch(() => {});

  if (chosen) {
    await prisma.programEnrollment.upsert({
      where: { userId_programId: { userId: req.userId!, programId: chosen.id } },
      create: { userId: req.userId!, programId: chosen.id },
      update: { status: 'active', completedAt: null, startedAt: new Date() },
    }).catch(() => {});
  }

  const firstLesson = chosen
    // titleAr has to be selected or there is nothing for localizeResponse to overlay,
    // and the Arabic plan screen shows an English lesson name as its main call to action.
    ? await prisma.lesson.findFirst({
        where: { programId: chosen.id },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, titleAr: true },
      })
    : null;

  res.status(201).json({
    assessment: { ...assessment, limitations: a.limitations, scheduleDays: days, rationale, cautions },
    program: chosen,
    schedule,
    firstLesson,
    targets,
  });
});

/* ------------------------------ Adaptation ------------------------------ */

/**
 * The weekly check-in: how the last two weeks actually went, and the one change
 * worth making. Proposals are recorded so a declined suggestion is not repeated,
 * and nothing changes until the user accepts.
 */
assessmentRouter.get('/checkin', async (req: AuthedRequest, res) => {
  const latest = await prisma.assessment.findFirst({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return res.json({ hasPlan: false });

  const adherence = await adherenceFor(req.userId!, latest.daysPerWeek);
  const sinceDeload = await weeksSinceDeload(req.userId!, latest.createdAt);
  const deload = await activeDeload(req.userId!);

  // Don't re-offer something they turned down in the last fortnight.
  const recentlyDismissed = await prisma.planAdjustment.findMany({
    where: { userId: req.userId!, dismissedAt: { gte: new Date(Date.now() - 14 * 86400000) } },
    select: { kind: true },
  });
  const muted = new Set(recentlyDismissed.map((d) => d.kind));

  // Give a change time to work before proposing another. Without this, accepting
  // "drop to 3 days" is immediately followed by "drop to 2" — the same fortnight of
  // missed sessions still being counted against a plan that only just changed.
  const lastApplied = await prisma.planAdjustment.findFirst({
    where: { userId: req.userId!, appliedAt: { not: null } },
    orderBy: { appliedAt: 'desc' },
    select: { appliedAt: true },
  });
  const inCooldown =
    !!lastApplied?.appliedAt && Date.now() - lastApplied.appliedAt.getTime() < 7 * 86400000;

  const outcome = await measureOutcome(req.userId!, latest.goal, latest.createdAt, adherence.done);

  let proposal = inCooldown ? null : proposeChange(adherence, latest.daysPerWeek, sinceDeload);

  // Showing up but getting nowhere is a different problem from not showing up, and
  // it needs the opposite advice. More days would not fix a stalled plan, so when
  // attendance is good and the outcome is flat we say so instead of asking for more.
  if (!inCooldown && !proposal && adherence.ratio >= 0.7 && outcome.verdict === 'flat') {
    proposal = {
      kind: 'increase',
      reason: outcome.message,
      fromDays: latest.daysPerWeek,
      toDays: Math.min(6, latest.daysPerWeek + 1),
    };
  }
  // And never ask someone to add days while they are already losing weight too fast.
  if (proposal?.kind === 'increase' && outcome.verdict === 'too_fast') proposal = null;

  if (proposal && muted.has(proposal.kind)) proposal = null;

  // Surface an existing open proposal rather than creating a duplicate.
  let pending = inCooldown
    ? null
    : await prisma.planAdjustment.findFirst({
        where: { userId: req.userId!, appliedAt: null, dismissedAt: null },
        orderBy: { createdAt: 'desc' },
      });

  if (!pending && proposal) {
    pending = await prisma.planAdjustment.create({
      data: {
        userId: req.userId!,
        kind: proposal.kind,
        reason: JSON.stringify(proposal.reason),
        fromDays: proposal.fromDays ?? null,
        toDays: proposal.toDays ?? null,
      },
    });
  }

  res.json({
    hasPlan: true,
    settling: inCooldown,
    adherence,
    outcome,
    deload: deload ? { activeUntil: deload.activeUntil } : null,
    proposal: pending
      ? { id: pending.id, kind: pending.kind, reason: safeObj(pending.reason), fromDays: pending.fromDays, toDays: pending.toDays }
      : null,
  });
});

function safeObj(v: string | null): { en: string; ar: string } | null {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

/** Accept a proposal. This is the only place a plan changes without a full re-assessment. */
assessmentRouter.post('/adjust/:id', async (req: AuthedRequest, res) => {
  const adj = await prisma.planAdjustment.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!adj) return res.status(404).json({ error: 'Not found' });
  if (adj.appliedAt) return res.json({ ok: true, alreadyApplied: true });

  const latest = await prisma.assessment.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } });
  if (!latest) return res.status(400).json({ error: 'No plan to adjust' });

  const today = dayString();

  if (adj.kind === 'deload') {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    await prisma.planAdjustment.update({
      where: { id: adj.id },
      data: { appliedAt: new Date(), activeUntil: until.toISOString().slice(0, 10) },
    });
    return res.json({ ok: true, kind: 'deload', activeUntil: until.toISOString().slice(0, 10) });
  }

  // Everything else changes how many days a week they train, and rewrites the split.
  const toDays = adj.toDays ?? latest.daysPerWeek;
  const days = spreadDays(toDays);

  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { scheduleJson: true } });
  let schedule: { day: string; focus: string; groups: string[] }[] = [];
  try {
    schedule = user?.scheduleJson ? JSON.parse(user.scheduleJson) : [];
  } catch { schedule = []; }

  const rebuilt = schedule.length
    ? rescheduleDays(schedule, days)
    : ALL_DAYS.map((day, i) => (days.includes(day)
        ? { day, focus: groupsFor(i, toDays, latest.goal).join(' + '), groups: groupsFor(i, toDays, latest.goal) }
        : { day, focus: 'Rest', groups: [] }));

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.userId! }, data: { scheduleJson: JSON.stringify(rebuilt) } }),
    // The plan of record moves too, so the next check-in measures against the new
    // target rather than the one they just told us was too much.
    prisma.assessment.update({
      where: { id: latest.id },
      data: { daysPerWeek: toDays, scheduleDays: JSON.stringify(days), nextCheckOn: nextCheckDate(today) },
    }),
    prisma.planAdjustment.update({ where: { id: adj.id }, data: { appliedAt: new Date() } }),
  ]);

  res.json({ ok: true, kind: adj.kind, daysPerWeek: toDays, schedule: rebuilt });
});

assessmentRouter.post('/adjust/:id/dismiss', async (req: AuthedRequest, res) => {
  await prisma.planAdjustment
    .updateMany({ where: { id: req.params.id, userId: req.userId! }, data: { dismissedAt: new Date() } });
  res.json({ ok: true });
});

/**
 * How the plan has changed over time. Assessments are kept as a series precisely so
 * someone can see "started at Beginner, 2 days — now Intermediate, 4 days", which is
 * the most motivating thing the coaching layer can show.
 */
assessmentRouter.get('/history', async (req: AuthedRequest, res) => {
  const [plans, changes] = await Promise.all([
    prisma.assessment.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
      select: { id: true, recommendedLevel: true, daysPerWeek: true, goal: true, createdAt: true, programId: true },
    }),
    prisma.planAdjustment.findMany({
      where: { userId: req.userId!, appliedAt: { not: null } },
      orderBy: { appliedAt: 'asc' },
      select: { kind: true, fromDays: true, toDays: true, appliedAt: true },
    }),
  ]);

  const first = plans[0];
  const last = plans[plans.length - 1];
  res.json({
    plans,
    changes,
    journey: first && last && plans.length > 0
      ? {
          fromLevel: first.recommendedLevel,
          toLevel: last.recommendedLevel,
          fromDays: first.daysPerWeek,
          toDays: last.daysPerWeek,
          days: Math.floor((Date.now() - first.createdAt.getTime()) / 86400000),
        }
      : null,
  });
});
