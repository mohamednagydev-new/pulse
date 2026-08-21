import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { notifyUser } from './push';
import { emitToUser } from '../lib/realtime';
import { weekStart, startOfDayTz, daysAgoStr, dayString } from '../lib/time';

// Org layer: coach/gym invite links + attribution, gym-scoped leaderboard,
// public TV board, and privacy-safe owner analytics.
// NOTE: some endpoints here are public by design (invite preview, TV board) —
// auth is applied per-route, not router-wide.
export const orgRouter = Router();

/** 8-char base32 invite code — short enough to type off a poster, long enough
 *  (32^8 ≈ 1.1e12) that guessing one is not a realistic attack. */
function genCode(): string {
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from(randomBytes(8), (b) => B32[b % 32]).join('');
}

// ---- My coach invite code (get-or-create) ----
orgRouter.post('/coach/code', requireAuth, async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { isCoach: true, coachInviteCode: true },
  });
  if (!me?.isCoach) return res.status(403).json({ error: 'Coaches only' });

  let code = me.coachInviteCode;
  if (!code) {
    // Retry on the (astronomically rare) unique collision instead of 500ing.
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = genCode();
      try {
        await prisma.user.update({ where: { id: req.userId! }, data: { coachInviteCode: candidate } });
        code = candidate;
      } catch {
        /* unique collision — next attempt */
      }
    }
    if (!code) return res.status(500).json({ error: 'Could not create a code, try again' });
  }
  res.json({ code, url: `${env.WEB_ORIGIN}/invite/${code}` });
});

// ---- Gym invite code (get-or-create) — gym manager, or admin with {partnerId} ----
orgRouter.post('/gym/code', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ partnerId: z.string().min(1).optional() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Bad request' });

  const gym =
    req.role === 'ADMIN' && parsed.data.partnerId
      ? await prisma.partner.findFirst({ where: { id: parsed.data.partnerId, type: 'gym', active: true } })
      : await prisma.partner.findFirst({ where: { managerUserId: req.userId!, type: 'gym', active: true } });
  if (!gym) return res.status(403).json({ error: 'No gym you manage was found' });

  let code = gym.inviteCode;
  if (!code) {
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = genCode();
      try {
        await prisma.partner.update({ where: { id: gym.id }, data: { inviteCode: candidate } });
        code = candidate;
      } catch {
        /* unique collision — next attempt */
      }
    }
    if (!code) return res.status(500).json({ error: 'Could not create a code, try again' });
  }
  res.json({ code, url: `${env.WEB_ORIGIN}/invite/g/${code}` });
});

/** Resolve an invite code to its owner — coach codes and gym codes live in
 *  separate columns, so one lookup path serves both URL shapes. */
async function resolveCode(code: string) {
  const coach = await prisma.user.findUnique({ where: { coachInviteCode: code } });
  if (coach?.isCoach) return { kind: 'coach' as const, coach };
  const gym = await prisma.partner.findFirst({ where: { inviteCode: code, type: 'gym', active: true } });
  if (gym) return { kind: 'gym' as const, gym };
  return null;
}

// ---- PUBLIC invite preview — what a newcomer sees before signing up ----
orgRouter.get('/invite/:code', async (req, res) => {
  const hit = await resolveCode(req.params.code);
  if (!hit) return res.status(404).json({ error: 'Invite not found' });

  if (hit.kind === 'coach') {
    const clients = await prisma.coachRequest.count({
      where: { coachUserId: hit.coach.id, status: 'accepted' },
    });
    return res.json({
      type: 'coach',
      name: `${hit.coach.firstName} ${hit.coach.lastName}`.trim(),
      avatarUrl: hit.coach.avatarUrl,
      headline: hit.coach.coachHeadline,
      verified: hit.coach.coachVerified,
      clients,
    });
  }
  const members = await prisma.user.count({ where: { gymId: hit.gym.id } });
  res.json({
    type: 'gym',
    name: hit.gym.name,
    nameAr: hit.gym.nameAr,
    logo: hit.gym.logo,
    city: hit.gym.city,
    members,
  });
});

