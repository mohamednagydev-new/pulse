import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { parseArray } from '../lib/json';
import { dayString } from '../lib/time';
import { optionalAuth, AuthedRequest } from '../middleware/auth';
import { preferredGender, pickVideo, pickVideos } from '../lib/genderMedia';

export const contentRouter = Router();

// Content is public, but a signed-in user's gender picks the video variant.
contentRouter.use(optionalAuth);

// ---- Home ("Recommended") ----
contentRouter.get('/home', async (_req, res) => {
  const [banners, coaches, fitForLife, mealPrep, challenges] = await Promise.all([
    prisma.banner.findMany({ where: { section: 'home_sponsor' }, orderBy: { order: 'asc' } }),
    prisma.coach.findMany({ orderBy: { order: 'asc' } }),
    prisma.featuredItem.findMany({ where: { section: 'fit_for_life' }, orderBy: { order: 'asc' } }),
    prisma.featuredItem.findMany({ where: { section: 'meal_prep' }, orderBy: { order: 'asc' } }),
    // Real challenges, not FeaturedItem placeholders. The two placeholders here
    // named challenges that did not exist, had no Arabic, and both linked to the
    // same page — while 37 joinable challenges sat unused behind them.
    prisma.challenge.findMany({
      where: { kind: 'global', endsOn: { gte: dayString() } },
      orderBy: [{ startsOn: 'desc' }],
      take: 10,
      include: { _count: { select: { participants: true } } },
    }),
  ]);

  res.json({
    banners,
    coaches,
    fitForLife,
    mealPrep,
    challenges: challenges.map(({ _count, ...c }) => ({ ...c, participants: _count.participants })),
  });
});

// ---- Banners / ads (by placement section) ----
contentRouter.get('/banners', async (req, res) => {
  const section = typeof req.query.section === 'string' ? req.query.section : undefined;
  const banners = await prisma.banner.findMany({
    where: section ? { section } : undefined,
    orderBy: { order: 'asc' },
  });
  res.json(banners);
});

// Ad metrics — fire-and-forget impression/click counters.
contentRouter.post('/banners/:id/impression', async (req, res) => {
  await prisma.banner.updateMany({ where: { id: req.params.id }, data: { impressions: { increment: 1 } } });
  res.json({ ok: true });
});
contentRouter.post('/banners/:id/click', async (req, res) => {
  await prisma.banner.updateMany({ where: { id: req.params.id }, data: { clicks: { increment: 1 } } });
  res.json({ ok: true });
});

// ---- Coaches ----
contentRouter.get('/coaches', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : undefined;
  const coaches = await prisma.coach.findMany({
    where: type ? { type } : undefined,
    orderBy: { order: 'asc' },
  });
  res.json(coaches);
});

contentRouter.get('/coaches/:id', async (req, res) => {
  const coach = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: { programs: { orderBy: { order: 'asc' } } },
  });
  if (!coach) return res.status(404).json({ error: 'Not found' });
  res.json(coach);
});

// ---- Programs & lessons ----
contentRouter.get('/programs', async (req, res) => {
  const { coachId, level } = req.query as { coachId?: string; level?: string };
  const programs = await prisma.program.findMany({
    where: {
      ...(coachId ? { coachId } : {}),
      ...(level ? { level: level.toUpperCase() } : {}),
    },
    include: { coach: true, _count: { select: { lessons: true } } },
    orderBy: { order: 'asc' },
  });
  res.json(programs);
});

contentRouter.get('/programs/:id', async (req, res) => {
  const program = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: { coach: true, lessons: { orderBy: { order: 'asc' } } },
  });
  if (!program) return res.status(404).json({ error: 'Not found' });
  res.json(program);
});

contentRouter.get('/lessons/:id', async (req: AuthedRequest, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { program: { include: { coach: true } }, video: true },
  });
  if (!lesson) return res.status(404).json({ error: 'Not found' });

  // A videoId whose Video row has gone (deleted upload, restored database) would
  // otherwise win over videoUrl and render a player with nothing behind it. Treat
  // it as absent so the link takes over.
  const resolved = lesson.videoId && !lesson.video ? { ...lesson, videoId: null } : lesson;
  res.json(pickVideo(resolved, await preferredGender(req.userId)));
});

// ---- Exercises (muscle map) ----
contentRouter.get('/muscle-groups', async (req, res) => {
  const side = typeof req.query.side === 'string' ? req.query.side : undefined;
  const groups = await prisma.muscleGroup.findMany({
    where: side ? { bodySide: side } : undefined,
    include: { _count: { select: { exercises: true } } },
    orderBy: { order: 'asc' },
  });
  res.json(groups);
});

