import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { createFeedPost, areConnected } from '../lib/social';
import { processVideo } from '../lib/video';
import { emitToUser, onlineCount } from '../lib/realtime';
import { notifyUser } from './push';

export const socialRouter = Router();
socialRouter.use(requireAuth);

socialRouter.get('/presence', (_req, res) => res.json({ online: onlineCount() }));

// Coach directory — users who are coaches.
socialRouter.get('/coaches', async (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim();
  const following = await prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } });
  const set = new Set(following.map((f) => f.followingId));
  // ?specialty=nutrition lets the meal plan send someone straight to a nutritionist
  // instead of dropping them into a list of forty trainers to scroll through.
  const specialty = String(req.query.specialty || '').trim();

  const coaches = await prisma.user.findMany({
    where: {
      isCoach: true,
      id: { not: req.userId! },
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { coachHeadline: { contains: q } }] } : {}),
      ...(specialty ? { coachSpecialties: { contains: specialty } } : {}),
    },
    select: { ...userSelect, coachHeadline: true, coachSpecialties: true, currentStreak: true, coachFeatured: true },
    orderBy: [{ coachFeatured: 'desc' }, { coachVerified: 'desc' }, { xp: 'desc' }],
    take: 40,
  });
  res.json(coaches.map((c) => ({ ...c, isFollowing: set.has(c.id) })));
});

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, isCoach: true, coachVerified: true } as const;

type ConnectionStatus = 'none' | 'pending_out' | 'pending_in' | 'connected';

/** Compute connectionStatus (from `me`'s perspective) for a set of other user ids in one query. */
async function connectionStatusMap(me: string, ids: string[]): Promise<Map<string, ConnectionStatus>> {
  const map = new Map<string, ConnectionStatus>();
  if (!ids.length) return map;
  const rows = await prisma.connection.findMany({
    where: {
      OR: [
        { requesterId: me, addresseeId: { in: ids } },
        { addresseeId: me, requesterId: { in: ids } },
      ],
    },
  });
  for (const r of rows) {
    const other = r.requesterId === me ? r.addresseeId : r.requesterId;
    // 'connected' wins: a stray pending row in the other direction must not mask an accepted one.
    if (r.status === 'accepted') map.set(other, 'connected');
    else if (map.get(other) === 'connected') continue;
    else if (r.requesterId === me) map.set(other, 'pending_out');
    else map.set(other, 'pending_in');
  }
  return map;
}

// Shared media upload for user posts (photos + videos).
const tmpDir = path.join(env.UPLOAD_DIR, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir, limits: { fileSize: 300 * 1024 * 1024 } });

function shapePost(p: any, me: string) {
  return {
    id: p.id,
    kind: p.kind,
    text: p.text,
    textAr: p.textAr,
    mediaType: p.mediaType,
    mediaUrl: p.mediaUrl,
    refType: p.refType,
    refId: p.refId,
    createdAt: p.createdAt,
    user: p.user,
    reactionCount: p.reactions?.length ?? 0,
    myReaction: p.reactions?.find((r: any) => r.userId === me)?.emoji ?? null,
    reactions: summarizeReactions(p.reactions ?? []),
    comments: (p.comments ?? []).map((c: any) => ({ id: c.id, text: c.text, createdAt: c.createdAt, user: c.user })),
    commentCount: p.comments?.length ?? 0,
  };
}

function summarizeReactions(reactions: any[]) {
  const counts: Record<string, number> = {};
  for (const r of reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  return counts;
}

// ---- Feed (me + people I follow) ----
socialRouter.get('/feed', async (req: AuthedRequest, res) => {
  const following = await prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } });
  const ids = [req.userId!, ...following.map((f) => f.followingId)];

  const include = {
    user: { select: userSelect },
    reactions: true,
    comments: { include: { user: { select: userSelect } }, orderBy: { createdAt: 'asc' as const } },
  };

  // The pinned announcement reaches everyone, not only people you follow, and
  // stops appearing the moment its window closes - no cron needed.
  const [pinned, posts] = await Promise.all([
    prisma.feedPost.findFirst({
      where: { pinned: true, OR: [{ pinnedUntil: null }, { pinnedUntil: { gt: new Date() } }] },
      include,
    }),
    prisma.feedPost.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include,
    }),
  ]);

  // Drop it from the ordinary list so a follower never sees it twice.
  const rest = posts.filter((p) => p.id !== pinned?.id);
  const shaped = rest.map((p) => shapePost(p, req.userId!));
  res.json(pinned ? [{ ...shapePost(pinned, req.userId!), pinned: true, pinnedUntil: pinned.pinnedUntil }, ...shaped] : shaped);
});

