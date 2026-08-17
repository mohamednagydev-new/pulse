import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { createFeedPost, areConnected, awardXp } from '../lib/social';
import { touchStreak } from '../lib/gamify';
import { bumpWalkChallenges } from '../lib/walks';
import { dayString, startOfDayTz } from '../lib/time';
import { processVideo } from '../lib/video';
import { emitToUser, onlineCount, isOnline } from '../lib/realtime';
import { notifyUser } from './push';

export const socialRouter = Router();
socialRouter.use(requireAuth);

socialRouter.get('/presence', (_req, res) => res.json({ online: onlineCount() }));

/** Block in either direction kills all social interaction between two users. */
export async function isBlockedEither(a: string, b: string): Promise<boolean> {
  const row = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return Boolean(row);
}

// Who follows / is followed by a user — the Stat tiles were dead-end counts
// with no list behind them (you couldn't even find someone to unfollow).
socialRouter.get('/users/:id/follows', async (req: AuthedRequest, res) => {
  const [followerRows, followingRows] = await Promise.all([
    prisma.follow.findMany({ where: { followingId: req.params.id }, select: { followerId: true }, take: 200, orderBy: { createdAt: 'desc' } }),
    prisma.follow.findMany({ where: { followerId: req.params.id }, select: { followingId: true }, take: 200, orderBy: { createdAt: 'desc' } }),
  ]);
  const ids = Array.from(new Set([...followerRows.map((r) => r.followerId), ...followingRows.map((r) => r.followingId)]));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json({
    followers: followerRows.map((r) => byId.get(r.followerId)).filter(Boolean),
    following: followingRows.map((r) => byId.get(r.followingId)).filter(Boolean),
  });
});

// ---- Blocking ----
socialRouter.post('/users/:id/block', async (req: AuthedRequest, res) => {
  const other = req.params.id;
  if (other === req.userId) return res.status(400).json({ error: 'Cannot block yourself' });
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: other } },
    create: { blockerId: req.userId!, blockedId: other },
    update: {},
  });
  // Blocking severs the existing relationship both ways — follows and buddyship.
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: req.userId!, followingId: other }, { followerId: other, followingId: req.userId! }] },
  });
  await prisma.connection.deleteMany({
    where: { OR: [{ requesterId: req.userId!, addresseeId: other }, { requesterId: other, addresseeId: req.userId! }] },
  });
  res.json({ ok: true });
});

