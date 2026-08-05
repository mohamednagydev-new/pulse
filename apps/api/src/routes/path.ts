import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { localizeResponse } from '../lib/localize';

/**
 * The guided path.
 *
 * Programs used to be a library: eighteen cards, three of them called "First
 * Program", no memory of where you stopped. This turns them into a route - the app
 * recommends where to start, remembers how far you got, and hands you the next
 * program when you finish one.
 *
 * Progress is derived from LessonCompletion rather than stored on the enrolment, so
 * it can never drift from the lessons the user actually finished.
 */
export const pathRouter = Router();
pathRouter.use(requireAuth, localizeResponse);

const LEVEL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/** Goal -> the kind of training that serves it.
 *  Keys are the ones the onboarding wizard actually stores (see GOALS there);
 *  anything unrecognised simply falls through to no type preference. */
const GOAL_TYPE: Record<string, 'WORKOUT' | 'YOGA'> = {
  lose_weight: 'WORKOUT',
  build_muscle: 'WORKOUT',
  stay_fit: 'YOGA',
};

async function progressFor(userId: string, programId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { programId },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, titleAr: true, order: true, durationSec: true, thumbnail: true },
  });
  const done = await prisma.lessonCompletion.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const doneSet = new Set(done.map((d) => d.lessonId));

  const withState = lessons.map((l) => ({ ...l, completed: doneSet.has(l.id) }));
  const next = withState.find((l) => !l.completed) ?? null;
  return { lessons: withState, total: lessons.length, completed: doneSet.size, next };
}

/** Mark an enrolment finished once every lesson is done. Safe to call repeatedly. */
async function settleIfFinished(userId: string, programId: string, completed: number, total: number) {
  if (total === 0 || completed < total) return false;
  const row = await prisma.programEnrollment.findUnique({
    where: { userId_programId: { userId, programId } },
    select: { status: true },
  });
  if (!row || row.status === 'completed') return row?.status === 'completed';
  await prisma.programEnrollment.update({
    where: { userId_programId: { userId, programId } },
    data: { status: 'completed', completedAt: new Date() },
  });
  return true;
}

/** The program to offer after finishing `program` — same coach type, next level up. */
async function suggestNext(userId: string, program: { id: string; level: string | null; coachId: string | null }) {
  const coach = program.coachId
    ? await prisma.coach.findUnique({ where: { id: program.coachId }, select: { type: true } })
    : null;
  const taken = await prisma.programEnrollment.findMany({ where: { userId }, select: { programId: true } });
  const skip = new Set(taken.map((t) => t.programId));

  const idx = program.level ? LEVEL_ORDER.indexOf(program.level) : -1;
  const wanted = idx >= 0 ? [program.level!, LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)]] : LEVEL_ORDER;

  const candidates = await prisma.program.findMany({
    // audience: null — specialised programmes are chosen deliberately, not handed out.
    where: { id: { notIn: [...skip] }, audience: null, ...(coach ? { coach: { type: coach.type } } : {}) },
    include: { coach: { select: { name: true, type: true } }, _count: { select: { lessons: true } } },
    orderBy: { order: 'asc' },
  });
  // Same level first (more of what they just managed), then one step up.
  return candidates.find((c) => c.level === wanted[0]) ?? candidates.find((c) => c.level === wanted[1]) ?? candidates[0] ?? null;
}

/* --------------------------------- Endpoints --------------------------------- */