// ---- Upload media for a post (image or video) ----
socialRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const mime = req.file.mimetype || '';
  const okImage = /^image\/(jpe?g|png|webp|gif)$/.test(mime); // no svg/html
  const okVideo = /^video\//.test(mime);
  if (!okImage && !okVideo) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Only JPG, PNG, WEBP, GIF images or videos are allowed' });
  }
  if (okVideo) {
    const processed = await processVideo(req.file.path);
    const video = await prisma.video.create({ data: processed });
    return res.json({ mediaType: 'video', mediaUrl: video.id });
  }
  const imagesDir = path.join(env.UPLOAD_DIR, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  // Extension comes from the validated mime, never the client's filename —
  // "photo.html" with an image/png mime must not be stored (and later served) as HTML.
  const ext = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[mime] ?? '.jpg';
  const name = `${req.file.filename}${ext}`;
  fs.renameSync(req.file.path, path.join(imagesDir, name));
  res.json({ mediaType: 'image', mediaUrl: `images/${name}` });
});

// ---- Create a post (text and/or media) ----
socialRouter.post('/posts', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      text: z.string().max(500).optional(),
      mediaType: z.enum(['image', 'video']).optional(),
      mediaUrl: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success || (!parsed.data.text?.trim() && !parsed.data.mediaUrl)) {
    return res.status(400).json({ error: 'Add a message or media' });
  }
  // mediaUrl must point at a real upload — a free string would let a post embed
  // an arbitrary path (or someone else's private file) into everyone's feed.
  if (parsed.data.mediaUrl) {
    if (parsed.data.mediaType === 'video') {
      const vid = await prisma.video.findUnique({ where: { id: parsed.data.mediaUrl }, select: { id: true } });
      if (!vid) return res.status(400).json({ error: 'Invalid media' });
    } else if (parsed.data.mediaType === 'image') {
      if (!/^images\/[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif)$/i.test(parsed.data.mediaUrl)) {
        return res.status(400).json({ error: 'Invalid media' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid media' });
    }
  }
  const post = await createFeedPost(req.userId!, 'text', parsed.data.text, undefined, undefined, {
    mediaType: parsed.data.mediaType,
    mediaUrl: parsed.data.mediaUrl,
  });
  res.status(201).json(shapePost({ ...post, reactions: [], comments: [] }, req.userId!));
});

// ---- Reactions (toggle) ----
socialRouter.post('/posts/:id/react', async (req: AuthedRequest, res) => {
  // Same 8-char cap as the socket relay — an unbounded string here would be
  // stored and re-rendered to every feed reader.
  const emoji = (typeof req.body?.emoji === 'string' ? req.body.emoji : '💪').slice(0, 8) || '💪';
  const existing = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId: req.params.id, userId: req.userId! } },
  });
  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      return res.json({ removed: true });
    }
    await prisma.postReaction.update({ where: { id: existing.id }, data: { emoji } });
  } else {
    const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await prisma.postReaction.create({ data: { postId: req.params.id, userId: req.userId!, emoji } });
    if (post.userId !== req.userId) {
      emitToUser(post.userId, 'notify', { type: 'reaction', emoji });
      // Named, not anonymous — "Ahmed cheered you" pulls people back into the
      // app far harder than "someone reacted". The cheer emoji gets its own copy.
      const reactor = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } }).catch(() => null);
      const who = reactor?.firstName || 'Someone';
      const cheer = emoji === '👏';
      notifyUser(post.userId, {
        title: cheer ? `${who} cheered you 👏` : `${who} reacted ${emoji}`,
        titleAr: cheer ? `${who} شجّعك 👏` : `${who} تفاعل ${emoji}`,
        body: cheer ? 'Your workout got some love — keep it rolling' : 'On your post in the community',
        bodyAr: cheer ? 'تمرينك عجب الناس — كمّل بنفس الروح' : 'على منشورك في المجتمع',
        url: '/community',
        type: 'reaction',
      });
    }
  }
  res.json({ ok: true, emoji });
});