// ---- Redeem (idempotent): land pre-connected to the coach / gym ----
orgRouter.post('/invite/:code/redeem', requireAuth, async (req: AuthedRequest, res) => {
  const hit = await resolveCode(req.params.code);
  if (!hit) return res.status(404).json({ error: 'Invite not found' });
  const meId = req.userId!;

  if (hit.kind === 'coach') {
    const coach = hit.coach;
    if (coach.id === meId) return res.status(400).json({ error: "You can't join your own invite" });

    const wasClient = await prisma.coachRequest.findUnique({
      where: { clientId_coachUserId: { clientId: meId, coachUserId: coach.id } },
    });
    await prisma.coachRequest.upsert({
      where: { clientId_coachUserId: { clientId: meId, coachUserId: coach.id } },
      update: { status: 'accepted' },
      create: { clientId: meId, coachUserId: coach.id, status: 'accepted' },
    });

    // Buddy connection — canonical check is either-direction (see social.ts),
    // so look both ways before creating ours.
    const conn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: meId, addresseeId: coach.id },
          { requesterId: coach.id, addresseeId: meId },
        ],
      },
    });
    if (!conn) {
      await prisma.connection.create({ data: { requesterId: meId, addresseeId: coach.id, status: 'accepted' } });
    } else if (conn.status !== 'accepted') {
      await prisma.connection.update({ where: { id: conn.id }, data: { status: 'accepted' } });
    }

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: meId, followingId: coach.id } },
      update: {},
      create: { followerId: meId, followingId: coach.id },
    });

    // Attribution: the coach who brought the user in gets the referral credit —
    // first touch only, never overwritten.
    const me = await prisma.user.findUnique({ where: { id: meId }, select: { firstName: true, lastName: true, referredById: true } });
    if (me && me.referredById === null) {
      await prisma.user.update({ where: { id: meId }, data: { referredById: coach.id } });
    }

    // Only ping the coach on the FIRST join — idempotent retries stay silent.
    if (!wasClient || wasClient.status !== 'accepted') {
      const clientName = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim() || 'A new client';
      emitToUser(coach.id, 'notify', { type: 'coach' });
      notifyUser(coach.id, {
        title: 'New client joined! 🎉',
        titleAr: 'انضملك متدرب جديد! 🎉',
        body: `${clientName} joined you through your invite link.`,
        bodyAr: `${clientName} انضملك من لينك الدعوة بتاعك.`,
        url: '/coach-dashboard',
        type: 'coach',
      }).catch(() => {});
    }

    return res.json({
      type: 'coach',
      redeemed: true,
      target: { id: coach.id, name: `${coach.firstName} ${coach.lastName}`.trim() },
    });
  }

  // Gym code
  const gym = hit.gym;
  const me = await prisma.user.findUnique({ where: { id: meId }, select: { firstName: true, lastName: true, gymId: true } });
  if (me?.gymId && me.gymId !== gym.id && req.query.force !== '1') {
    const current = await prisma.partner.findUnique({ where: { id: me.gymId }, select: { name: true, nameAr: true } });
    return res.json({ alreadyInGym: true, current: { name: current?.name ?? 'another gym', nameAr: current?.nameAr ?? null } });
  }

  const alreadyMember = me?.gymId === gym.id;
  if (!alreadyMember) {
    await prisma.user.update({ where: { id: meId }, data: { gymId: gym.id, gymJoinedAt: new Date() } });
    if (gym.managerUserId && gym.managerUserId !== meId) {
      const memberName = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim() || 'A new member';
      emitToUser(gym.managerUserId, 'notify', { type: 'general' });
      notifyUser(gym.managerUserId, {
        title: 'New gym member! 🏋️',
        titleAr: 'عضو جديد في الجيم! 🏋️',
        body: `${memberName} joined ${gym.name} through your invite link.`,
        bodyAr: `${memberName} انضم لـ${gym.nameAr ?? gym.name} من لينك الدعوة.`,
        url: `/partner/${gym.id}`,
        type: 'general',
      }).catch(() => {});
    }
  }

  res.json({ type: 'gym', redeemed: true, target: { id: gym.id, name: gym.name } });
});

