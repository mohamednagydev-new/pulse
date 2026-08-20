import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth';
import { notifyUser } from './push';
import { audit } from '../lib/audit';

// Admin operations: user management actions, unified moderation queue, and
// per-module controls added by the admin overhaul. Separate file from admin.ts
// so parallel workstreams never collide in that 1300-line router.
export const adminOpsRouter = Router();
adminOpsRouter.use(requireAuth, requireAdmin);

// =========================================================================
// Users — server-side table (search / filters / sort / pagination / CSV)
// =========================================================================

const PAGE_SIZE = 50;

/** Safe row shape for the table. NEVER selects passwordHash or tokens. */
const USER_ROW_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isCoach: true,
  coachVerified: true,
  coachFeatured: true,
  avatarUrl: true,
  level: true,
  xp: true,
  currentStreak: true,
  streakFreezes: true,
  createdAt: true,
  lastSeenAt: true,
  lastActiveOn: true,
  bannedAt: true,
  banReason: true,
  _count: { select: { pushSubs: true } },
} as const;

/** Shared filter builder so the table and the CSV export can never disagree. */
function userListWhere(q: Record<string, unknown>) {
  const and: any[] = [];
  const text = String(q.q ?? '').trim();
  if (text) {
    and.push({ OR: [{ email: { contains: text } }, { firstName: { contains: text } }, { lastName: { contains: text } }] });
  }
  const role = String(q.role ?? '');
  if (role === 'admin') and.push({ role: 'ADMIN' });
  if (role === 'user') and.push({ role: 'USER' });
  if (role === 'coach') and.push({ isCoach: true });
  // The "Coach requests" queue: applied (isCoach) but not yet let into the directory.
  if (role === 'coach-pending') and.push({ isCoach: true, coachVerified: false });
  if (String(q.coach ?? '') === '1') and.push({ isCoach: true });
  // Any window 1-365 days — presets in the UI, but the API takes arbitrary days.
  const inactive = Number(q.inactive);
  if (Number.isInteger(inactive) && inactive >= 1 && inactive <= 365) {
    const cutoff = new Date(Date.now() - inactive * 86400000);
    // Never seen (null) only counts as inactive when the account is older than the window.
    and.push({ OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, createdAt: { lt: cutoff } }] });
  }
  if (String(q.joined ?? '') === 'week') {
    and.push({ createdAt: { gte: new Date(Date.now() - 7 * 86400000) } });
  }
  if (String(q.banned ?? '') === '1') and.push({ bannedAt: { not: null } });
  // Retention segments: joined before the window AND seen inside it (retained),
  // or joined 14+ days ago and quiet for 14+ (churned).
  const segment = String(q.segment ?? '');
  if (segment === 'retained7' || segment === 'retained30') {
    const days = segment === 'retained7' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    and.push({ createdAt: { lt: cutoff }, lastSeenAt: { gte: cutoff } });
  } else if (segment === 'churned') {
    const cutoff = new Date(Date.now() - 14 * 86400000);
    and.push({ createdAt: { lt: cutoff }, OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null }] });
  } else if (segment === 'active1' || segment === 'active7' || segment === 'active30') {
    // Currently-active users: opened the app inside the window.
    const days = segment === 'active1' ? 1 : segment === 'active7' ? 7 : 30;
    and.push({ lastSeenAt: { gte: new Date(Date.now() - days * 86400000) } });
  } else if (segment === 'daily') {
    // "Daily" = a live activity streak (lesson/food/workout on consecutive days),
    // not just opening the app.
    and.push({ currentStreak: { gte: 3 } });
  }
  return and.length ? { AND: and } : {};
}

function userListOrder(q: Record<string, unknown>) {
  const dir: 'asc' | 'desc' = String(q.dir ?? '') === 'asc' ? 'asc' : 'desc';
  switch (String(q.sort ?? 'joined')) {
    case 'lastActive':
      // SQLite sorts NULL smallest: desc puts never-seen users last, which is what you want.
      return [{ lastSeenAt: dir }];
    case 'level':
      return [{ level: dir }, { xp: dir }];
    case 'streak':
      return [{ currentStreak: dir }];
    default:
      return [{ createdAt: dir }];
  }
}

