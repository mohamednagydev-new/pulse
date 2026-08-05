import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { localizeResponse } from '../lib/localize';
import { dayString, weekStart } from '../lib/time';
import { computeTargets, type Targets } from '../lib/nutrition';
import { buildMealPlan, swapsFor, slotLabel, type DietPref, type PlanRecipe, type Slot } from '../lib/mealplan';
import { gatherStats, writeRecap, rewritePrompt } from '../lib/recap';
import { aiEnabled, chatComplete } from '../lib/openai';
import { consumeAi } from '../lib/aiBudget';

/**
 * The daily meal plan.
 *
 * This is the nutrition half of the coaching engine, and it is deliberately built the
 * same way as the training half: rules, not a language model. The targets come from
 * Mifflin-St Jeor via the intake, the plates come from our own recipe library, and
 * every choice can be shown back to the user as a number.
 *
 * Nothing is stored per day. The plan is a pure function of (user, date, targets,
 * library), so it is stable if you reopen the app and different tomorrow, without a
 * table that would drift out of sync with the recipes behind it.
 */
export const mealsRouter = Router();
mealsRouter.use(requireAuth, localizeResponse);

const RECIPE_SELECT = {
  id: true, title: true, titleAr: true, coverImage: true,
  calories: true, protein: true, carbs: true, fat: true,
  mealSlots: true, cuisine: true, tags: true, prepTimeMin: true,
} as const;

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function parseAvoid(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Targets from the profile when the intake has set them; otherwise worked out on the
 *  spot so someone who skipped the intake still gets a usable plan. */
async function targetsFor(userId: string): Promise<{ targets: Targets; pref: DietPref }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      goalCalories: true, goalProtein: true, goalCarbs: true, goalFat: true,
      fitnessGoal: true, heightCm: true, weightKg: true, birthYear: true, gender: true,
      dietPref: true, avoidFoods: true,
    },
  });

  const pref: DietPref = {
    diet: u?.dietPref && u.dietPref !== 'none' ? u.dietPref : null,
    avoid: parseAvoid(u?.avoidFoods ?? null),
  };

  if (u?.goalCalories && u.goalProtein) {
    return {
      targets: {
        calories: u.goalCalories,
        protein: u.goalProtein,
        carbs: u.goalCarbs ?? 0,
        fat: u.goalFat ?? 0,
        basis: 'estimated',
        note: {
          en: 'Built from the targets on your profile. Change them in Tracker and the plan follows.',
          ar: 'مبنية على الأرقام اللي في بروفايلك. غيّرها من التراكر والخطة هتمشي وراها.',
        },
      },
      pref,
    };
  }

  const assessment = await prisma.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { goal: true, activityLevel: true, daysPerWeek: true },
  });

  return {
    targets: computeTargets(
      assessment?.goal ?? u?.fitnessGoal ?? 'stay_fit',
      assessment?.activityLevel ?? 'light',
      assessment?.daysPerWeek ?? 3,
      { heightCm: u?.heightCm, weightKg: u?.weightKg, birthYear: u?.birthYear, gender: u?.gender },
    ),
    pref,
  };
}

async function library(): Promise<PlanRecipe[]> {
  return prisma.recipe.findMany({
    where: { calories: { gt: 0 }, protein: { not: null } },
    select: RECIPE_SELECT,
  }) as Promise<PlanRecipe[]>;
}

// The day's plate. ?date=YYYY-MM-DD for looking ahead or back.
mealsRouter.get('/plan', async (req: AuthedRequest, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? String(req.query.date) : dayString();
  const [{ targets, pref }, recipes] = await Promise.all([targetsFor(req.userId!), library()]);

  if (recipes.length === 0) {
    return res.json({
      date,
      targets,
      meals: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      fit: { calories: 0, protein: 0 },
      notes: [
        {
          en: 'No recipes have macros yet, so there is nothing to plan from.',
          ar: 'مفيش وصفات بماكروز لسه، فمفيش حاجة نبني عليها الخطة.',
        },
      ],
      empty: true,
    });
  }

  const plan = buildMealPlan(date, req.userId!, targets, recipes, pref);

  // Which slots they have already eaten today, so the UI can tick them off.
  const logged = await prisma.calorieEntry.findMany({
    where: { userId: req.userId!, date },
    select: { mealType: true, calories: true },
  });
  const eaten = logged.reduce((n, e) => n + e.calories, 0);

  res.json({
    ...plan,
    meals: plan.meals.map((m) => ({ ...m, label: slotLabel(m.slot) })),
    logged: { slots: [...new Set(logged.map((l) => l.mealType))], calories: eaten },
  });
});

