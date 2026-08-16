import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { bumpChallenges } from '../lib/social';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { awardXp } from '../lib/social';
import { signMedia } from '../lib/mediaSign';
import { dayString, daysAgoStr, startOfDayTz, endOfDayTz } from '../lib/time';

export const dailyRouter = Router();
dailyRouter.use(requireAuth);

const WATER_GOAL = 8;
const QUEST_XP = 10;
const BONUS_XP = 30;

/* ------------------------------- Water ------------------------------- */

dailyRouter.get('/water', async (req: AuthedRequest, res) => {
  const date = dayString();
  const row = await prisma.waterLog.findUnique({ where: { userId_date: { userId: req.userId!, date } } });
  // last 7 days for the mini history strip
  const since = daysAgoStr(6);
  const week = await prisma.waterLog.findMany({
    where: { userId: req.userId!, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, glasses: true },
  });
  res.json({ date, glasses: row?.glasses ?? 0, goal: WATER_GOAL, week });
});

dailyRouter.post('/water', async (req: AuthedRequest, res) => {
  const parsed = z.object({ delta: z.number().int().min(-20).max(20).optional(), set: z.number().int().min(0).max(30).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const date = dayString();

  if (parsed.data.set !== undefined) {
    // Absolute set — already clamped by the schema (0..30).
    const row = await prisma.waterLog.upsert({
      where: { userId_date: { userId: req.userId!, date } },
      create: { userId: req.userId!, date, glasses: parsed.data.set },
      update: { glasses: parsed.data.set },
    });
    await bumpChallenges(req.userId!, 'calorie').catch(() => {}); // water challenges advance on the tap itself
    return res.json({ glasses: row.glasses, goal: WATER_GOAL });
  }

  // Delta — atomic increment so two rapid taps can't lose an update.
  const delta = parsed.data.delta ?? 1;
  let row = await prisma.waterLog.upsert({
    where: { userId_date: { userId: req.userId!, date } },
    create: { userId: req.userId!, date, glasses: Math.max(0, Math.min(30, delta)) },
    update: { glasses: { increment: delta } },
  });
  // Prisma can't clamp inside an increment; fix up only when out of range.
  if (row.glasses < 0 || row.glasses > 30) {
    row = await prisma.waterLog.update({
      where: { userId_date: { userId: req.userId!, date } },
      data: { glasses: Math.max(0, Math.min(30, row.glasses)) },
    });
  }
  await bumpChallenges(req.userId!, 'calorie').catch(() => {});
  res.json({ glasses: row.glasses, goal: WATER_GOAL });
});

/* ------------------------------- Activity heatmap ------------------------------- */

/** Daily activity counts for the last N days (drives the streak calendar). */
dailyRouter.get('/activity', async (req: AuthedRequest, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 120, 30), 400);
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.$queryRawUnsafe<{ day: string; n: number }[]>(
    `SELECT date(createdAt / 1000, 'unixepoch') as day, COUNT(*) as n
     FROM XpEvent WHERE userId = ? AND createdAt >= ? GROUP BY day ORDER BY day ASC`,
    req.userId!,
    since.getTime(),
  );
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { currentStreak: true, longestStreak: true, streakFreezes: true },
  });
  res.json({
    days,
    activity: rows.map((r) => ({ date: r.day, count: Number(r.n) })),
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    streakFreezes: user?.streakFreezes ?? 0,
  });
});

/* ------------------------------- Daily quests ------------------------------- */

type Quest = {
  key: string;
  en: string;
  ar: string;
  icon: string;
  target: number;
  /** Explore quests pay more than the daily grind. */
  xp?: number;
  /** How many units the user has done today. */
  progress: (userId: string, day: string) => Promise<number>;
  /** Lifetime check — has the user EVER used this feature? (explore quests only) */
  everUsed?: (userId: string) => Promise<boolean>;
};

const startOfDay = (day: string) => startOfDayTz(day);
const endOfDay = (day: string) => endOfDayTz(day);