/** What the user is partway through — drives the Home card. */
pathRouter.get('/current', async (req: AuthedRequest, res) => {
  const active = await prisma.programEnrollment.findFirst({
    where: { userId: req.userId!, status: 'active' },
    orderBy: { startedAt: 'desc' },
    include: { program: { include: { coach: { select: { name: true, type: true } } } } },
  });

  if (!active) {
    // Nothing running. If they finished something recently and haven't picked up
    // anything since, offer the follow-on here rather than a generic prompt — the
    // handoff should not depend on which screen happened to close the enrolment.
    const recent = await prisma.programEnrollment.findFirst({
      where: {
        userId: req.userId!,
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { completedAt: 'desc' },
      include: { program: { include: { coach: { select: { name: true, type: true } } } } },
    });
    if (recent) {
      return res.json({
        enrolled: false,
        justFinished: recent.program,
        next: await suggestNext(req.userId!, recent.program),
      });
    }
    return res.json({ enrolled: false });
  }

  const p = await progressFor(req.userId!, active.programId);

  // Every lesson done but the enrolment still open (they finished from the lesson
  // screen, never came back here) — close it out now and offer what comes next.
  if (await settleIfFinished(req.userId!, active.programId, p.completed, p.total)) {
    const next = await suggestNext(req.userId!, active.program);
    return res.json({ enrolled: false, justFinished: active.program, next });
  }

  res.json({
    enrolled: true,
    program: active.program,
    startedAt: active.startedAt,
    total: p.total,
    completed: p.completed,
    next: p.next,
  });
});

/** Program detail with per-lesson completion and the enrolment state. */
pathRouter.get('/program/:id', async (req: AuthedRequest, res) => {
  const program = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: { coach: true },
  });
  if (!program) return res.status(404).json({ error: 'Not found' });

  const p = await progressFor(req.userId!, program.id);
  const enrollment = await prisma.programEnrollment.findUnique({
    where: { userId_programId: { userId: req.userId!, programId: program.id } },
    select: { status: true, startedAt: true },
  });

  let next = null;
  if (enrollment && (await settleIfFinished(req.userId!, program.id, p.completed, p.total))) {
    next = await suggestNext(req.userId!, program);
  }

  res.json({
    ...program,
    lessons: p.lessons,
    total: p.total,
    completed: p.completed,
    nextLesson: p.next,
    status: p.total > 0 && p.completed >= p.total ? 'completed' : enrollment?.status ?? null,
    startedAt: enrollment?.startedAt ?? null,
    nextProgram: next,
  });
});

pathRouter.post('/program/:id/start', async (req: AuthedRequest, res) => {
  const program = await prisma.program.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!program) return res.status(404).json({ error: 'Not found' });

  const row = await prisma.programEnrollment.upsert({
    where: { userId_programId: { userId: req.userId!, programId: program.id } },
    create: { userId: req.userId!, programId: program.id },
    // Re-starting a finished program reopens it rather than creating a duplicate.
    update: { status: 'active', completedAt: null, startedAt: new Date() },
  });
  const p = await progressFor(req.userId!, program.id);
  res.status(201).json({ ...row, next: p.next, total: p.total, completed: p.completed });
});

pathRouter.delete('/program/:id/start', async (req: AuthedRequest, res) => {
  await prisma.programEnrollment
    .delete({ where: { userId_programId: { userId: req.userId!, programId: req.params.id } } })
    .catch(() => {});
  res.json({ ok: true });
});

/**
 * What to start, for someone with no coach telling them.
 * Uses the goal and experience captured at onboarding — which until now were
 * written at sign-up and never read by anything.
 */
pathRouter.get('/recommended', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { fitnessLevel: true, fitnessGoal: true },
  });
  const level = LEVEL_ORDER.includes(String(user?.fitnessLevel).toUpperCase())
    ? String(user!.fitnessLevel).toUpperCase()
    : 'BEGINNER';
  const type = GOAL_TYPE[String(user?.fitnessGoal ?? '')] ?? null;

  const taken = await prisma.programEnrollment.findMany({ where: { userId: req.userId! }, select: { programId: true } });
  const skip = new Set(taken.map((t) => t.programId));

  const all = await prisma.program.findMany({
    where: { id: { notIn: [...skip] }, audience: null },
    include: { coach: { select: { id: true, name: true, type: true, avatarUrl: true } }, _count: { select: { lessons: true } } },
    orderBy: { order: 'asc' },
  });

  // Rank rather than filter: a thin catalogue should still return something.
  const scored = all
    .map((p) => {
      let score = 0;
      if (p.level === level) score += 3;
      else if (p.level === null) score += 1;
      if (type && p.coach?.type === type) score += 2;
      if (p._count.lessons > 0) score += 1;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);

  res.json({ level, goal: user?.fitnessGoal ?? null, programs: scored.slice(0, 6) });
});
