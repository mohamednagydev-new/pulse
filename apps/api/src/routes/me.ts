import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/auth';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { touchStreak } from '../lib/gamify';
import { awardXp, createFeedPost, bumpChallenges, XP_PER_LESSON } from '../lib/social';
import { signMedia } from '../lib/mediaSign';
import { notifyUser } from './push';
import { env } from '../env';

export const meRouter = Router();
meRouter.use(requireAuth);

// Issue a short-lived signed URL for protected video/audio.
// Video content is free for every signed-in user today (paid gating hooks in
// here in Phase 4), but audio is personal: a music track must be the caller's
// own upload or an admin default — not another user's library.
meRouter.get('/media-sign', async (req: AuthedRequest, res) => {
  const type = req.query.type === 'audio' ? 'audio' : 'video';
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (type === 'audio') {
    const track = await prisma.musicTrack.findUnique({ where: { id }, select: { userId: true, isDefault: true } });
    if (!track || (!track.isDefault && track.userId !== req.userId)) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
  const { exp, sig } = signMedia(type, id);
  res.json({ url: `/media/${type}/${id}?exp=${exp}&sig=${sig}` });
});

meRouter.get('/', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { subscription: { include: { plan: true } } },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

meRouter.patch('/', async (req: AuthedRequest, res) => {
  const schema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    mobile: z.string().optional(),
    zip: z.string().optional(),
    // Only same-origin media paths or https images — never javascript:/data: URIs,
    // which would be rendered into <img src> for every viewer of the profile.
    avatarUrl: z.string().max(500).regex(/^(\/media\/|\/avatars\/a\d{1,2}\.svg$|images\/|https:\/\/)/, 'Invalid avatar URL').optional(),
    bio: z.string().max(300).optional(),
    gender: z.enum(['male', 'female']).optional(),
    birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 5).optional(),
    heightCm: z.number().int().min(80).max(250).optional(),
    weightKg: z.number().min(20).max(400).optional(),
    /** ISO-3166 alpha-2. Scopes gyms, deals, store and events — never the training
     *  library, which is the same wherever you are. */
    country: z.string().regex(/^[A-Za-z]{2}$/).transform((c) => c.toUpperCase()).optional(),
    // Pushes, reminders and gamification copy follow this — synced by the client
    // whenever the UI language toggles or drifts from the account.
    preferredLang: z.enum(['en', 'ar']).optional(),
    // Rest timer between exercises in a workout session (seconds).
    restSeconds: z.number().int().min(15).max(300).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.update({ where: { id: req.userId! }, data: parsed.data });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// ---- Referral code (generated lazily, stable once created) ----
meRouter.get('/referral', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { referralCode: true, firstName: true } });
  let code = user?.referralCode;
  if (!code) {
    // Short, readable, collision-checked code.
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        // Guarded write: only fills if still empty (parallel request may have won),
        // and the unique constraint referees code collisions.
        const set = await prisma.user.updateMany({
          where: { id: req.userId!, referralCode: null },
          data: { referralCode: candidate },
        });
        if (set.count === 1) code = candidate;
        else {
          const again = await prisma.user.findUnique({ where: { id: req.userId! }, select: { referralCode: true } });
          if (again?.referralCode) code = again.referralCode;
        }
      } catch {
        /* collision — loop tries another candidate */
      }
    }
    if (!code) return res.status(500).json({ error: 'Could not generate a code, try again' });
  }
  const invited = await prisma.user.count({ where: { referredById: req.userId! } });
  res.json({ code, invited, link: `${env.WEB_ORIGIN}/register?ref=${code}` });
});

// ---- Weekly training schedule (user-editable, persisted) ----
const DEFAULT_SCHEDULE = [
  { day: 'Monday', focus: 'Chest & Triceps', groups: ['Chest', 'Triceps'] },
  { day: 'Tuesday', focus: 'Back & Biceps', groups: ['Lats', 'Biceps'] },
  { day: 'Wednesday', focus: 'Legs', groups: ['Quads', 'Hamstrings', 'Calves'] },
  { day: 'Thursday', focus: 'Shoulders & Abs', groups: ['Shoulders', 'Abs'] },
  { day: 'Friday', focus: 'Cardio', groups: ['Cardio'] },
  { day: 'Saturday', focus: 'Full Body', groups: ['Chest', 'Lats', 'Quads'] },
  { day: 'Sunday', focus: 'Rest', groups: [] as string[] },
];