const QUESTS: Quest[] = [
  {
    key: 'workout', en: 'Complete a workout', ar: 'خلّص تمرينة', icon: '💪', target: 1,
    progress: (userId, day) =>
      prisma.xpEvent.count({ where: { userId, reason: { in: ['workout-session', 'workout-lesson'] }, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
  },
  {
    key: 'water', en: 'Drink 8 glasses of water', ar: 'اشرب ٨ أكواب مياه', icon: '💧', target: WATER_GOAL,
    progress: async (userId, day) => (await prisma.waterLog.findUnique({ where: { userId_date: { userId, date: day } } }))?.glasses ?? 0,
  },
  {
    key: 'food', en: 'Log a meal', ar: 'سجّل وجبة', icon: '🥗', target: 1,
    progress: (userId, day) => prisma.calorieEntry.count({ where: { userId, date: day } }),
  },
  {
    key: 'lift', en: 'Log a set', ar: 'سجّل مجموعة', icon: '🏋️', target: 1,
    progress: (userId, day) => prisma.liftLog.count({ where: { userId, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
  },
  {
    key: 'reels', en: 'Watch 3 reels', ar: 'اتفرج على ٣ ريلز', icon: '🎬', target: 3,
    progress: (userId, day) => prisma.reelWatch.count({ where: { userId, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
  },
  {
    key: 'social', en: 'Cheer or post to the feed', ar: 'شجّع صاحبك أو انشر بوست', icon: '📣', target: 1,
    progress: (userId, day) => prisma.feedPost.count({ where: { userId, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
  },
  {
    key: 'weight', en: 'Log your weight', ar: 'سجّل وزنك', icon: '⚖️', target: 1,
    progress: (userId, day) => prisma.weightLog.count({ where: { userId, date: day } }),
  },
];

/** Deterministic 3-quest set per user per day (rotates, but stable within the day). */
function pickQuests(userId: string, day: string): Quest[] {
  let h = 0;
  const seed = `${userId}:${day}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pool = [...QUESTS];
  const out: Quest[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(...pool.splice(h % pool.length, 1));
  }
  return out;
}

// First-week special: inviting a friend is the stickiest thing an Egyptian
// user can do (friends train together). New users who haven't referred anyone
// yet get this pinned as their first quest slot instead of a random pick.
const INVITE_QUEST: Quest = {
  key: 'invite', en: 'Invite a friend to PULSE', ar: 'اعزم صاحبك على PULSE', icon: '🎁', target: 1,
  progress: (userId) => prisma.user.count({ where: { referredById: userId } }),
};

/* Explore quests: discovery as gameplay. Each targets a feature the user has
 * NEVER touched; doing it once completes the quest — and teaches the feature
 * forever, which is the real reward. One pinned slot, rotating daily among
 * whatever is still undiscovered. */
const EXPLORE_XP = 20;
const EXPLORE_QUESTS: Quest[] = [
  {
    key: 'explore-ai', en: 'Ask the AI coach anything', ar: 'اسأل كوتش الـAI أي سؤال', icon: '🤖', target: 1, xp: EXPLORE_XP,
    progress: async (userId, day) => prisma.aiUsage.count({ where: { userId, kind: 'chat', date: day } }),
    everUsed: async (userId) => (await prisma.aiUsage.count({ where: { userId, kind: 'chat' } })) > 0,
  },
  {
    key: 'explore-photo', en: 'Snap a meal photo — calories from the picture', ar: 'صوّر طبقك والسعرات تتحسب لوحدها', icon: '✨', target: 1, xp: EXPLORE_XP,
    progress: async (userId, day) => prisma.aiUsage.count({ where: { userId, kind: 'vision', date: day } }),
    everUsed: async (userId) => (await prisma.aiUsage.count({ where: { userId, kind: 'vision' } })) > 0,
  },
  {
    key: 'explore-recipe', en: 'Build your own recipe', ar: 'اعمل وصفتك بحسابها', icon: '👨‍🍳', target: 1, xp: EXPLORE_XP,
    progress: (userId, day) => prisma.customRecipe.count({ where: { userId, createdAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
    everUsed: async (userId) => (await prisma.customRecipe.count({ where: { userId } })) > 0,
  },
  {
    key: 'explore-journey', en: 'Start a diet journey', ar: 'ابدأ رحلة الدايت 🎯', icon: '🎯', target: 1, xp: EXPLORE_XP,
    progress: async (userId, day) => {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { dietStartedAt: true } });
      return u?.dietStartedAt && u.dietStartedAt >= startOfDay(day) ? 1 : 0;
    },
    everUsed: async (userId) => {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { dietStartedAt: true } });
      if (u?.dietStartedAt) return true;
      return (await prisma.xpEvent.count({ where: { userId, reason: 'diet-journey-complete' } })) > 0;
    },
  },
  {
    key: 'explore-duel', en: 'Challenge a friend 1-on-1', ar: 'اتحدى صاحبك ١ ضد ١ ⚔️', icon: '⚔️', target: 1, xp: EXPLORE_XP,
    progress: (userId, day) =>
      prisma.buddyChallenge.count({
        where: { OR: [{ challengerId: userId }, { opponentId: userId }], createdAt: { gte: startOfDay(day), lte: endOfDay(day) } },
      }),
    everUsed: async (userId) =>
      (await prisma.buddyChallenge.count({ where: { OR: [{ challengerId: userId }, { opponentId: userId }] } })) > 0,
  },
  {
    key: 'explore-group', en: 'Join a live group session', ar: 'انضم لحصة لايف جماعية 🔴', icon: '🔴', target: 1, xp: EXPLORE_XP,
    progress: (userId, day) => prisma.groupParticipant.count({ where: { userId, joinedAt: { gte: startOfDay(day), lte: endOfDay(day) } } }),
    everUsed: async (userId) => (await prisma.groupParticipant.count({ where: { userId } })) > 0,
  },
];

/** Today's explore pick: hashed daily order over the pool; keep a quest that was
 *  used or claimed TODAY (stability within the day), otherwise the first still-
 *  undiscovered one. Null when everything is discovered — the map is complete. */
async function pickExplore(userId: string, day: string, claimedKeys: Set<string>): Promise<Quest | null> {
  let h = 0;
  const seed = `explore:${userId}:${day}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pool = [...EXPLORE_QUESTS];
  const ordered: Quest[] = [];
  while (pool.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    ordered.push(...pool.splice(h % pool.length, 1));
  }
  for (const q of ordered) {
    if (claimedKeys.has(q.key)) return q;
    if ((await q.progress(userId, day)) > 0) return q;
    if (!(await q.everUsed!(userId))) return q;
  }
  return null;
}

/** The effective quest list for the day — pins first, randoms fill to 3.
 *  Single source of truth for BOTH the GET and the claim route: deriving them
 *  separately once let pinned quests show as claimable but never pay out. */
async function questsFor(userId: string, day: string, claimedKeys: Set<string>): Promise<Quest[]> {
  const pins: Quest[] = [];
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (me && Date.now() - me.createdAt.getTime() < 14 * 86400000) {
    const invited = await prisma.user.count({ where: { referredById: userId } });
    if (invited === 0) pins.push(INVITE_QUEST);
  }
  const explore = await pickExplore(userId, day, claimedKeys);
  if (explore) pins.push(explore);
  const pinned = new Set(pins.map((q) => q.key));
  return [...pins, ...pickQuests(userId, day).filter((q) => !pinned.has(q.key))].slice(0, 3);
}

dailyRouter.get('/quests', async (req: AuthedRequest, res) => {
  const day = dayString();
  const claims = await prisma.questClaim.findMany({ where: { userId: req.userId!, day } });
  const claimed = new Set(claims.map((c) => c.questKey));
  const picked = await questsFor(req.userId!, day, claimed);

  const quests = await Promise.all(
    picked.map(async (q) => {
      const progress = await q.progress(req.userId!, day);
      return {
        key: q.key,
        en: q.en,
        ar: q.ar,
        icon: q.icon,
        target: q.target,
        progress: Math.min(progress, q.target),
        done: progress >= q.target || claimed.has(q.key),
        claimed: claimed.has(q.key),
        xp: q.xp ?? QUEST_XP,
      };
    }),
  );

  const allDone = quests.every((q) => q.done);
  res.json({
    day,
    quests,
    allDone,
    bonusXp: BONUS_XP,
    bonusClaimed: claimed.has('daily_bonus'),
    claimable: quests.some((q) => q.done && !q.claimed) || (allDone && !claimed.has('daily_bonus')),
  });
});

/** Claim every completed-but-unclaimed quest (plus the all-three bonus). */
dailyRouter.post('/quests/claim', async (req: AuthedRequest, res) => {
  const day = dayString();
  const claims = await prisma.questClaim.findMany({ where: { userId: req.userId!, day } });
  const claimed = new Set(claims.map((c) => c.questKey));
  const picked = await questsFor(req.userId!, day, claimed);

  let awarded = 0;
  const newlyClaimed: string[] = [];
  let allDone = true;

  for (const q of picked) {
    if (claimed.has(q.key)) continue;
    const progress = await q.progress(req.userId!, day);
    const done = progress >= q.target;
    if (!done) { allDone = false; continue; }
    const xp = q.xp ?? QUEST_XP;
    try {
      await prisma.questClaim.create({ data: { userId: req.userId!, day, questKey: q.key, xp } });
      awarded += xp;
      newlyClaimed.push(q.key);
    } catch { /* already claimed in a parallel request */ }
  }

  let bonus = 0;
  if (allDone && !claimed.has('daily_bonus')) {
    try {
      await prisma.questClaim.create({ data: { userId: req.userId!, day, questKey: 'daily_bonus', xp: BONUS_XP } });
      bonus = BONUS_XP;
      awarded += BONUS_XP;
    } catch { /* raced */ }
  }

  if (awarded > 0) await awardXp(req.userId!, awarded, 'daily_quest');
  res.json({ awarded, bonus, claimed: newlyClaimed, allDone });
});

/* ------------------------------- Body log ------------------------------- */

// Progress photos are private to the user, so they must never land in the public
// images dir the social feed uses. They go to uploads/private/<userId>/ and are
// served only through signed URLs (see /media/image/* in routes/media.ts).
const privateTmp = path.join(env.UPLOAD_DIR, 'tmp');
fs.mkdirSync(privateTmp, { recursive: true });
const photoUpload = multer({ dest: privateTmp, limits: { fileSize: 15 * 1024 * 1024 } });

/** Sign a stored photo path into a time-limited URL the <img> tag can load. */
function signedPhotoUrl(photo: string | null): string | null {
  if (!photo) return null;
  if (!photo.startsWith('private/')) return photo; // legacy public-dir photos
  const { exp, sig } = signMedia('image', photo);
  return `/media/image/${photo}?exp=${exp}&sig=${sig}`;
}

dailyRouter.post('/body-photo', photoUpload.single('file'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!/^image\/(jpe?g|png|webp|gif)$/.test(req.file.mimetype || '')) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Only JPG, PNG, WEBP or GIF images' });
  }
  const ext = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[req.file.mimetype] ?? '.jpg';
  const dir = path.join(env.UPLOAD_DIR, 'private', req.userId!);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${req.file.filename}${ext}`;
  fs.renameSync(req.file.path, path.join(dir, name));
  const photo = `private/${req.userId!}/${name}`;
  res.status(201).json({ photo, url: signedPhotoUrl(photo) });
});

dailyRouter.get('/body', async (req: AuthedRequest, res) => {
  const logs = await prisma.bodyLog.findMany({ where: { userId: req.userId! }, orderBy: { date: 'desc' }, take: 60 });
  res.json(logs.map((l) => ({ ...l, photo: signedPhotoUrl(l.photo) })));
});

dailyRouter.post('/body', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      waistCm: z.number().min(20).max(300).optional(),
      chestCm: z.number().min(20).max(300).optional(),
      armCm: z.number().min(10).max(150).optional(),
      hipCm: z.number().min(20).max(300).optional(),
      thighCm: z.number().min(10).max(200).optional(),
      photo: z.string().max(300).optional(),
      note: z.string().max(300).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid measurements' });
  // A private photo path must be the caller's own — never another user's folder.
  if (parsed.data.photo?.startsWith('private/') && !parsed.data.photo.startsWith(`private/${req.userId!}/`)) {
    return res.status(403).json({ error: 'Invalid photo' });
  }
  const log = await prisma.bodyLog.create({ data: { userId: req.userId!, date: dayString(), ...parsed.data } });
  res.status(201).json({ ...log, photo: signedPhotoUrl(log.photo) });
});

dailyRouter.delete('/body/:id', async (req: AuthedRequest, res) => {
  const gone = await prisma.bodyLog.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  if (!gone.count) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/* ------------------------------- Daily spin (fun layer) ------------------------------- */

const MAX_FREEZES = 3;

/** Weighted prize wheel. Weights are tuned so it feels generous but not exploitable. */
const PRIZES = [
  { key: 'xp_10', weight: 34, xp: 10, en: '+10 XP', ar: '+١٠ نقطة', icon: '⭐' },
  { key: 'xp_25', weight: 26, xp: 25, en: '+25 XP', ar: '+٢٥ نقطة', icon: '✨' },
  { key: 'xp_50', weight: 14, xp: 50, en: '+50 XP', ar: '+٥٠ نقطة', icon: '💫' },
  { key: 'freeze', weight: 8, xp: 0, en: 'Streak freeze', ar: 'فريز للسلسلة', icon: '🧊' },
  { key: 'xp_100', weight: 4, xp: 100, en: '+100 XP', ar: '+١٠٠ نقطة', icon: '🏆' },
  { key: 'nothing', weight: 14, xp: 0, en: 'Better luck tomorrow', ar: 'حظ أوفر بكرة', icon: '🎲' },
];

/** Wheel layout + whether today's spin is still available. */
dailyRouter.get('/spin', async (req: AuthedRequest, res) => {
  const day = dayString();
  const claim = await prisma.spinClaim.findUnique({ where: { userId_day: { userId: req.userId!, day } } });
  res.json({
    day,
    spun: !!claim,
    prize: claim?.prize ?? null,
    slices: PRIZES.map(({ key, en, ar, icon }) => ({ key, en, ar, icon })),
  });
});

dailyRouter.post('/spin', async (req: AuthedRequest, res) => {
  const day = dayString();
  const existing = await prisma.spinClaim.findUnique({ where: { userId_day: { userId: req.userId!, day } } });
  if (existing) return res.status(409).json({ error: 'Already spun today', prize: existing.prize });

  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  let won = PRIZES[PRIZES.length - 1];
  for (const p of PRIZES) {
    roll -= p.weight;
    if (roll <= 0) { won = p; break; }
  }

  try {
    await prisma.spinClaim.create({ data: { userId: req.userId!, day, prize: won.key, xp: won.xp } });
  } catch {
    const again = await prisma.spinClaim.findUnique({ where: { userId_day: { userId: req.userId!, day } } });
    return res.status(409).json({ error: 'Already spun today', prize: again?.prize });
  }

  if (won.xp > 0) await awardXp(req.userId!, won.xp, 'daily_spin');
  if (won.key === 'freeze') {
    const u = await prisma.user.findUnique({ where: { id: req.userId! }, select: { streakFreezes: true } });
    await prisma.user.update({
      where: { id: req.userId! },
      data: { streakFreezes: Math.min(MAX_FREEZES, (u?.streakFreezes ?? 0) + 1) },
    });
  }

  // index lets the client stop the wheel on the winning slice
  res.json({ prize: won.key, xp: won.xp, index: PRIZES.findIndex((p) => p.key === won.key), icon: won.icon });
});

/* ------------------------------- Workout roulette ------------------------------- */

/** "Surprise me" — a random muscle group plus a random pick of its exercises. */
dailyRouter.get('/roulette', async (_req, res) => {
  const groups = await prisma.muscleGroup.findMany({ include: { _count: { select: { exercises: true } } } });
  const usable = groups.filter((g) => g._count.exercises > 0);
  if (!usable.length) return res.json({ group: null, exercises: [] });
  const group = usable[Math.floor(Math.random() * usable.length)];
  const all = await prisma.exercise.findMany({ where: { muscleGroupId: group.id } });
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 5);
  res.json({
    group: { id: group.id, name: group.name, nameAr: group.nameAr, bodySide: group.bodySide },
    exercises: shuffled.map((e) => ({ id: e.id, name: e.name, nameAr: e.nameAr, sets: e.sets, reps: e.reps })),
  });
});

/* ------------------------------- Weekly hall of fame ------------------------------- */

/** Top performers of the last 7 days — the community's Sunday moment. */
dailyRouter.get('/hall-of-fame', async (_req, res) => {
  const since = new Date(Date.now() - 7 * 86400000);
  const [xpRows, streakUsers] = await Promise.all([
    prisma.xpEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: since } }, _sum: { amount: true } }),
    prisma.user.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: { currentStreak: 'desc' },
      take: 10,
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, currentStreak: true },
    }),
  ]);
  const top = xpRows.sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0)).slice(0, 10);
  const users = await prisma.user.findMany({
    where: { id: { in: top.map((t) => t.userId) } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true },
  });
  const umap = new Map(users.map((u) => [u.id, u]));
  res.json({
    topXp: top.map((t) => ({ ...umap.get(t.userId), xp: t._sum.amount ?? 0 })).filter((u) => u.id),
    topStreaks: streakUsers,
  });
});