// ---- Comments ----
socialRouter.post('/posts/:id/comments', async (req: AuthedRequest, res) => {
  const parsed = z.object({ text: z.string().min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // A pinned announcement collects replies for a set window, then closes. Existing
  // comments stay readable; new ones stop.
  if (post.pinned && post.pinnedUntil && post.pinnedUntil.getTime() < Date.now()) {
    return res.status(410).json({ error: 'This announcement is closed for replies.' });
  }

  const comment = await prisma.postComment.create({
    data: { postId: req.params.id, userId: req.userId!, text: parsed.data.text },
    include: { user: { select: userSelect } },
  });
  if (post.userId !== req.userId) {
    emitToUser(post.userId, 'notify', { type: 'comment' });
    notifyUser(post.userId, { title: 'New comment', titleAr: 'تعليق جديد', body: `${comment.user.firstName}: ${comment.text.slice(0, 60)}`, url: '/community', type: 'comment' });
  }
  res.status(201).json({ id: comment.id, text: comment.text, createdAt: comment.createdAt, user: comment.user });
});

// ---- Follow / unfollow ----
socialRouter.post('/users/:id/follow', async (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Can't follow yourself" });
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } },
    create: { followerId: req.userId!, followingId: req.params.id },
    update: {},
  });
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  emitToUser(req.params.id, 'notify', { type: 'follow' });
  notifyUser(req.params.id, { title: 'New follower', titleAr: 'متابع جديد', body: `${me?.firstName ?? 'Someone'} started following you`, bodyAr: `${me?.firstName ?? 'حد'} بدأ يتابعك`, url: '/community' });
  res.json({ ok: true });
});

// ---- Weekly leaderboard (me + people I follow, XP earned in last 7 days) ----
socialRouter.get('/leaderboard/weekly', async (req: AuthedRequest, res) => {
  const following = await prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } });
  const ids = [req.userId!, ...following.map((f) => f.followingId)];
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const events = await prisma.xpEvent.groupBy({
    by: ['userId'],
    where: { userId: { in: ids }, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  const map = new Map(events.map((e) => [e.userId, e._sum.amount ?? 0]));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true },
  });
  const rows = users
    .map((u) => ({ ...u, xp: map.get(u.id) ?? 0, isMe: u.id === req.userId }))
    .sort((a, b) => b.xp - a.xp)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  res.json(rows);
});

socialRouter.delete('/users/:id/follow', async (req: AuthedRequest, res) => {
  await prisma.follow.deleteMany({ where: { followerId: req.userId!, followingId: req.params.id } });
  res.json({ ok: true });
});

// ---- People search ----
socialRouter.get('/users', async (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim();
  const following = await prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } });
  const followingIds = new Set(following.map((f) => f.followingId));
  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId! },
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }] } : {}),
    },
    select: { ...userSelect, currentStreak: true },
    take: 30,
    orderBy: { xp: 'desc' },
  });
  const statuses = await connectionStatusMap(req.userId!, users.map((u) => u.id));
  res.json(users.map((u) => ({ ...u, isFollowing: followingIds.has(u.id), connectionStatus: statuses.get(u.id) ?? 'none' })));
});

// ---- Public profile ----
socialRouter.get('/users/:id', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { ...userSelect, bio: true, xp: true, currentStreak: true, longestStreak: true, coachHeadline: true, coachBio: true, coachSpecialties: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const [followers, followingCount, completions, isFollowing, posts] = await Promise.all([
    prisma.follow.count({ where: { followingId: req.params.id } }),
    prisma.follow.count({ where: { followerId: req.params.id } }),
    prisma.lessonCompletion.count({ where: { userId: req.params.id } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } } }),
    prisma.feedPost.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: userSelect }, reactions: true, comments: { include: { user: { select: userSelect } } } },
    }),
  ]);
  const statuses = await connectionStatusMap(req.userId!, [req.params.id]);
  res.json({
    user: { ...user, connectionStatus: statuses.get(req.params.id) ?? 'none' },
    stats: { followers, following: followingCount, completions },
    isFollowing: Boolean(isFollowing),
    posts: posts.map((p) => shapePost(p, req.userId!)),
  });
});