/** GET /api/admin-ops/users?q&role&coach&inactive&joined&sort&dir&page → {rows, total, page, pageSize} */
adminOpsRouter.get('/users', async (req, res) => {
  const where = userListWhere(req.query as Record<string, unknown>);
  const page = Math.max(1, Number(req.query.page) || 1);
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_ROW_SELECT,
      orderBy: userListOrder(req.query as Record<string, unknown>),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  res.json({ rows, total, page, pageSize: PAGE_SIZE });
});

/** GET /api/admin-ops/users.csv — same filters as the table, capped at 5000 rows. */
adminOpsRouter.get('/users.csv', async (req, res) => {
  const rows = await prisma.user.findMany({
    where: userListWhere(req.query as Record<string, unknown>),
    select: USER_ROW_SELECT,
    orderBy: userListOrder(req.query as Record<string, unknown>),
    take: 5000,
  });
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = 'id,firstName,lastName,email,role,isCoach,coachVerified,level,xp,currentStreak,streakFreezes,joined,lastSeenAt,lastActiveOn,pushSubs,banned';
  const lines = rows.map((u) =>
    [
      u.id, u.firstName, u.lastName, u.email, u.role,
      u.isCoach ? 1 : 0, u.coachVerified ? 1 : 0,
      u.level, u.xp, u.currentStreak, u.streakFreezes,
      u.createdAt.toISOString(), u.lastSeenAt?.toISOString() ?? '', u.lastActiveOn ?? '',
      u._count.pushSubs, u.bannedAt ? 1 : 0,
    ].map(esc).join(','),
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send([header, ...lines].join('\n'));
});

/** GET /api/admin-ops/users/:id/detail — everything the expanded drawer shows. */
adminOpsRouter.get('/users/:id/detail', async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true,
      isCoach: true, coachVerified: true, coachFeatured: true,
      level: true, xp: true, currentStreak: true, longestStreak: true, streakFreezes: true,
      createdAt: true, lastSeenAt: true, lastActiveOn: true, gymId: true, gymJoinedAt: true,
      country: true, preferredLang: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });

  const [workouts, liftLogs, posts, comments, foodLogs, weighIns, gym, coachLinks, clientLinks] = await Promise.all([
    prisma.lessonCompletion.count({ where: { userId: id } }),
    prisma.liftLog.count({ where: { userId: id } }),
    prisma.feedPost.count({ where: { userId: id } }),
    prisma.postComment.count({ where: { userId: id } }),
    prisma.calorieEntry.count({ where: { userId: id } }),
    prisma.weightLog.count({ where: { userId: id } }),
    user.gymId ? prisma.partner.findUnique({ where: { id: user.gymId }, select: { id: true, name: true, city: true } }) : null,
    prisma.coachRequest.findMany({ where: { clientId: id, status: 'accepted' }, select: { coachUserId: true } }),
    prisma.coachRequest.findMany({ where: { coachUserId: id, status: 'accepted' }, select: { clientId: true } }),
  ]);

  const linkedIds = Array.from(new Set([...coachLinks.map((c) => c.coachUserId), ...clientLinks.map((c) => c.clientId)]));
  const linked = linkedIds.length
    ? await prisma.user.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      })
    : [];
  const byId = new Map(linked.map((u) => [u.id, u]));

  res.json({
    user,
    counts: { workouts, liftLogs, posts, comments, foodLogs, weighIns },
    gym,
    coaches: coachLinks.map((c) => byId.get(c.coachUserId)).filter(Boolean),
    clients: clientLinks.map((c) => byId.get(c.clientId)).filter(Boolean),
  });
});