socialRouter.delete('/users/:id/block', async (req: AuthedRequest, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.userId!, blockedId: req.params.id } });
  res.json({ ok: true });
});

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
      // The admin's Verified toggle IS the approval gate: self-serve coaches
      // stay invisible to the public until reviewed (they can still build
      // their profile and programs while pending).
      coachVerified: true,
      id: { not: req.userId! },
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { coachHeadline: { contains: q } }] } : {}),
      ...(specialty ? { coachSpecialties: { contains: specialty } } : {}),
    },
    select: { ...userSelect, coachHeadline: true, coachSpecialties: true, currentStreak: true, coachFeatured: true },
    orderBy: [{ coachFeatured: 'desc' }, { coachVerified: 'desc' }, { xp: 'desc' }],
    take: 40,
  });
  // Ratings finally reach the directory — the quality signal the whole
  // rating feature was built for and never surfaced.
  const ratings = await prisma.coachRating.groupBy({
    by: ['coachUserId'],
    where: { coachUserId: { in: coaches.map((c) => c.id) } },
    _avg: { stars: true },
    _count: true,
  });
  const rmap = new Map(ratings.map((r) => [r.coachUserId, { avg: Math.round((r._avg.stars ?? 0) * 10) / 10, count: r._count }]));
  res.json(coaches.map((c) => ({ ...c, isFollowing: set.has(c.id), rating: rmap.get(c.id) ?? null })));
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
  // Poll shaping: options from pollJson, counts from the votes rows.
  let poll = null;
  if (p.pollJson) {
    try {
      const options: string[] = JSON.parse(p.pollJson);
      const votes: { userId: string; optionIdx: number }[] = p.pollVotes ?? [];
      const counts = options.map((_, i) => votes.filter((v) => v.optionIdx === i).length);
      poll = {
        options,
        counts,
        total: votes.length,
        myVote: votes.find((v) => v.userId === me)?.optionIdx ?? null,
      };
    } catch { /* malformed poll — render as a plain post */ }
  }
  return {
    id: p.id,
    kind: p.kind,
    poll,
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
  const [following, admins, blocks] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: req.userId! }, select: { followingId: true } }),
    // Admin posts are announcements by nature — they reach every feed without
    // needing a follow (pinning is still available for the top slot).
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: req.userId! }, { blockedId: req.userId! }] } }),
  ]);
  const blockedSet = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
  blockedSet.delete(req.userId!);
  const ids = Array.from(
    new Set([req.userId!, ...following.map((f) => f.followingId), ...admins.map((a) => a.id)]),
  ).filter((i) => !blockedSet.has(i));

  const include = {
    user: { select: userSelect },
    reactions: true,
    comments: { include: { user: { select: userSelect } }, orderBy: { createdAt: 'asc' as const } },
    pollVotes: { select: { userId: true, optionIdx: true } },
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
  let rest = posts.filter((p) => p.id !== pinned?.id);

  // Discovery top-up: a follower-only feed is a dead screen for anyone new
  // (no connections yet → nothing at all). Blend in recent public activity
  // from the rest of the community — Facebook-style — until the page feels
  // alive; people you follow still dominate because their posts come first
  // in the merge when dates tie.
  if (rest.length < 30) {
    const discover = await prisma.feedPost.findMany({
      where: {
        userId: { notIn: [...ids, ...blockedSet] },
        pinned: false,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 30 - rest.length,
      include,
    });
    rest = [...rest, ...discover].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

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
// Own-content control: delete my post / my comment (admins have their own
// moderation routes; users shouldn't need an admin for their own typo).
socialRouter.delete('/posts/:id', async (req: AuthedRequest, res) => {
  const r = await prisma.feedPost.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  if (!r.count) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
socialRouter.delete('/comments/:id', async (req: AuthedRequest, res) => {
  const r = await prisma.postComment.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  if (!r.count) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Report a feed post — the public-feed sibling of the chat report. Admins get
// pinged with a deep link; the post itself is one tap from deletion in
// Moderation → Feed.
socialRouter.post('/posts/:id/report', async (req: AuthedRequest, res) => {
  const post = await prisma.feedPost.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!post) return res.status(404).json({ error: 'Not found' });
  const reporter = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  const excerpt = (post.text ?? post.textAr ?? (post.mediaType ? `[${post.mediaType}]` : '')).slice(0, 80);
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: 'Post reported 🚩',
      titleAr: 'منشور اتبلغ عنه 🚩',
      body: `${reporter?.firstName ?? 'A user'} reported a post by ${post.user.firstName}: "${excerpt}"`,
      bodyAr: `${reporter?.firstName ?? 'مستخدم'} بلّغ عن منشور من ${post.user.firstName}: "${excerpt}"`,
      url: '/admin/moderation',
      type: 'general',
    }).catch(() => {});
  }
  res.status(201).json({ ok: true });
});

socialRouter.post('/posts', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      text: z.string().max(500).optional(),
      mediaType: z.enum(['image', 'video']).optional(),
      mediaUrl: z.string().optional(),
      /** Poll options — admin-only surveys/announcement questions. */
      poll: z.array(z.string().min(1).max(80)).min(2).max(4).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success || (!parsed.data.text?.trim() && !parsed.data.mediaUrl && !parsed.data.poll)) {
    return res.status(400).json({ error: 'Add a message or media' });
  }
  if (parsed.data.poll) {
    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
    if (me?.role !== 'ADMIN') return res.status(403).json({ error: 'Polls are admin announcements' });
    if (!parsed.data.text?.trim()) return res.status(400).json({ error: 'A poll needs a question in the text' });
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
  const post = await createFeedPost(req.userId!, parsed.data.poll ? 'poll' : 'text', parsed.data.text, undefined, undefined, {
    mediaType: parsed.data.mediaType,
    mediaUrl: parsed.data.mediaUrl,
    pollJson: parsed.data.poll ? JSON.stringify(parsed.data.poll) : undefined,
  });
  res.status(201).json(shapePost({ ...post, reactions: [], comments: [], pollVotes: [] }, req.userId!));
});

// ---- Poll vote (change allowed until the admin deletes the poll) ----
socialRouter.post('/posts/:id/vote', async (req: AuthedRequest, res) => {
  const parsed = z.object({ option: z.number().int().min(0).max(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid vote' });
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.id }, select: { pollJson: true } });
  if (!post?.pollJson) return res.status(404).json({ error: 'Not a poll' });
  let options: string[] = [];
  try { options = JSON.parse(post.pollJson); } catch { /* below */ }
  if (parsed.data.option >= options.length) return res.status(400).json({ error: 'Invalid option' });
  await prisma.pollVote.upsert({
    where: { postId_userId: { postId: req.params.id, userId: req.userId! } },
    create: { postId: req.params.id, userId: req.userId!, optionIdx: parsed.data.option },
    update: { optionIdx: parsed.data.option },
  });
  const votes = await prisma.pollVote.findMany({ where: { postId: req.params.id }, select: { userId: true, optionIdx: true } });
  res.json({
    options,
    counts: options.map((_, i) => votes.filter((v) => v.optionIdx === i).length),
    total: votes.length,
    myVote: parsed.data.option,
  });
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
  if (await isBlockedEither(req.userId!, req.params.id)) return res.status(403).json({ error: 'Not available' });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } },
    create: { followerId: req.userId!, followingId: req.params.id },
    update: {},
  });
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  emitToUser(req.params.id, 'notify', { type: 'follow' });
  // Deep-link to the follower's own profile — /community told you nothing about who.
  notifyUser(req.params.id, { title: 'New follower', titleAr: 'متابع جديد', body: `${me?.firstName ?? 'Someone'} started following you`, bodyAr: `${me?.firstName ?? 'حد'} بدأ يتابعك`, url: `/u/${req.userId}`, type: 'follow' });
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
    select: { ...userSelect, bio: true, xp: true, currentStreak: true, longestStreak: true, coachHeadline: true, coachBio: true, coachSpecialties: true, lastSeenAt: true },
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
  const myBlock = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: req.params.id } },
    select: { id: true },
  });
  res.json({
    user: { ...user, connectionStatus: statuses.get(req.params.id) ?? 'none', online: isOnline(req.params.id), blocked: Boolean(myBlock) },
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
  if (await isBlockedEither(me, other)) return res.status(403).json({ error: 'Not available' });

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
      notifyUser(other, { title: 'New buddy', titleAr: 'صاحب جديد', body: `${meUser?.firstName ?? 'Someone'} is now your buddy`, bodyAr: `${meUser?.firstName ?? 'حد'} بقى صاحبك دلوقتي`, url: '/buddies', type: 'follow' });
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
  notifyUser(other, { title: 'Buddy request', titleAr: 'طلب صداقة', body: `${meUser?.firstName ?? 'Someone'} wants to connect`, bodyAr: `${meUser?.firstName ?? 'حد'} عايز يكون صاحبك`, url: '/buddies', type: 'follow' });
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
  notifyUser(other, { title: 'Buddy request accepted', titleAr: 'طلب الصداقة اتقبل', body: `${meUser?.firstName ?? 'Someone'} accepted your request`, bodyAr: `${meUser?.firstName ?? 'حد'} قبل طلبك`, url: '/buddies', type: 'follow' });
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
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, currentStreak: true, longestStreak: true, lastActiveOn: true, lastSeenAt: true, goalText: true },
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
      goalText: u.goalText,
      lastActiveOn: u.lastActiveOn,
      lastSeenAt: u.lastSeenAt,
      online: isOnline(u.id),
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
  notifyUser(other, { title: 'Cheer', titleAr: 'تشجيع', body: `${meUser?.firstName ?? 'Someone'} is cheering you on! 💪`, bodyAr: `${meUser?.firstName ?? 'حد'} بيشجعك! 💪`, url: '/buddies', type: 'cheer' });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * Activity invites — the low-pressure alternative to a duel:
 * "تعالى نتمشى النهارده" instead of a scored competition.
 * ------------------------------------------------------------------ */
const INVITE_KINDS = ['walk', 'workout', 'run', 'other'] as const;
const inviteKindCopy: Record<string, { en: string; ar: string; emoji: string }> = {
  walk: { en: 'a walk', ar: 'مشوار مشي', emoji: '🚶' },
  workout: { en: 'a workout', ar: 'تمرين', emoji: '🏋️' },
  run: { en: 'a run', ar: 'جري', emoji: '🏃' },
  other: { en: 'an activity', ar: 'نشاط', emoji: '✨' },
};

socialRouter.post('/invites', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      toUserId: z.string().min(1),
      kind: z.enum(INVITE_KINDS).default('walk'),
      whenText: z.string().max(60).optional(),
      note: z.string().max(200).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid invite' });
  const { toUserId, kind, whenText, note } = parsed.data;
  const me = req.userId!;
  if (toUserId === me) return res.status(400).json({ error: "Can't invite yourself" });
  // Invites only travel between accepted buddies — this is a nudge for friends,
  // not a DM channel to strangers.
  if (!(await areConnected(me, toUserId))) return res.status(403).json({ error: 'Connect with this person first' });

  // One pending invite per pair+kind — resending just refreshes the details.
  const existing = await prisma.activityInvite.findFirst({
    where: { fromUserId: me, toUserId, kind, status: 'pending' },
  });
  const invite = existing
    ? await prisma.activityInvite.update({ where: { id: existing.id }, data: { whenText: whenText ?? null, note: note ?? null, createdAt: new Date() } })
    : await prisma.activityInvite.create({ data: { fromUserId: me, toUserId, kind, whenText: whenText ?? null, note: note ?? null } });

  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { firstName: true } });
  const k = inviteKindCopy[kind] ?? inviteKindCopy.other;
  emitToUser(toUserId, 'notify', { type: 'invite' });
  notifyUser(toUserId, {
    title: `${k.emoji} ${meUser?.firstName ?? 'A buddy'} invites you for ${k.en}`,
    titleAr: `${k.emoji} ${meUser?.firstName ?? 'صاحبك'} عازمك على ${k.ar}`,
    body: whenText ? `When: ${whenText}` : 'Open the app to accept',
    bodyAr: whenText ? `إمتى: ${whenText}` : 'افتح التطبيق واقبل العزومة',
    url: '/buddies',
    type: 'general',
  }).catch(() => {});
  res.status(201).json(invite);
});