// ---- Suggested people (top by XP I don't follow) ----
socialRouter.get('/suggested', async (req: AuthedRequest, res) => {
  const following = await prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } });
  const exclude = [req.userId!, ...following.map((f) => f.followingId)];
  const users = await prisma.user.findMany({
    where: { id: { notIn: exclude } },
    select: { ...userSelect, currentStreak: true },
    orderBy: { xp: 'desc' },
    take: 10,
  });
  const statuses = await connectionStatusMap(req.userId!, users.map((u) => u.id));
  res.json(users.map((u) => ({ ...u, isFollowing: false, connectionStatus: statuses.get(u.id) ?? 'none' })));
});

// ---- Connections (buddy requests) ----
socialRouter.post('/connections/:userId', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const other = req.params.userId;
  if (other === me) return res.status(400).json({ error: "Can't connect with yourself" });
  // Connection has no FK to User — without this check we'd happily create orphan rows.
  const target = await prisma.user.findUnique({ where: { id: other }, select: { id: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Already connected or an outgoing request already exists → no-op ok.
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: other },
        { requesterId: other, addresseeId: me },
      ],
    },
  });
  if (existing) {
    // A reverse pending request exists → auto-accept both sides.
    if (existing.status === 'pending' && existing.requesterId === other) {
      await prisma.connection.update({ where: { id: existing.id }, data: { status: 'accepted' } });
      // Keep one canonical row per pair: drop any stray row I created in the other direction
      // (a mirrored accepted row would show up twice in buddy lists).
      await prisma.connection.deleteMany({ where: { requesterId: me, addresseeId: other } });
      const meUser = await prisma.user.findUnique({ where: { id: me }, select: { firstName: true } });
      emitToUser(other, 'notify', { type: 'connect' });
      notifyUser(other, { title: 'New buddy', titleAr: 'صاحب جديد', body: `${meUser?.firstName ?? 'Someone'} is now your buddy`, bodyAr: `${meUser?.firstName ?? 'حد'} بقى صاحبك دلوقتي`, url: '/buddies' });
      return res.json({ ok: true, status: 'accepted' });
    }
    return res.json({ ok: true, status: existing.status });
  }

  // Upsert: a double-tap racing past the findFirst above would P2002 on create and hang the request.
  await prisma.connection.upsert({
    where: { requesterId_addresseeId: { requesterId: me, addresseeId: other } },
    create: { requesterId: me, addresseeId: other, status: 'pending' },
    update: {},
  });
  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { firstName: true } });
  emitToUser(other, 'notify', { type: 'connect' });
  notifyUser(other, { title: 'Buddy request', titleAr: 'طلب صداقة', body: `${meUser?.firstName ?? 'Someone'} wants to connect`, bodyAr: `${meUser?.firstName ?? 'حد'} عايز يكون صاحبك`, url: '/buddies' });
  res.json({ ok: true, status: 'pending' });
});

socialRouter.post('/connections/:userId/accept', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const other = req.params.userId;
  const pending = await prisma.connection.findFirst({
    where: { requesterId: other, addresseeId: me, status: 'pending' },
  });
  if (!pending) {
    // Double-accept (or already auto-accepted) → idempotent ok instead of a confusing 404.
    if (await areConnected(me, other)) return res.json({ ok: true });
    return res.status(404).json({ error: 'No pending request' });
  }
  await prisma.connection.update({ where: { id: pending.id }, data: { status: 'accepted' } });
  // Drop any stray reverse row (both-pending race) so one canonical row remains per pair.
  await prisma.connection.deleteMany({ where: { requesterId: me, addresseeId: other } });
  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { firstName: true } });
  emitToUser(other, 'notify', { type: 'connect' });
  notifyUser(other, { title: 'Buddy request accepted', titleAr: 'طلب الصداقة اتقبل', body: `${meUser?.firstName ?? 'Someone'} accepted your request`, bodyAr: `${meUser?.firstName ?? 'حد'} قبل طلبك`, url: '/buddies' });
  res.json({ ok: true });
});

