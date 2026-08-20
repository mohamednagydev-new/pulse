import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { weekStart, monthKey, startOfDayTz, endOfDayTz, dayString } from '../lib/time';

export const squadsRouter = Router();
squadsRouter.use(requireAuth);

const MAX_MEMBERS = 8;

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  currentStreak: true,
} as const;

// ---- helpers ---------------------------------------------------------------

/** 6-char A-Z0-9 invite code, collision-checked against existing squads. */
async function newInviteCode(): Promise<string> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 30; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const taken = await prisma.squad.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error('Could not allocate an invite code');
}

function membershipOf(userId: string) {
  return prisma.squadMember.findFirst({ where: { userId }, select: { squadId: true } });
}

/** Workouts (LessonCompletions) per user since the given instant. */
async function workoutCounts(userIds: string[], from: Date, to?: Date): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.lessonCompletion.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, completedAt: { gte: from, ...(to ? { lte: to } : {}) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}

async function squadWorkoutTotal(squadId: string, from: Date, to: Date): Promise<number> {
  const members = await prisma.squadMember.findMany({ where: { squadId }, select: { userId: true } });
  if (members.length === 0) return 0;
  return prisma.lessonCompletion.count({
    where: { userId: { in: members.map((m) => m.userId) }, completedAt: { gte: from, lte: to } },
  });
}

/**
 * The full squad payload the pages render: members with this week's workout
 * counts, the current battle (both sides' names + live totals), and — for
 * members only — the invite code + share text.
 */
async function squadView(squadId: string, viewerId: string) {
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: { members: { orderBy: { joinedAt: 'asc' } } },
  });
  if (!squad) return null;

  const isMember = squad.members.some((m) => m.userId === viewerId);
  const memberIds = squad.members.map((m) => m.userId);
  const users = await prisma.user.findMany({ where: { id: { in: memberIds } }, select: memberSelect });
  const umap = new Map(users.map((u) => [u.id, u]));

  const weekFrom = startOfDayTz(weekStart());
  const weekly = await workoutCounts(memberIds, weekFrom);

  const members = squad.members
    .map((m) => {
      const u = umap.get(m.userId);
      if (!u) return null;
      return { ...u, weekWorkouts: weekly.get(m.userId) ?? 0 };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.weekWorkouts - a.weekWorkouts || b.currentStreak - a.currentStreak);

  // Current battle — live totals for both sides over the battle window.
  const raw = await prisma.squadBattle.findFirst({
    where: { status: 'active', OR: [{ aId: squad.id }, { bId: squad.id }] },
    orderBy: { createdAt: 'desc' },
  });
  let battle: {
    id: string;
    startsOn: string;
    endsOn: string;
    daysLeft: number;
    us: { id: string; name: string; emoji: string | null; total: number };
    them: { id: string; name: string; emoji: string | null; total: number };
  } | null = null;
  if (raw) {
    const otherId = raw.aId === squad.id ? raw.bId : raw.aId;
    const other = await prisma.squad.findUnique({ where: { id: otherId }, select: { id: true, name: true, emoji: true } });
    if (other) {
      const from = startOfDayTz(raw.startsOn);
      const to = endOfDayTz(raw.endsOn);
      const [usTotal, themTotal] = await Promise.all([
        squadWorkoutTotal(squad.id, from, to),
        squadWorkoutTotal(otherId, from, to),
      ]);
      const daysLeft = Math.max(
        0,
        Math.ceil((endOfDayTz(raw.endsOn).getTime() - Date.now()) / 86_400_000),
      );
      battle = {
        id: raw.id,
        startsOn: raw.startsOn,
        endsOn: raw.endsOn,
        daysLeft,
        us: { id: squad.id, name: squad.name, emoji: squad.emoji, total: usTotal },
        them: { id: other.id, name: other.name, emoji: other.emoji, total: themTotal },
      };
    }
  }

  const shareText = isMember
    ? `⚔️ Join my squad "${squad.name}"! Enter code ${squad.inviteCode} → ${env.WEB_ORIGIN}/squads`
    : undefined;

  return {
    id: squad.id,
    name: squad.name,
    emoji: squad.emoji,
    creatorId: squad.creatorId,
    isMember,
    memberCount: members.length,
    maxMembers: MAX_MEMBERS,
    members,
    battle,
    ...(isMember ? { inviteCode: squad.inviteCode, shareText } : {}),
  };
}