contentRouter.get('/muscle-groups/:id', async (req: AuthedRequest, res) => {
  const group = await prisma.muscleGroup.findUnique({
    where: { id: req.params.id },
    include: { exercises: { orderBy: { order: 'asc' } } },
  });
  if (!group) return res.status(404).json({ error: 'Not found' });
  const gender = await preferredGender(req.userId);
  const limits = await userLimitations(req.userId);

  // Resolve the progression ladder to names in one query, so the session can
  // show "easier: incline push-up / harder: archer push-up" chips directly.
  const ladderIds = [...new Set(group.exercises.flatMap((e) => [e.easierId, e.harderId]).filter(Boolean))] as string[];
  const ladder = ladderIds.length
    ? await prisma.exercise.findMany({ where: { id: { in: ladderIds } }, select: { id: true, name: true, nameAr: true, muscleGroupId: true } })
    : [];
  const ladderMap = new Map(ladder.map((l) => [l.id, l]));

  res.json({
    ...group,
    exercises: pickVideos(group.exercises, gender).map((e) => {
      const areas = parseArray((e as any).contraindications) as string[];
      // Only the overlap with what THIS user said hurts. Everyone else sees a
      // clean list — a warning shown to people it doesn't apply to is noise.
      const hits = areas.filter((x) => limits.includes(x));
      return {
        ...e,
        instructions: parseArray(e.instructions),
        equipment: parseArray(e.equipment),
        contraindications: areas,
        flaggedFor: hits,
        caution: hits.length > 0,
        easier: e.easierId ? ladderMap.get(e.easierId) ?? null : null,
        harder: e.harderId ? ladderMap.get(e.harderId) ?? null : null,
      };
    }),
  });
});

/** Body areas the user's latest assessment said to work around. */
async function userLimitations(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const a = await prisma.assessment
    .findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { limitations: true } })
    .catch(() => null);
  if (!a?.limitations) return [];
  try {
    const p = JSON.parse(a.limitations);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

// ---- Wellness library: categories / articles / recipes ----
contentRouter.get('/categories', async (req, res) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
  const categories = await prisma.category.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { order: 'asc' },
  });
  res.json(categories);
});

contentRouter.get('/categories/:id', async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: {
      articles: { orderBy: { order: 'asc' }, select: { id: true, title: true, excerpt: true, coverImage: true, readTimeMin: true } },
      recipes: { orderBy: { order: 'asc' }, select: { id: true, title: true, coverImage: true, calories: true, prepTimeMin: true, difficulty: true } },
    },
  });
  if (!category) return res.status(404).json({ error: 'Not found' });
  res.json(category);
});

contentRouter.get('/articles/:id', async (req, res) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json({ ...article, tags: parseArray(article.tags) });
});

contentRouter.get('/recipes/:id', async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!recipe) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...recipe,
    ingredients: parseArray(recipe.ingredients),
    steps: parseArray(recipe.steps),
    tags: parseArray(recipe.tags),
  });
});

// ---- Membership plans ----
contentRouter.get('/plans', async (_req, res) => {
  const plans = await prisma.membershipPlan.findMany({ where: { active: true } });
  res.json(plans.map((p) => ({ ...p, features: parseArray(p.features) })));
});

// ---- Search (LIKE-based; FTS5 upgrade later) ----
contentRouter.get('/search', async (req, res) => {
  const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
  if (q.length < 2) return res.json({ programs: [], recipes: [], articles: [], exercises: [] });
  const contains = { contains: q };
  // Arabic columns included — most of the audience types Arabic, and a search
  // that only reads the English columns silently returns nothing for them.
  const [programs, recipes, articles, exercises] = await Promise.all([
    prisma.program.findMany({ where: { OR: [{ title: contains }, { titleAr: contains }] }, take: 10, include: { coach: true } }),
    prisma.recipe.findMany({ where: { OR: [{ title: contains }, { titleAr: contains }, { about: contains }, { aboutAr: contains }] }, take: 10 }),
    prisma.article.findMany({ where: { OR: [{ title: contains }, { titleAr: contains }, { body: contains }, { bodyAr: contains }] }, take: 10 }),
    prisma.exercise.findMany({ where: { OR: [{ name: contains }, { nameAr: contains }] }, take: 10 }),
  ]);
  res.json({ programs, recipes, articles, exercises });
});