meRouter.get('/schedule', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { scheduleJson: true } });
  let schedule: typeof DEFAULT_SCHEDULE = DEFAULT_SCHEDULE;
  if (user?.scheduleJson) {
    try {
      const parsed = JSON.parse(user.scheduleJson);
      if (Array.isArray(parsed) && parsed.length) schedule = parsed;
    } catch { /* keep default */ }
  }
  res.json({ schedule });
});

meRouter.patch('/schedule', async (req: AuthedRequest, res) => {
  const daySchema = z.object({ day: z.string().min(1), focus: z.string(), groups: z.array(z.string()) });
  const parsed = z.object({ schedule: z.array(daySchema).min(1).max(7) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid schedule' });
  await prisma.user.update({ where: { id: req.userId! }, data: { scheduleJson: JSON.stringify(parsed.data.schedule) } });
  res.json({ schedule: parsed.data.schedule });
});

meRouter.patch('/email', async (req: AuthedRequest, res) => {
  const schema = z.object({ email: z.string().email(), currentPassword: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });
  // The email IS the account-recovery anchor: repointing it silently with only
  // a bearer token was an account-takeover primitive. Password holders must
  // re-prove themselves (OAuth-only accounts have no password to check).
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { passwordHash: true } });
  if (me?.passwordHash) {
    if (!parsed.data.currentPassword || !(await verifyPassword(parsed.data.currentPassword, me.passwordHash))) {
      return res.status(401).json({ error: 'Current password is wrong' });
    }
  }
  const taken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (taken && taken.id !== req.userId) return res.status(409).json({ error: 'Email in use' });
  await prisma.user.update({ where: { id: req.userId! }, data: { email: parsed.data.email } });
  res.json({ ok: true });
});