// ---- PUBLIC gym board — feeds the TV screen at the gym (/tv/:id) ----
// Cache-friendly by design: nothing personal beyond first name + avatar, the
// same fields any member already sees on the in-app leaderboard.
orgRouter.get('/gym/:id/board', async (req, res) => {
  const gym = await prisma.partner.findFirst({
    where: { id: req.params.id, type: 'gym', active: true },
    select: { id: true, name: true, nameAr: true, logo: true, inviteCode: true },
  });
  if (!gym) return res.status(404).json({ error: 'Gym not found' });

  // Self-sufficient board: if the manager never opened the invite card, the
  // code doesn't exist yet and the TV showed no QR — the one thing a brand-new
  // gym board is FOR. The code is public by nature (it lives on a poster), so
  // minting it here is safe and idempotent.
  if (!gym.inviteCode) {
    for (let attempt = 0; attempt < 5 && !gym.inviteCode; attempt++) {
      const candidate = genCode();
      try {
        await prisma.partner.update({ where: { id: gym.id }, data: { inviteCode: candidate } });
        gym.inviteCode = candidate;
      } catch {
        /* unique collision — next attempt */
      }
    }
  }

  const members = await prisma.user.findMany({
    where: { gymId: gym.id },
    select: { id: true, firstName: true, avatarUrl: true, level: true, currentStreak: true },
  });
  const ids = members.map((m) => m.id);

  // XP this week (Egyptian week — starts Saturday, same clock the leagues use).
  const since = startOfDayTz(weekStart());
  const grouped = ids.length
    ? await prisma.xpEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, createdAt: { gte: since } },
        _sum: { amount: true },
      })
    : [];
  const xpByUser = new Map(grouped.map((g) => [g.userId, g._sum.amount ?? 0]));

  const top10 = members
    .map((m) => ({
      firstName: m.firstName,
      avatarUrl: m.avatarUrl,
      level: m.level,
      currentStreak: m.currentStreak,
      xp: xpByUser.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const topStreaks = [...members]
    .filter((m) => m.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 3)
    .map((m) => ({ firstName: m.firstName, avatarUrl: m.avatarUrl, streak: m.currentStreak }));

  res.json({
    gym: { id: gym.id, name: gym.name, nameAr: gym.nameAr, logo: gym.logo },
    memberCount: members.length,
    weekStart: weekStart(),
    top10,
    topStreaks,
    // Full join URL only — the QR on the TV points here; the raw code alone
    // is useless without it, so this is the one shape we expose publicly.
    joinUrl: gym.inviteCode ? `${env.WEB_ORIGIN}/invite/g/${gym.inviteCode}` : null,
  });
});

// ---- Owner analytics — the gym manager's dashboard numbers ----
// Members opted in by redeeming this gym's code, so name + inactivity is within
// expectation. NO health, food, or weight data ever crosses this endpoint.
orgRouter.get('/gym/mine/analytics', requireAuth, async (req: AuthedRequest, res) => {
  const gym = await prisma.partner.findFirst({
    where: { managerUserId: req.userId!, type: 'gym', active: true },
    select: { id: true },
  });
  if (!gym) return res.status(403).json({ error: 'No gym you manage was found' });

  const members = await prisma.user.findMany({
    where: { gymId: gym.id },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, lastActiveOn: true, gymJoinedAt: true },
  });
  const ids = members.map((m) => m.id);

  const today = dayString();
  const monthStart = `${today.slice(0, 7)}-01`;
  const sevenDaysAgo = daysAgoStr(7);

  const joinedThisMonth = members.filter(
    (m) => m.gymJoinedAt && m.gymJoinedAt >= startOfDayTz(monthStart)
  ).length;
  const active7d = members.filter((m) => m.lastActiveOn && m.lastActiveOn >= sevenDaysAgo).length;

  const workoutsThisWeek = ids.length
    ? await prisma.xpEvent.count({
        where: { userId: { in: ids }, reason: 'workout-session', createdAt: { gte: startOfDayTz(weekStart()) } },
      })
    : 0;

  // Quiet members: seen before but not in the last 7 days. Recently-lapsed
  // first — those are the saves; someone gone 60 days needs more than a call.
  const dayMs = 86400000;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const atRisk = members
    .filter((m) => m.lastActiveOn && m.lastActiveOn < sevenDaysAgo)
    .map((m) => ({
      firstName: m.firstName,
      lastName: m.lastName,
      avatarUrl: m.avatarUrl,
      daysQuiet: Math.max(1, Math.round((todayMs - Date.parse(`${m.lastActiveOn}T00:00:00Z`)) / dayMs)),
    }))
    .sort((a, b) => a.daysQuiet - b.daysQuiet)
    .slice(0, 20);

  res.json({
    members: members.length,
    joinedThisMonth,
    active7d,
    active7dPct: members.length ? Math.round((active7d / members.length) * 100) : 0,
    workoutsThisWeek,
    atRisk,
  });
});

// ---------------- Gym membership WITHOUT the QR ----------------
// The QR at the front desk is proof enough on its own; «أنا بتمرن هنا» tapped
// on the gym's public page is a CLAIM — so it queues for the manager to
// approve, and approval is what actually sets User.gymId.