/** POST /api/admin-ops/users/:id/role {role} — toggle ADMIN. You cannot demote yourself. */
adminOpsRouter.post('/users/:id/role', async (req: AuthedRequest, res) => {
  const parsed = z.object({ role: z.enum(['USER', 'ADMIN']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.userId && parsed.data.role === 'USER') {
    return res.status(400).json({ error: "You can't demote yourself" });
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    });
    audit(req.userId!, 'user.role', { targetType: 'user', targetId: user.id, detail: `Role set to ${parsed.data.role}` });
    res.json(user);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

/** POST /api/admin-ops/users/:id/coach-verified {verified?} — toggle the badge (coaches only). */
adminOpsRouter.post('/users/:id/coach-verified', async (req: AuthedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { isCoach: true, coachVerified: true } });
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (!target.isCoach) return res.status(400).json({ error: 'Not a coach' });
  const verified = typeof req.body?.verified === 'boolean' ? req.body.verified : !target.coachVerified;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { coachVerified: verified },
    select: { id: true, coachVerified: true },
  });
  audit(req.userId!, 'user.coach-verify', {
    targetType: 'user',
    targetId: user.id,
    detail: verified ? 'Coach badge verified' : 'Coach badge removed',
  });
  res.json(user);
});

/** POST /api/admin-ops/users/:id/push {title, body} — direct push + in-app notification. */
adminOpsRouter.post('/users/:id/push', async (req: AuthedRequest, res) => {
  const parsed = z.object({ title: z.string().min(1).max(80), body: z.string().min(1).max(300) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Title and body are required' });
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!target) return res.status(404).json({ error: 'Not found' });
  await notifyUser(target.id, { title: parsed.data.title, body: parsed.data.body, url: '/', type: 'general' });
  audit(req.userId!, 'user.push', { targetType: 'user', targetId: target.id, detail: `Sent push "${parsed.data.title}"` });
  res.json({ ok: true });
});

/** POST /api/admin-ops/users/:id/freeze — grant one streak freeze (max 3). */
adminOpsRouter.post('/users/:id/freeze', async (req: AuthedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { streakFreezes: true } });
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (target.streakFreezes >= 3) return res.status(400).json({ error: 'Already at the maximum (3 freezes)' });
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { streakFreezes: { increment: 1 } },
    select: { id: true, streakFreezes: true },
  });
  audit(req.userId!, 'user.freeze', { targetType: 'user', targetId: user.id, detail: `Granted a streak freeze (now ${user.streakFreezes})` });
  res.json(user);
});

/** DELETE /api/admin-ops/users/:id {confirmEmail} — hard delete with typed confirmation.
 *
 *  Prisma cascades cover the relation-backed tables (XpEvent, FeedPost + its
 *  reactions/comments, CalorieEntry, WeightLog, LessonCompletion, Bookmark,
 *  PushSubscription, RefreshToken, Notification? no — plain, ChallengeParticipant,
 *  LeagueMember, Conversations, DeviceConnection, ImportedActivity, MusicTrack,
 *  Subscription, SupportTicket→SetNull, Assessment, PlanAdjustment, CustomRecipe,
 *  Follow, UserBadge, DietEnrollment? no — plain userId).
 *  Everything referencing the user by a PLAIN field is swept explicitly below. */