socialRouter.delete('/connections/:userId', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const other = req.params.userId;
  await prisma.connection.deleteMany({
    where: {
      OR: [
        { requesterId: me, addresseeId: other },
        { requesterId: other, addresseeId: me },
      ],
    },
  });
  res.json({ ok: true });
});

socialRouter.get('/connections', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const rows = await prisma.connection.findMany({
    where: {
      OR: [
        { addresseeId: me, status: 'pending' },
        { status: 'accepted', OR: [{ requesterId: me }, { addresseeId: me }] },
      ],
    },
  });
  const userIds = Array.from(new Set(rows.map((r) => (r.requesterId === me ? r.addresseeId : r.requesterId))));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { ...userSelect, currentStreak: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  // Dedupe: legacy data may hold rows in both directions for one pair (double-accepted or
  // accepted+pending); a buddy must appear once and never also as an incoming request.
  const buddyIds = new Set(
    rows.filter((r) => r.status === 'accepted').map((r) => (r.requesterId === me ? r.addresseeId : r.requesterId)),
  );
  const incoming = rows
    .filter((r) => r.status === 'pending' && r.addresseeId === me && !buddyIds.has(r.requesterId))
    .map((r) => ({ connectionId: r.id, user: byId.get(r.requesterId) }))
    .filter((r) => r.user);
  const buddies = Array.from(buddyIds)
    .map((id) => ({ user: byId.get(id) }))
    .filter((r) => r.user);
  res.json({ incoming, buddies });
});

// ---- Buddies progress ----
socialRouter.get('/buddies', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const rows = await prisma.connection.findMany({
    where: { status: 'accepted', OR: [{ requesterId: me }, { addresseeId: me }] },
  });
  const ids = Array.from(new Set(rows.map((r) => (r.requesterId === me ? r.addresseeId : r.requesterId))));
  if (!ids.length) return res.json([]);

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const [users, xp, completions] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, currentStreak: true, longestStreak: true, lastActiveOn: true },
    }),
    prisma.xpEvent.groupBy({ by: ['userId'], where: { userId: { in: ids }, createdAt: { gte: since } }, _sum: { amount: true } }),
    prisma.lessonCompletion.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
  ]);
  const xpMap = new Map(xp.map((e) => [e.userId, e._sum.amount ?? 0]));
  const compMap = new Map(completions.map((c) => [c.userId, c._count._all]));
  res.json(
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      level: u.level,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      weeklyXp: xpMap.get(u.id) ?? 0,
      completions: compMap.get(u.id) ?? 0,
      lastActiveOn: u.lastActiveOn,
    })),
  );
});

// One cheer per buddy pair per 4h — cheering is a nudge, not a spam channel.
const cheerCooldown = new Map<string, number>();
const CHEER_COOLDOWN_MS = 4 * 3600 * 1000;

socialRouter.post('/buddies/:userId/cheer', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const other = req.params.userId;
  if (!(await areConnected(me, other))) return res.status(403).json({ error: 'Connect with this person first' });
  const key = `${me}:${other}`;
  const last = cheerCooldown.get(key) ?? 0;
  if (Date.now() - last < CHEER_COOLDOWN_MS) {
    return res.json({ ok: true, cooldown: true }); // silently absorbed — no push spam
  }
  cheerCooldown.set(key, Date.now());
  if (cheerCooldown.size > 5000) cheerCooldown.clear(); // bounded memory
  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { firstName: true } });
  emitToUser(other, 'notify', { type: 'cheer' });
  notifyUser(other, { title: 'Cheer', titleAr: 'تشجيع', body: `${meUser?.firstName ?? 'Someone'} is cheering you on! 💪`, bodyAr: `${meUser?.firstName ?? 'حد'} بيشجعك! 💪`, url: '/community', type: 'cheer' });
  res.json({ ok: true });
});