// ---- My status with this gym (drives the button on the gym page) ----
orgRouter.get('/gym/:id/membership', requireAuth, async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { gymId: true } });
  if (me?.gymId === req.params.id) return res.json({ status: 'member' });
  const pending = await prisma.gymJoinRequest.findUnique({
    where: { partnerId_userId: { partnerId: req.params.id, userId: req.userId! } },
  });
  res.json({ status: pending?.status === 'pending' ? 'pending' : 'none' });
});

// ---- "I train at this gym" ----
orgRouter.post('/gym/:id/join-request', requireAuth, async (req: AuthedRequest, res) => {
  const gym = await prisma.partner.findFirst({
    where: { id: req.params.id, type: 'gym', active: true },
    select: { id: true, name: true, nameAr: true, managerUserId: true },
  });
  if (!gym) return res.status(404).json({ error: 'Gym not found' });

  const me = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { gymId: true, firstName: true, lastName: true },
  });
  if (me?.gymId === gym.id) return res.json({ status: 'member' });

  // Re-request after a decline is allowed — people do join gyms later.
  await prisma.gymJoinRequest.upsert({
    where: { partnerId_userId: { partnerId: gym.id, userId: req.userId! } },
    update: { status: 'pending', createdAt: new Date() },
    create: { partnerId: gym.id, userId: req.userId! },
  });

  if (gym.managerUserId && gym.managerUserId !== req.userId) {
    const name = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim() || 'Someone';
    emitToUser(gym.managerUserId, 'notify', { type: 'general' });
    notifyUser(gym.managerUserId, {
      title: 'Membership request 🏋️',
      titleAr: 'طلب انضمام للجيم 🏋️',
      body: `${name} says they train at ${gym.name} — approve them from Partner Hub.`,
      bodyAr: `${name} بيقول إنه بيتمرن في ${gym.nameAr ?? gym.name} — اعتمده من صفحة الشريك.`,
      url: '/partner-hub',
      type: 'general',
    }).catch(() => {});
  }
  res.json({ status: 'pending' });
});

// ---- Manager: pending requests ----
orgRouter.get('/gym/mine/join-requests', requireAuth, async (req: AuthedRequest, res) => {
  const gym = await prisma.partner.findFirst({
    where: { managerUserId: req.userId!, type: 'gym', active: true },
    select: { id: true },
  });
  if (!gym) return res.status(403).json({ error: 'No gym you manage was found' });

  const requests = await prisma.gymJoinRequest.findMany({
    where: { partnerId: gym.id, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: requests.map((r) => r.userId) } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, currentStreak: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(requests.map((r) => ({ id: r.id, createdAt: r.createdAt, user: byId.get(r.userId) ?? null })).filter((r) => r.user));
});

// ---- Manager: approve / decline ----
orgRouter.post('/gym/join-requests/:id/:action', requireAuth, async (req: AuthedRequest, res) => {
  const action = req.params.action;
  if (action !== 'approve' && action !== 'decline') return res.status(400).json({ error: 'Bad action' });

  const request = await prisma.gymJoinRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.status !== 'pending') return res.status(404).json({ error: 'Request not found' });
  const gym = await prisma.partner.findFirst({
    where: { id: request.partnerId, managerUserId: req.userId!, type: 'gym' },
    select: { id: true, name: true, nameAr: true },
  });
  if (!gym) return res.status(403).json({ error: 'Not your gym' });

  await prisma.gymJoinRequest.update({
    where: { id: request.id },
    data: { status: action === 'approve' ? 'accepted' : 'declined' },
  });
  if (action === 'approve') {
    await prisma.user.update({ where: { id: request.userId }, data: { gymId: gym.id, gymJoinedAt: new Date() } });
    notifyUser(request.userId, {
      title: `Welcome to ${gym.name}! 🏋️`,
      titleAr: `أهلاً بيك في ${gym.nameAr ?? gym.name}! 🏋️`,
      body: 'Your membership was approved — your workouts now count on the gym leaderboard.',
      bodyAr: 'الجيم اعتمد عضويتك — تمارينك بقت بتتحسب في لوحة صدارة الجيم.',
      url: `/partner/${gym.id}`,
      type: 'general',
    }).catch(() => {});
  } else {
    notifyUser(request.userId, {
      title: 'Membership request',
      titleAr: 'طلب العضوية',
      body: `${gym.name} couldn't verify your membership. If you train there, ask at the front desk for the join QR.`,
      bodyAr: `${gym.nameAr ?? gym.name} مقدرش يتأكد من عضويتك. لو بتتمرن هناك فعلاً، اطلب كود الانضمام من الاستقبال.`,
      url: `/partner/${gym.id}`,
      type: 'general',
    }).catch(() => {});
  }
  res.json({ ok: true, action });
});