// Alternatives for one slot — "I don't want this today".
mealsRouter.get('/swaps', async (req: AuthedRequest, res) => {
  const slot = String(req.query.slot || '') as Slot;
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return res.status(400).json({ error: 'Bad slot' });

  const [{ targets, pref }, recipes] = await Promise.all([targetsFor(req.userId!), library()]);
  const options = swapsFor(slot, targets, recipes, String(req.query.exclude || ''), pref);
  res.json({ slot, label: slotLabel(slot), options });
});

// Log a planned plate straight into the tracker — the plan is useless if following it
// is more work than ignoring it.
const logSchema = z.object({
  recipeId: z.string().min(1),
  slot: z.enum(SLOTS),
  servings: z.number().min(0.5).max(4).default(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

mealsRouter.post('/log', async (req: AuthedRequest, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { recipeId, slot, servings } = parsed.data;

  const r = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { title: true, titleAr: true, calories: true, protein: true, carbs: true, fat: true },
  });
  if (!r) return res.status(404).json({ error: 'Not found' });

  const lang = String(req.headers['x-lang'] || req.query.lang || 'en');
  const entry = await prisma.calorieEntry.create({
    data: {
      userId: req.userId!,
      date: parsed.data.date ?? dayString(),
      name: (lang.startsWith('ar') && r.titleAr) || r.title,
      mealType: slot,
      calories: Math.round((r.calories ?? 0) * servings),
      protein: r.protein ? Math.round(r.protein * servings) : null,
      carbs: r.carbs ? Math.round(r.carbs * servings) : null,
      fat: r.fat ? Math.round(r.fat * servings) : null,
    },
  });
  res.status(201).json(entry);
});

/* ------------------------------------------------------------------ *
 * Egyptian food table.
 *
 * CalorieEntry used to be free text and a number the user guessed, which makes the
 * whole tracker decorative. Global food databases have none of what people here
 * actually eat, so we carry our own.
 * ------------------------------------------------------------------ */

/** Arabic search only works if we normalise first: أ إ آ -> ا, ة -> ه, ى -> ي, and
 *  strip the diacritics people never type. Without this, "كشرى" finds nothing. */
function normalizeAr(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .toLowerCase()
    .trim();
}

mealsRouter.get('/foods', async (req: AuthedRequest, res) => {
  const q = normalizeAr(String(req.query.q || ''));
  const category = String(req.query.category || '').trim();

  // The table is small enough to filter in memory, which is the only way to apply
  // Arabic normalisation to both sides of the comparison on SQLite.
  const all = await prisma.food.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ common: 'desc' }, { order: 'asc' }],
  });

  if (!q) return res.json({ foods: all.filter((f) => f.common).slice(0, 40) });

  const hit = (f: (typeof all)[number]) => {
    const hay = [f.name, f.nameAr, ...parseAvoid(f.aliases)].map(normalizeAr);
    return hay.some((h) => h.includes(q));
  };
  res.json({ foods: all.filter(hit).slice(0, 40) });
});