adminOpsRouter.delete('/users/:id', async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (id === req.userId) return res.status(400).json({ error: "You can't delete your own account" });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (target.role === 'ADMIN') return res.status(400).json({ error: 'Demote the admin to USER first' });
  const confirm = String(req.body?.confirmEmail ?? '').trim().toLowerCase();
  if (confirm !== target.email.toLowerCase()) {
    return res.status(400).json({ error: "Confirmation email doesn't match" });
  }

  // Plain-FK orphan sweep (schema has no cascade for these).
  await prisma.notification.deleteMany({ where: { userId: id } });
  await prisma.connection.deleteMany({ where: { OR: [{ requesterId: id }, { addresseeId: id }] } });
  await prisma.block.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } });
  await prisma.eventRsvp.deleteMany({ where: { userId: id } });
  await prisma.reelFavorite.deleteMany({ where: { userId: id } });
  await prisma.reelWatch.deleteMany({ where: { userId: id } });
  await prisma.spinClaim.deleteMany({ where: { userId: id } });
  await prisma.questClaim.deleteMany({ where: { userId: id } });
  await prisma.waterLog.deleteMany({ where: { userId: id } });
  await prisma.bodyLog.deleteMany({ where: { userId: id } });
  await prisma.liftLog.deleteMany({ where: { userId: id } });
  await prisma.postReaction.deleteMany({ where: { userId: id } });
  await prisma.pollVote.deleteMany({ where: { userId: id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
  await prisma.groupParticipant.deleteMany({ where: { userId: id } });
  await prisma.groupSession.deleteMany({ where: { coachUserId: id } });
  await prisma.coachRating.deleteMany({ where: { OR: [{ coachUserId: id }, { clientId: id }] } });
  await prisma.coachRequest.deleteMany({ where: { OR: [{ coachUserId: id }, { clientId: id }] } });
  await prisma.coachWorkout.deleteMany({ where: { coachUserId: id } });
  await prisma.coachProgram.deleteMany({ where: { coachUserId: id } });
  await prisma.coachProgramEnrollment.deleteMany({ where: { OR: [{ userId: id }, { assignedBy: id }] } });
  await prisma.dietEnrollment.deleteMany({ where: { userId: id } });
  await prisma.dMThread.deleteMany({ where: { OR: [{ userAId: id }, { userBId: id }] } });
  await prisma.chatReport.deleteMany({ where: { reporterId: id } });
  await prisma.buddyChallenge.deleteMany({ where: { OR: [{ challengerId: id }, { opponentId: id }] } });
  await prisma.activityInvite.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } });
  await prisma.gymJoinRequest.deleteMany({ where: { userId: id } });
  await prisma.routine.deleteMany({ where: { userId: id } });
  await prisma.lead.deleteMany({ where: { userId: id } });
  await prisma.aiUsage.deleteMany({ where: { userId: id } });
  await prisma.weeklyRecap.deleteMany({ where: { userId: id } });
  await prisma.event.deleteMany({ where: { userId: id } });
  // Self-created challenges die with the creator; group ones keep running for the others.
  await prisma.challenge.deleteMany({ where: { ownerId: id, kind: 'personal' } });
  // A partner page must not point at a deleted manager.
  await prisma.partner.updateMany({ where: { managerUserId: id }, data: { managerUserId: null } });

  await prisma.user.delete({ where: { id } });
  console.log(`[admin-ops] ADMIN ${req.userId} deleted user ${id} (${target.email})`);
  audit(req.userId!, 'user.delete', { targetType: 'user', targetId: id, detail: `Deleted account ${target.email}` });
  res.json({ ok: true });
});

// =========================================================================
// Moderation — the delete-and-warn halves the unified queue needs.
// (Plain list/delete/resolve endpoints already live in admin.ts and are
//  reused by the client; only what was missing is added here.)
// =========================================================================

const WARN = {
  title: 'Community guidelines ⚠️',
  body: 'A moderator removed one of your posts or messages because it broke the community guidelines. Repeated violations can lead to account removal.',
};

/** POST /api/admin-ops/moderation/posts/:id/delete-warn — delete a feed post AND push a warning to its author. */
adminOpsRouter.post('/moderation/posts/:id/delete-warn', async (req: AuthedRequest, res) => {
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.id }, select: { id: true, userId: true } });
  if (!post) return res.status(404).json({ error: 'Not found' });
  await prisma.feedPost.delete({ where: { id: post.id } });
  await notifyUser(post.userId, { ...WARN, type: 'general' }).catch(() => {});
  audit(req.userId!, 'moderation.post-delete', { targetType: 'post', targetId: post.id, detail: 'Deleted post and warned its author' });
  res.json({ ok: true });
});

/** POST /api/admin-ops/moderation/challenge-messages/:id/delete-warn — same for a challenge-room message. */
adminOpsRouter.post('/moderation/challenge-messages/:id/delete-warn', async (req: AuthedRequest, res) => {
  const msg = await prisma.challengeMessage.findUnique({ where: { id: req.params.id }, select: { id: true, userId: true } });
  if (!msg) return res.status(404).json({ error: 'Not found' });
  await prisma.challengeMessage.delete({ where: { id: msg.id } });
  if (msg.userId) await notifyUser(msg.userId, { ...WARN, type: 'general' }).catch(() => {});
  audit(req.userId!, 'moderation.message-delete', { targetType: 'post', targetId: msg.id, detail: 'Deleted challenge message and warned its author' });
  res.json({ ok: true });
});