meRouter.patch('/password', async (req: AuthedRequest, res) => {
  const schema = z.object({ currentPassword: z.string(), newPassword: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is wrong' });
  }
  await prisma.user.update({
    where: { id: req.userId! },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  res.json({ ok: true });
});

// ---- Delete my account ----
// Self-service, password-confirmed (OAuth-only accounts skip the check — they
// have no password). Required for GDPR Art. 17 and by both app stores before
// any TWA/wrapper submission. POST, not DELETE: a body-carrying DELETE is
// swallowed by some proxies (the 411s we've met on this very server).
meRouter.post('/delete-account', async (req: AuthedRequest, res) => {
  const parsed = z.object({ password: z.string().optional() }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { passwordHash: true, email: true } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.passwordHash) {
    if (!parsed.data.password || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Password is wrong' });
    }
  }
  console.log(`[account] user ${req.userId} (${user.email}) deleted their own account`);
  // FK cascades take the personal data with the row; DM threads keep null-safe
  // orphans by design (the other person keeps their side of the conversation).
  await prisma.user.delete({ where: { id: req.userId! } });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ ok: true });
});

// ---- Bookmarks ----
meRouter.get('/bookmarks', async (req: AuthedRequest, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(bookmarks);
});

meRouter.post('/bookmarks', async (req: AuthedRequest, res) => {
  const schema = z.object({
    contentType: z.enum(['lesson', 'recipe', 'article', 'program']),
    contentId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const bookmark = await prisma.bookmark.upsert({
    where: {
      userId_contentType_contentId: {
        userId: req.userId!,
        contentType: parsed.data.contentType,
        contentId: parsed.data.contentId,
      },
    },
    create: { userId: req.userId!, ...parsed.data },
    update: {},
  });
  res.json(bookmark);
});

meRouter.delete('/bookmarks', async (req: AuthedRequest, res) => {
  const schema = z.object({ contentType: z.string(), contentId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  await prisma.bookmark.deleteMany({
    where: { userId: req.userId!, contentType: parsed.data.contentType, contentId: parsed.data.contentId },
  });
  res.json({ ok: true });
});

// ---- Completions ("Programs Done") ----
meRouter.get('/completions', async (req: AuthedRequest, res) => {
  const completions = await prisma.lessonCompletion.findMany({
    where: { userId: req.userId! },
    include: { lesson: { include: { program: { include: { coach: true } } } } },
    orderBy: { completedAt: 'desc' },
    take: 500,
  });
  res.json(completions);
});

meRouter.post('/completions', async (req: AuthedRequest, res) => {
  const schema = z.object({ lessonId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const existing = await prisma.lessonCompletion.findUnique({
    where: { userId_lessonId: { userId: req.userId!, lessonId: parsed.data.lessonId } },
  });
  // Pace guard: a real lesson takes time. "Complete, complete, complete" in
  // seconds is fake progress — it pollutes challenges, duels and leaderboards.
  if (!existing) {
    const MIN_GAP_MS = 3 * 60 * 1000; // at most one new lesson every 3 minutes
    const DAILY_CAP = 15; // beyond this nobody is actually training
    const last = await prisma.lessonCompletion.findFirst({
      where: { userId: req.userId! },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });
    if (last && Date.now() - last.completedAt.getTime() < MIN_GAP_MS) {
      return res.status(429).json({ error: 'Slow down — finish this one first 💪' });
    }
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const today = await prisma.lessonCompletion.count({
      where: { userId: req.userId!, completedAt: { gte: dayStart } },
    });
    if (today >= DAILY_CAP) {
      return res.status(429).json({ error: 'Daily limit reached — rest is part of the program 😴' });
    }
  }
  // Re-completing must NOT bump completedAt — that would let old lessons be
  // recycled into duel/challenge windows (verified exploit).
  const completion = await prisma.lessonCompletion.upsert({
    where: { userId_lessonId: { userId: req.userId!, lessonId: parsed.data.lessonId } },
    create: { userId: req.userId!, lessonId: parsed.data.lessonId },
    update: {},
  });
  if (!existing) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: { program: true },
    });
    await awardXp(req.userId!, XP_PER_LESSON, 'workout-lesson'); // named so quests/badges see it
    await createFeedPost(
      req.userId!,
      'completion',
      `Completed "${lesson?.title ?? 'a workout'}"${lesson?.program ? ` — ${lesson.program.title}` : ''} ✅`,
      'lesson',
      parsed.data.lessonId,
      { textAr: `خلّص "${lesson?.titleAr ?? lesson?.title ?? 'تمرين'}"${lesson?.program ? ` — ${lesson.program.titleAr ?? lesson.program.title}` : ''} ✅` },
    );
  }
  await touchStreak(req.userId!);
  if (!existing) await bumpChallenges(req.userId!);
  res.json(completion);
});

// A guided workout session finished (exercise-based, not a lesson).
meRouter.post('/workout-done', async (req: AuthedRequest, res) => {
  const schema = z.object({ name: z.string().optional(), exercises: z.number().optional() });
  const parsed = schema.safeParse(req.body);
  const name = parsed.success ? parsed.data.name : undefined;
  // Throttle: ignore repeat "finishes" within 8 min (prevents XP/feed farming).
  const recent = await prisma.xpEvent.findFirst({
    where: { userId: req.userId!, reason: 'workout-session', createdAt: { gte: new Date(Date.now() - 8 * 60 * 1000) } },
  });
  if (recent) return res.json({ ok: true, throttled: true });
  await awardXp(req.userId!, 60, 'workout-session');
  await createFeedPost(req.userId!, 'completion', `Crushed a workout${name ? ` — ${name}` : ''} 💪`, 'workout', undefined, {
    textAr: `كسّر تمرين${name ? ` — ${name}` : ''} 💪`,
  });
  await touchStreak(req.userId!);
  await bumpChallenges(req.userId!);
  res.json({ ok: true });
});

// Become / update a coach profile. Becoming one is instant for the user
// (they can build their profile and programs right away) but they only enter
// the public directory once an admin flips Verified — and the admins get told
// there's someone to review, so applications can't rot silently.
meRouter.patch('/coach-profile', async (req: AuthedRequest, res) => {
  const schema = z.object({
    coachHeadline: z.string().max(120).optional(),
    coachBio: z.string().max(1000).optional(),
    coachSpecialties: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const before = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isCoach: true, firstName: true, lastName: true } });
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      isCoach: true,
      coachHeadline: parsed.data.coachHeadline,
      coachBio: parsed.data.coachBio,
      coachSpecialties: JSON.stringify(parsed.data.coachSpecialties ?? []),
    },
  });
  if (before && !before.isCoach) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const a of admins) {
      notifyUser(a.id, {
        title: 'New coach application 🎓',
        titleAr: 'طلب مدرب جديد 🎓',
        body: `${before.firstName} ${before.lastName} set up a coach profile — review & verify in Admin → Users.`,
        bodyAr: `${before.firstName} ${before.lastName} عمل بروفايل مدرب — راجعه وفعّله من إدارة المستخدمين.`,
        url: '/admin/users',
        type: 'general',
      }).catch(() => {});
    }
  }
  const { passwordHash, ...safe } = user;
  res.json(safe);
});