const foodLogSchema = z.object({
  foodId: z.string().min(1),
  portions: z.number().min(0.25).max(10).default(1),
  mealType: z.enum(SLOTS).default('snack'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

mealsRouter.post('/foods/log', async (req: AuthedRequest, res) => {
  const parsed = foodLogSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { foodId, portions, mealType } = parsed.data;

  const f = await prisma.food.findUnique({ where: { id: foodId } });
  if (!f) return res.status(404).json({ error: 'Not found' });

  const lang = String(req.headers['x-lang'] || req.query.lang || 'en');
  const entry = await prisma.calorieEntry.create({
    data: {
      userId: req.userId!,
      date: parsed.data.date ?? dayString(),
      name: lang.startsWith('ar') ? f.nameAr : f.name,
      mealType,
      calories: Math.round(f.calories * portions),
      protein: Math.round(f.protein * portions),
      carbs: Math.round(f.carbs * portions),
      fat: Math.round(f.fat * portions),
    },
  });
  res.status(201).json(entry);
});

// What the user can filter the food table by, with counts.
mealsRouter.get('/foods/categories', async (_req, res) => {
  const groups = await prisma.food.groupBy({ by: ['category'], _count: true });
  res.json({
    categories: groups
      .map((g) => ({ key: g.category, count: g._count }))
      .sort((a, b) => b.count - a.count),
  });
});

/* ------------------------------------------------------------------ *
 * The week in review.
 *
 * Lives here rather than in ai.ts on purpose: it is not an AI feature. The numbers
 * and the prose are computed from rows, and the model — if there is one — only gets
 * to reword the finished sentences. Putting it behind /api/ai would have made a
 * working feature disappear the day the key is removed.
 * ------------------------------------------------------------------ */

mealsRouter.get('/recap', async (req: AuthedRequest, res) => {
  const week = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.week || ''))
    ? String(req.query.week)
    : weekStart();
  const lang = String(req.headers['x-lang'] || req.query.lang || 'en').startsWith('ar') ? 'ar' : 'en';

  // Generated once per week and reused. A recap that reads differently every time you
  // open it is not a record of anything.
  const cached = await prisma.weeklyRecap.findUnique({
    where: { userId_weekKey: { userId: req.userId!, weekKey: week } },
  });
  if (cached) {
    return res.json({
      weekKey: week,
      stats: JSON.parse(cached.stats),
      text: lang === 'ar' ? cached.aiTextAr || cached.textAr : cached.aiText || cached.text,
      polished: Boolean(lang === 'ar' ? cached.aiTextAr : cached.aiText),
    });
  }

  const stats = await gatherStats(req.userId!, week);
  const base = writeRecap(stats);

  // The optional warm rewrite. Both languages are attempted, both are allowed to fail,
  // and a failure costs nothing because the rule-based text is already written.
  let aiText: string | null = null;
  let aiTextAr: string | null = null;
  if (aiEnabled()) {
    const budget = await consumeAi(req.userId!, 'summary');
    if (budget.ok) {
      for (const l of ['en', 'ar'] as const) {
        try {
          const p = rewritePrompt(base, l);
          const out = (
            await chatComplete(
              [
                { role: 'system', content: p.system },
                { role: 'user', content: p.user },
              ],
              { temperature: 0.7 },
            )
          ).trim();
          // Guard against the model returning something absurd or empty. If the
          // rewrite is not obviously a rewrite, we keep our own sentences.
          if (out.length > 15 && out.length < 600) {
            if (l === 'en') aiText = out;
            else aiTextAr = out;
          }
        } catch {
          /* rate limit, outage, bad key — the rule text already covers us */
        }
      }
    }
  }

  const row = await prisma.weeklyRecap.create({
    data: {
      userId: req.userId!,
      weekKey: week,
      stats: JSON.stringify(stats),
      text: base.en,
      textAr: base.ar,
      aiText,
      aiTextAr,
    },
  });

  res.json({
    weekKey: week,
    stats,
    text: lang === 'ar' ? row.aiTextAr || row.textAr : row.aiText || row.text,
    polished: Boolean(lang === 'ar' ? row.aiTextAr : row.aiText),
  });
});

// Diet preferences — the one thing the plan needs that the intake does not ask.
const prefSchema = z.object({
  dietPref: z.enum(['none', 'vegetarian', 'vegan']).optional(),
  avoidFoods: z.array(z.string()).max(12).optional(),
});

mealsRouter.patch('/prefs', async (req: AuthedRequest, res) => {
  const parsed = prefSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(parsed.data.dietPref ? { dietPref: parsed.data.dietPref } : {}),
      ...(parsed.data.avoidFoods ? { avoidFoods: JSON.stringify(parsed.data.avoidFoods) } : {}),
    },
    select: { dietPref: true, avoidFoods: true },
  });
  res.json(user);
});