/** POST /api/admin-ops/moderation/chat-reports/:id/delete-thread {warn?} —
 *  delete the reported DM thread (messages cascade), resolve every open report
 *  on it, and optionally warn the reported party (the participant who is not
 *  the reporter). */
adminOpsRouter.post('/moderation/chat-reports/:id/delete-thread', async (req: AuthedRequest, res) => {
  const report = await prisma.chatReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Not found' });
  const thread = await prisma.dMThread.findUnique({ where: { id: report.threadId } });
  if (thread) {
    await prisma.dMThread.delete({ where: { id: thread.id } });
    if (req.body?.warn) {
      const other = thread.userAId === report.reporterId ? thread.userBId : thread.userAId;
      await notifyUser(other, { ...WARN, type: 'general' }).catch(() => {});
    }
  }
  await prisma.chatReport.updateMany({ where: { threadId: report.threadId, status: 'open' }, data: { status: 'resolved' } });
  console.log(`[admin-ops] ADMIN ${req.userId} deleted DM thread ${report.threadId} via report ${report.id}`);
  audit(req.userId!, 'moderation.chat-thread-delete', {
    targetType: 'post',
    targetId: report.threadId,
    detail: `Deleted DM thread via report ${report.id}${req.body?.warn ? ' and warned the reported user' : ''}`,
  });
  res.json({ ok: true });
});

/* ------------------------- Reported posts queue ------------------------- */

/** GET /moderation/post-reports — pending feed-post reports, grouped by post. */
adminOpsRouter.get('/moderation/post-reports', async (_req, res) => {
  const pending = await prisma.postReport.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } });
  if (pending.length === 0) return res.json([]);
  const postIds = [...new Set(pending.map((r) => r.postId))];
  const posts = await prisma.feedPost.findMany({
    where: { id: { in: postIds } },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  // Reports whose post is already gone have nothing left to moderate — auto-resolve.
  const orphaned = postIds.filter((id) => !byId.has(id));
  if (orphaned.length) {
    await prisma.postReport.updateMany({ where: { postId: { in: orphaned } }, data: { status: 'resolved' } });
  }
  const reporterIds = [...new Set(pending.map((r) => r.reporterId))];
  const reporters = await prisma.user.findMany({ where: { id: { in: reporterIds } }, select: { id: true, firstName: true } });
  const rName = new Map(reporters.map((u) => [u.id, u.firstName]));
  res.json(
    postIds
      .filter((id) => byId.has(id))
      .map((id) => {
        const rows = pending.filter((r) => r.postId === id);
        return {
          post: byId.get(id),
          count: rows.length,
          reporters: rows.map((r) => rName.get(r.reporterId) ?? '?'),
          reasons: [...new Set(rows.map((r) => r.reason).filter(Boolean))],
          latestAt: rows[0].createdAt,
        };
      }),
  );
});

/** Dismiss all pending reports on a post — the content stays up. */
adminOpsRouter.post('/moderation/post-reports/:postId/dismiss', async (req: AuthedRequest, res) => {
  await prisma.postReport.updateMany({ where: { postId: req.params.postId, status: 'pending' }, data: { status: 'resolved' } });
  audit(req.userId!, 'moderation.report-dismiss', { targetType: 'post', targetId: req.params.postId, detail: 'Dismissed pending reports — post stays up' });
  res.json({ ok: true });
});