// ---- create ----------------------------------------------------------------

squadsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(30),
      emoji: z.string().trim().min(1).max(8).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Squad name must be 2-30 characters' });

  const existing = await membershipOf(req.userId!);
  if (existing) return res.status(409).json({ error: 'You are already in a squad — leave it first' });

  const inviteCode = await newInviteCode();
  const squad = await prisma.squad.create({
    data: {
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? null,
      inviteCode,
      creatorId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
  });
  res.status(201).json({ id: squad.id, inviteCode: squad.inviteCode });
});

// ---- join by invite code ---------------------------------------------------

squadsRouter.post('/join', async (req: AuthedRequest, res) => {
  const parsed = z.object({ code: z.string().trim().min(4).max(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter the invite code' });

  const existing = await membershipOf(req.userId!);
  if (existing) return res.status(409).json({ error: 'You are already in a squad — leave it first' });

  const squad = await prisma.squad.findUnique({
    where: { inviteCode: parsed.data.code.toUpperCase() },
    include: { members: { select: { userId: true } } },
  });
  if (!squad) return res.status(404).json({ error: 'No squad with that code' });
  if (squad.members.length >= MAX_MEMBERS) return res.status(409).json({ error: 'This squad is full (8 members)' });

  // The unique(squadId,userId) constraint makes a double-tap harmless.
  await prisma.squadMember
    .create({ data: { squadId: squad.id, userId: req.userId! } })
    .catch(() => null);
  res.json({ id: squad.id });
});

// ---- leave -----------------------------------------------------------------

squadsRouter.post('/leave', async (req: AuthedRequest, res) => {
  const mine = await membershipOf(req.userId!);
  if (!mine) return res.status(404).json({ error: 'You are not in a squad' });

  await prisma.squadMember.deleteMany({ where: { squadId: mine.squadId, userId: req.userId! } });
  const left = await prisma.squadMember.count({ where: { squadId: mine.squadId } });
  if (left === 0) {
    // Last one out turns off the lights — an empty squad is unjoinable noise.
    await prisma.squad.delete({ where: { id: mine.squadId } }).catch(() => {});
  }
  res.json({ ok: true });
});

// ---- my squad --------------------------------------------------------------

squadsRouter.get('/mine', async (req: AuthedRequest, res) => {
  const mine = await membershipOf(req.userId!);
  if (!mine) return res.json(null);
  res.json(await squadView(mine.squadId, req.userId!));
});

// ---- gym league (registered BEFORE '/:id' so the literal path wins) --------

/** This month's gym leaderboard: workouts by users whose gymId points at a
 *  Partner of type 'gym', counted over the current calendar month. */
squadsRouter.get('/gym-league/table', async (_req: AuthedRequest, res) => {
  const gyms = await prisma.partner.findMany({
    where: { type: 'gym' },
    select: { id: true, name: true, nameAr: true },
  });
  if (gyms.length === 0) return res.json({ month: monthKey(), table: [] });

  const users = await prisma.user.findMany({
    where: { gymId: { in: gyms.map((g) => g.id) } },
    select: { id: true, gymId: true },
  });
  const monthFrom = startOfDayTz(`${monthKey()}-01`);
  const counts = await workoutCounts(users.map((u) => u.id), monthFrom);

  const perGym = new Map<string, { members: number; workouts: number }>();
  for (const u of users) {
    const row = perGym.get(u.gymId!) ?? { members: 0, workouts: 0 };
    row.members += 1;
    row.workouts += counts.get(u.id) ?? 0;
    perGym.set(u.gymId!, row);
  }

  const table = gyms
    .map((g) => ({
      gymId: g.id,
      name: g.name,
      nameAr: g.nameAr,
      members: perGym.get(g.id)?.members ?? 0,
      workouts: perGym.get(g.id)?.workouts ?? 0,
    }))
    .filter((g) => g.members > 0)
    .sort((a, b) => b.workouts - a.workouts || b.members - a.members)
    .slice(0, 20);

  res.json({ month: monthKey(), day: dayString(), table });
});

// ---- public squad view -----------------------------------------------------

squadsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const view = await squadView(req.params.id, req.userId!);
  if (!view) return res.status(404).json({ error: 'Squad not found' });
  res.json(view);
});