socialRouter.get('/invites', async (req: AuthedRequest, res) => {
  const me = req.userId!;
  const since = new Date(Date.now() - 7 * 86400000);
  const rows = await prisma.activityInvite.findMany({
    where: {
      OR: [
        { toUserId: me, status: 'pending' },
        { fromUserId: me, status: 'pending' },
        { status: 'accepted', createdAt: { gte: since }, OR: [{ fromUserId: me }, { toUserId: me }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  const ids = Array.from(new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]))).filter((id) => id !== me);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
  const byId = new Map(users.map((u) => [u.id, u]));
  const shape = (r: (typeof rows)[number]) => ({
    id: r.id,
    kind: r.kind,
    note: r.note,
    whenText: r.whenText,
    status: r.status,
    createdAt: r.createdAt,
    fromMe: r.fromUserId === me,
    other: byId.get(r.fromUserId === me ? r.toUserId : r.fromUserId) ?? null,
  });
  const shaped = rows.map(shape).filter((r) => r.other);
  res.json({
    incoming: shaped.filter((r) => r.status === 'pending' && !r.fromMe),
    outgoing: shaped.filter((r) => r.status === 'pending' && r.fromMe),
    accepted: shaped.filter((r) => r.status === 'accepted'),
  });
});

socialRouter.post('/invites/:id/accept', async (req: AuthedRequest, res) => {
  const invite = await prisma.activityInvite.findUnique({ where: { id: req.params.id } });
  if (!invite || invite.toUserId !== req.userId) return res.status(404).json({ error: 'Not found' });
  if (invite.status !== 'pending') return res.status(410).json({ error: 'Invite no longer pending' });
  await prisma.activityInvite.update({ where: { id: invite.id }, data: { status: 'accepted' } });
  const meUser = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  const k = inviteKindCopy[invite.kind] ?? inviteKindCopy.other;
  emitToUser(invite.fromUserId, 'notify', { type: 'invite' });
  notifyUser(invite.fromUserId, {
    title: `${k.emoji} It's on!`,
    titleAr: `${k.emoji} اتفقنا!`,
    body: `${meUser?.firstName ?? 'Your buddy'} accepted your invite${invite.whenText ? ` — ${invite.whenText}` : ''}`,
    bodyAr: `${meUser?.firstName ?? 'صاحبك'} قبل العزومة${invite.whenText ? ` — ${invite.whenText}` : ''}`,
    url: '/buddies',
    type: 'general',
  }).catch(() => {});
  res.json({ ok: true });
});

socialRouter.post('/invites/:id/decline', async (req: AuthedRequest, res) => {
  const invite = await prisma.activityInvite.findUnique({ where: { id: req.params.id } });
  if (!invite || invite.toUserId !== req.userId) return res.status(404).json({ error: 'Not found' });
  if (invite.status !== 'pending') return res.status(410).json({ error: 'Invite no longer pending' });
  await prisma.activityInvite.update({ where: { id: invite.id }, data: { status: 'declined' } });
  const meUser = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
  notifyUser(invite.fromUserId, {
    title: 'Maybe next time',
    titleAr: 'المرة الجاية إن شاء الله',
    body: `${meUser?.firstName ?? 'Your buddy'} can't make it this time`,
    bodyAr: `${meUser?.firstName ?? 'صاحبك'} مش هيعرف المرة دي`,
    url: '/buddies',
    type: 'general',
  }).catch(() => {});
  res.json({ ok: true });
});

socialRouter.post('/invites/:id/cancel', async (req: AuthedRequest, res) => {
  const invite = await prisma.activityInvite.findUnique({ where: { id: req.params.id } });
  if (!invite || invite.fromUserId !== req.userId) return res.status(404).json({ error: 'Not found' });
  // Cancelling an accepted plan is allowed too — plans change.
  if (invite.status === 'cancelled' || invite.status === 'declined') return res.json({ ok: true });
  await prisma.activityInvite.update({ where: { id: invite.id }, data: { status: 'cancelled' } });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * Shared goal — one line on my profile my buddies can see ("🎯 هدفي").
 * ------------------------------------------------------------------ */
socialRouter.get('/goal', async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { goalText: true, goalSharedAt: true } });
  res.json({ goalText: me?.goalText ?? null, goalSharedAt: me?.goalSharedAt ?? null });
});

socialRouter.post('/goal', async (req: AuthedRequest, res) => {
  const parsed = z.object({ goalText: z.string().max(120).nullable() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid goal' });
  const text = parsed.data.goalText?.trim() || null;
  await prisma.user.update({
    where: { id: req.userId! },
    data: { goalText: text, goalSharedAt: text ? new Date() : null },
  });
  res.json({ goalText: text });
});

/* ------------------------------------------------------------------ *
 * Walk log — a tiny manual "I went for a walk" entry. Small XP, touches
 * the streak, and advances 'walk' challenges. Capped per day so a tap
 * spree can't farm XP or fake a walking challenge.
 * ------------------------------------------------------------------ */
const WALK_XP = 15;
const WALKS_CREDIT_CAP_PER_DAY = 3;

socialRouter.post('/walks', async (req: AuthedRequest, res) => {
  const parsed = z.object({ minutes: z.number().int().min(10).max(240) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Walks are 10–240 minutes' });
  const me = req.userId!;
  const loggedToday = await prisma.xpEvent.count({
    where: { userId: me, reason: 'walk_log', createdAt: { gte: startOfDayTz(dayString()) } },
  });
  if (loggedToday >= WALKS_CREDIT_CAP_PER_DAY) {
    return res.json({ ok: true, credited: false, xp: 0 });
  }
  await touchStreak(me).catch(() => {});
  await awardXp(me, WALK_XP, 'walk_log').catch(() => {});
  await bumpWalkChallenges(me).catch(() => {});
  res.json({ ok: true, credited: true, xp: WALK_XP, minutes: parsed.data.minutes });
});