/** Delete a reported post (optionally warning its author) and resolve its reports. */
adminOpsRouter.post('/moderation/post-reports/:postId/delete', async (req: AuthedRequest, res) => {
  const warn = Boolean(req.body?.warn);
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.postId }, select: { id: true, userId: true } });
  if (post) {
    await prisma.feedPost.delete({ where: { id: post.id } });
    if (warn) {
      notifyUser(post.userId, {
        title: 'Post removed by moderators',
        titleAr: 'تم حذف منشورك',
        body: 'Your post was reported and removed for violating community guidelines.',
        bodyAr: 'منشورك اتبلغ عنه واتشال لمخالفته ارشادات المجتمع.',
        url: '/community',
        type: 'general',
      }).catch(() => {});
    }
  }
  await prisma.postReport.updateMany({ where: { postId: req.params.postId, status: 'pending' }, data: { status: 'resolved' } });
  if (post) {
    audit(req.userId!, 'moderation.post-delete', {
      targetType: 'post',
      targetId: post.id,
      detail: `Deleted reported post${warn ? ' and warned its author' : ''}`,
    });
  }
  res.json({ ok: true, deleted: Boolean(post) });
});

/** POST /users/:id/ban {reason?} — toggle suspension. Banning also revokes every
 *  refresh token, so the account is out within one access-token TTL (~15 min). */
adminOpsRouter.post('/users/:id/ban', async (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "You can't ban yourself" });
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true, bannedAt: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'ADMIN') return res.status(400).json({ error: 'Demote the admin role first' });
  if (target.bannedAt) {
    await prisma.user.update({ where: { id: target.id }, data: { bannedAt: null, banReason: null } });
    audit(req.userId!, 'user.unban', { targetType: 'user', targetId: target.id, detail: 'Lifted suspension' });
    return res.json({ ok: true, banned: false });
  }
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : null;
  await prisma.user.update({ where: { id: target.id }, data: { bannedAt: new Date(), banReason: reason } });
  await prisma.refreshToken.deleteMany({ where: { userId: target.id } });
  audit(req.userId!, 'user.ban', { targetType: 'user', targetId: target.id, detail: `Banned — ${reason || 'no reason given'}` });
  res.json({ ok: true, banned: true });
});

/** POST /users/:id/force-logout — revoke every session without banning. */
adminOpsRouter.post('/users/:id/force-logout', async (req: AuthedRequest, res) => {
  const gone = await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
  audit(req.userId!, 'user.force-logout', { targetType: 'user', targetId: req.params.id, detail: `Revoked ${gone.count} session(s)` });
  res.json({ ok: true, sessions: gone.count });
});

// =========================================================================
// Live group sessions — see the schedule, and start the class timer when a
// coach no-shows (participants otherwise sit in a silent room).
// =========================================================================

/** GET /group-sessions — recent + upcoming, with live room occupancy. */
adminOpsRouter.get('/group-sessions', async (_req: AuthedRequest, res) => {
  const { groupLiveCounts } = await import('../lib/realtime');
  const sessions = await prisma.groupSession.findMany({
    where: { scheduledAt: { gte: new Date(Date.now() - 6 * 3_600_000), lte: new Date(Date.now() + 7 * 86_400_000) } },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
  const coaches = await prisma.user.findMany({
    where: { id: { in: [...new Set(sessions.map((s) => s.coachUserId))] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const coachMap = new Map(coaches.map((c) => [c.id, c]));
  const counts = await prisma.groupParticipant.groupBy({
    by: ['sessionId'],
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.sessionId, c._count]));
  const live = groupLiveCounts();
  res.json(
    sessions.map((s) => ({
      ...s,
      coach: coachMap.get(s.coachUserId) ?? null,
      participantCount: countMap.get(s.id) ?? 0,
      liveCount: live[s.id] ?? 0,
    })),
  );
});

/** POST /group-sessions/:id/timer {action, durationSec} — remote start/stop. */
adminOpsRouter.post('/group-sessions/:id/timer', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({ action: z.enum(['start', 'stop']), durationSec: z.number().int().min(10).max(3600).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const session = await prisma.groupSession.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!session) return res.status(404).json({ error: 'Not found' });
  const { setGroupTimer } = await import('../lib/realtime');
  setGroupTimer(session.id, parsed.data.action, parsed.data.durationSec ?? 60, req.userId!);
  audit(req.userId!, 'session.timer', {
    targetType: 'session',
    targetId: session.id,
    detail: parsed.data.action === 'start' ? `Started room timer (${parsed.data.durationSec ?? 60}s)` : 'Stopped room timer',
  });
  res.json({ ok: true });
});
