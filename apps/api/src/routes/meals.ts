import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { localizeResponse } from '../lib/localize';
import { touchStreak } from '../lib/gamify';
import { bumpChallenges, awardXp } from '../lib/social';
import { notifyUser } from './push';
import { dayString, weekStart, localDow } from '../lib/time';
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Targets from the profile when the intake has set them; otherwise worked out on the
 *  spot so someone who skipped the intake still gets a usable plan.
 *  Training days get a bigger budget (+200 kcal, +10g protein) from the user's
 *  own weekly schedule — the diet finally KNOWS about the workouts. */
async function targetsFor(userId: string): Promise<{ targets: Targets; pref: DietPref; trainingDay: boolean }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      goalCalories: true, goalProtein: true, goalCarbs: true, goalFat: true,
      fitnessGoal: true, heightCm: true, weightKg: true, birthYear: true, gender: true,
      dietPref: true, avoidFoods: true, scheduleJson: true,
    },
  });

  // Planned (not completed) day: stable all day, so the plate doesn't change
  // under the user depending on whether they trained before or after lunch.
  let trainingDay = false;
  try {
    const sched = u?.scheduleJson ? JSON.parse(u.scheduleJson) : null;
    const today = Array.isArray(sched) ? sched.find((d: any) => d.day === WEEKDAYS[localDow()]) : null;
    trainingDay = today ? Array.isArray(today.groups) && today.groups.length > 0 : WEEKDAYS[localDow()] !== 'Sunday';
  } catch {
    trainingDay = false;
  }

  const boost = (t: Targets): Targets =>
    trainingDay
      ? { ...t, calories: t.calories + 200, protein: t.protein + 10, carbs: t.carbs ? t.carbs + 25 : t.carbs }
      : t;

  const pref: DietPref = {
    diet: u?.dietPref && u.dietPref !== 'none' ? u.dietPref : null,
    avoid: parseAvoid(u?.avoidFoods ?? null),
  };

  if (u?.goalCalories && u.goalProtein) {
    return {
      targets: boost({
        calories: u.goalCalories,
        protein: u.goalProtein,
        carbs: u.goalCarbs ?? 0,
        fat: u.goalFat ?? 0,
        basis: 'estimated',
        note: {
          en: 'Built from the targets on your profile. Change them in Tracker and the plan follows.',
          ar: 'مبنية على الأرقام اللي في بروفايلك. غيّرها من التراكر والخطة هتمشي وراها.',
        },
      }),
      pref,
      trainingDay,
    };
  }

  const assessment = await prisma.assessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { goal: true, activityLevel: true, daysPerWeek: true },
  });

  return {
    targets: boost(
      computeTargets(
        assessment?.goal ?? u?.fitnessGoal ?? 'stay_fit',
        assessment?.activityLevel ?? 'light',
        assessment?.daysPerWeek ?? 3,
        { heightCm: u?.heightCm, weightKg: u?.weightKg, birthYear: u?.birthYear, gender: u?.gender },
      ),
    ),
    pref,
    trainingDay,
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
  const [{ targets, pref, trainingDay }, recipes] = await Promise.all([targetsFor(req.userId!), library()]);

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
    trainingDay,
    notes: [
      ...(trainingDay
        ? [{
            en: 'Training day: +200 kcal and +10g protein over your base — fuel the session.',
            ar: 'يوم تمرين: زودنالك ٢٠٠ سعرة و١٠ جرام بروتين عن يومك العادي — عشان تدّي في التمرين.',
          }]
        : []),
      ...(plan as any).notes ?? [],
    ],
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
  // Same credit as /api/tracker/calories: logging food is logging food,
  // whichever tab it came through.
  await touchStreak(req.userId!);
  await bumpChallenges(req.userId!, 'calorie');
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

  // Category browse shows the WHOLE category — the common-only cut made most
  // of the table undiscoverable without guessing the right search word.
  if (!q) return res.json({ foods: category ? all.slice(0, 80) : all.filter((f) => f.common).slice(0, 40) });

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
  // Same credit as /api/tracker/calories: logging food is logging food,
  // whichever tab it came through.
  await touchStreak(req.userId!);
  await bumpChallenges(req.userId!, 'calorie');
  res.status(201).json(entry);
});

/* ------------------------------------------------------------------ *
 * My recipes: user-composed dishes from Food rows. The server recomputes
 * macros from the ingredient list — client-sent numbers are never trusted.
 * ------------------------------------------------------------------ */
mealsRouter.get('/my-recipes', async (req: AuthedRequest, res) => {
  const recipes = await prisma.customRecipe.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ recipes: recipes.map((r) => ({ ...r, items: JSON.parse(r.items) })) });
});

mealsRouter.post('/my-recipes', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(60),
      servings: z.number().int().min(1).max(20).default(1),
      items: z.array(z.object({ foodId: z.string(), portions: z.number().min(0.25).max(20) })).min(1).max(30),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const foods = await prisma.food.findMany({ where: { id: { in: parsed.data.items.map((i) => i.foodId) } } });
  const byId = new Map(foods.map((f) => [f.id, f]));
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  const items = [];
  for (const it of parsed.data.items) {
    const f = byId.get(it.foodId);
    if (!f) return res.status(400).json({ error: 'Unknown food' });
    calories += f.calories * it.portions;
    protein += f.protein * it.portions;
    carbs += f.carbs * it.portions;
    fat += f.fat * it.portions;
    items.push({ foodId: f.id, portions: it.portions, name: f.name, nameAr: f.nameAr });
  }
  const recipe = await prisma.customRecipe.create({
    data: {
      userId: req.userId!,
      name: parsed.data.name,
      servings: parsed.data.servings,
      items: JSON.stringify(items),
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    },
  });
  res.status(201).json({ ...recipe, items });
});

mealsRouter.delete('/my-recipes/:id', async (req: AuthedRequest, res) => {
  await prisma.customRecipe.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ ok: true });
});

mealsRouter.post('/my-recipes/:id/log', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      servings: z.number().min(0.5).max(10).default(1),
      mealType: z.enum(SLOTS).default('snack'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const r = await prisma.customRecipe.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!r) return res.status(404).json({ error: 'Not found' });
  const per = parsed.data.servings / r.servings;
  const entry = await prisma.calorieEntry.create({
    data: {
      userId: req.userId!,
      date: parsed.data.date ?? dayString(),
      name: r.name,
      mealType: parsed.data.mealType,
      calories: Math.round(r.calories * per),
      protein: Math.round(r.protein * per),
      carbs: Math.round(r.carbs * per),
      fat: Math.round(r.fat * per),
    },
  });
  // Same credit as /api/tracker/calories: logging food is logging food,
  // whichever tab it came through.
  await touchStreak(req.userId!);
  await bumpChallenges(req.userId!, 'calorie');
  res.status(201).json(entry);
});

/* ------------------------------------------------------------------ *
 * Barcode → nutrition + a 1–10 fit score for YOUR goal.
 * Product data from Open Food Facts (server-side, cached) — it has good
 * coverage of Egyptian supermarket products. The score is a transparent
 * heuristic over per-100g numbers, tilted by the user's fitnessGoal.
 * ------------------------------------------------------------------ */
const barcodeCache = new Map<string, { at: number; data: unknown }>();

mealsRouter.get('/barcode/:code', async (req: AuthedRequest, res) => {
  const code = req.params.code;
  if (!/^\d{6,14}$/.test(code)) return res.status(400).json({ error: 'Invalid barcode' });

  const cached = barcodeCache.get(code);
  if (cached && Date.now() - cached.at < 24 * 3600 * 1000) return res.json(cached.data);

  let product: any;
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size,quantity`,
      { headers: { 'User-Agent': 'PULSE-fitness-app/1.0 (pulse.geddo.online)' }, signal: AbortSignal.timeout(8000) },
    );
    const json: any = await r.json();
    product = json?.product;
  } catch {
    return res.status(502).json({ error: 'Lookup unavailable — try again' });
  }
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const n = product.nutriments ?? {};
  const kcal = Math.round(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0));
  const protein = Math.round((n['proteins_100g'] ?? 0) * 10) / 10;
  const carbs = Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10;
  const fat = Math.round((n['fat_100g'] ?? 0) * 10) / 10;
  const sugars = Math.round((n['sugars_100g'] ?? 0) * 10) / 10;

  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { fitnessGoal: true, preferredLang: true } });
  const goal = me?.fitnessGoal ?? 'stay_fit';

  // Transparent scoring: energy density and sugar push down, protein pulls up.
  let score = 10;
  if (kcal > 400) score -= 3;
  else if (kcal > 250) score -= 2;
  else if (kcal > 150) score -= 1;
  if (sugars > 20) score -= 3;
  else if (sugars > 10) score -= 2;
  else if (sugars > 5) score -= 1;
  if (protein >= 15) score += 2;
  else if (protein >= 8) score += 1;
  if (fat > 20) score -= 1;
  if (goal === 'lose_weight' && kcal > 300) score -= 1;
  if (goal === 'build_muscle' && protein < 5) score -= 1;
  score = Math.max(1, Math.min(10, score));

  const advice =
    score >= 7
      ? { en: 'Good fit for your goal 👌', ar: 'تمام لهدفك 👌' }
      : score >= 4
        ? { en: 'Okay — watch the portion size', ar: 'ماشي — بس خد بالك من الكمية' }
        : {
            en: 'Not your best pick — something high-protein or fresh fruit beats it',
            ar: 'مش أحسن اختيار لهدفك — حاجة عالية البروتين أو فاكهة طازة أحسن منه',
          };

  const data = {
    code,
    name: product.product_name || 'Unknown product',
    brand: product.brands || null,
    servingSize: product.serving_size || null,
    per100g: { kcal, protein, carbs, fat, sugars },
    score,
    advice,
  };
  if (barcodeCache.size > 500) barcodeCache.clear();
  barcodeCache.set(code, { at: Date.now(), data });
  res.json(data);
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

/**
 * Shopping list for the next N days of the plan (default 3, max 7). The plan is
 * a pure function of (user, date), so tomorrow's plates are known today — which
 * is exactly what a Saturday grocery run needs. Identical ingredient lines are
 * merged with a count; language follows x-lang like everything else.
 */
mealsRouter.get('/grocery', async (req: AuthedRequest, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 3, 1), 7);
  const [{ targets, pref }, recipes] = await Promise.all([targetsFor(req.userId!), library()]);
  if (recipes.length === 0) return res.json({ days, items: [], recipes: [] });

  // recipeId -> total servings across the window
  const servings = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = dayString(new Date(Date.now() + i * 86400000));
    const plan = buildMealPlan(date, req.userId!, targets, recipes, pref);
    for (const m of plan.meals) {
      servings.set(m.recipe.id, (servings.get(m.recipe.id) ?? 0) + m.servings);
    }
  }

  const rows = await prisma.recipe.findMany({
    where: { id: { in: [...servings.keys()] } },
    select: { id: true, title: true, titleAr: true, ingredients: true, ingredientsAr: true },
  });

  const lang = String(req.headers['x-lang'] || 'en');
  const counts = new Map<string, number>();
  const usedIn: { id: string; title: string; servings: number }[] = [];
  for (const r of rows) {
    usedIn.push({ id: r.id, title: (lang === 'ar' && r.titleAr) || r.title, servings: servings.get(r.id) ?? 1 });
    const raw = lang === 'ar' && r.ingredientsAr ? r.ingredientsAr : r.ingredients;
    let lines: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      lines = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { /* unparseable recipe — skip its lines */ }
    for (const line of lines) {
      const key = line.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + (servings.get(r.id) ?? 1));
    }
  }

  res.json({
    days,
    items: [...counts.entries()].map(([text, n]) => ({ text, count: n })),
    recipes: usedIn.sort((a, b) => b.servings - a.servings),
  });
});

// Diet preferences — the one thing the plan needs that the intake does not ask.
const prefSchema = z.object({
  dietPref: z.enum(['none', 'vegetarian', 'vegan']).optional(),
  avoidFoods: z.array(z.string().max(60)).max(12).optional(),
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

/* ------------------------------------------------------------------ *
 * Global diet programs — structured commitments anyone can join.
 * A day only counts if food was LOGGED that day (tracked, not vibes).
 * ------------------------------------------------------------------ */

const parseDays = (json: string): number[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
};

function shapeEnrollment(e: { completedDays: string; startedAt: Date; finishedAt: Date | null }, days: number) {
  const done = parseDays(e.completedDays);
  const dayIndex = Math.max(0, Math.min(Math.floor((Date.now() - e.startedAt.getTime()) / 86400000), days - 1));
  return {
    startedAt: e.startedAt,
    finishedAt: e.finishedAt,
    doneCount: done.length,
    dayIndex,
    todayDone: done.includes(dayIndex),
    pct: Math.round((done.length / days) * 100),
  };
}

mealsRouter.get('/diet-programs', async (req: AuthedRequest, res) => {
  const [programs, mine] = await Promise.all([
    prisma.dietProgram.findMany({ orderBy: { order: 'asc' } }),
    prisma.dietEnrollment.findMany({ where: { userId: req.userId! } }),
  ]);
  const mineMap = new Map(mine.map((e) => [e.programId, e]));
  const counts = await prisma.dietEnrollment.groupBy({ by: ['programId'], _count: true });
  const countMap = new Map(counts.map((c) => [c.programId, c._count]));
  res.json(
    programs.map((p) => {
      const e = mineMap.get(p.id);
      let tips: { en: string; ar: string }[] = [];
      try { tips = JSON.parse(p.tipsJson); } catch { /* fine */ }
      const shaped = e ? shapeEnrollment(e, p.days) : null;
      return {
        id: p.id, title: p.title, titleAr: p.titleAr, description: p.description, descriptionAr: p.descriptionAr,
        days: p.days, kind: p.kind, emoji: p.emoji,
        participants: countMap.get(p.id) ?? 0,
        enrollment: shaped,
        todayTip: shaped && tips.length ? tips[shaped.dayIndex % tips.length] : null,
      };
    }),
  );
});

mealsRouter.post('/diet-programs/:id/join', async (req: AuthedRequest, res) => {
  const program = await prisma.dietProgram.findUnique({ where: { id: req.params.id } });
  if (!program) return res.status(404).json({ error: 'Not found' });
  // One ACTIVE diet program at a time — commitments compete, they don't stack.
  const active = await prisma.dietEnrollment.findFirst({ where: { userId: req.userId!, finishedAt: null } });
  if (active && active.programId !== program.id) return res.status(409).json({ error: 'Finish or leave your current program first' });
  const e = await prisma.dietEnrollment.upsert({
    where: { userId_programId: { userId: req.userId!, programId: program.id } },
    create: { userId: req.userId!, programId: program.id },
    // Re-joining a finished program restarts it fresh.
    update: { completedDays: '[]', startedAt: new Date(), finishedAt: null },
  });
  res.status(201).json(shapeEnrollment(e, program.days));
});

mealsRouter.post('/diet-programs/:id/day-done', async (req: AuthedRequest, res) => {
  const program = await prisma.dietProgram.findUnique({ where: { id: req.params.id } });
  if (!program) return res.status(404).json({ error: 'Not found' });
  const e = await prisma.dietEnrollment.findUnique({
    where: { userId_programId: { userId: req.userId!, programId: program.id } },
  });
  if (!e || e.finishedAt) return res.status(400).json({ error: 'Not enrolled' });
  // The tracked part: today only counts when food was actually logged today.
  const logged = await prisma.calorieEntry.count({ where: { userId: req.userId!, date: dayString() } });
  if (logged === 0) return res.status(400).json({ error: 'Log at least one meal first', code: 'log-first' });
  const days = parseDays(e.completedDays);
  const dayIndex = Math.max(0, Math.min(Math.floor((Date.now() - e.startedAt.getTime()) / 86400000), program.days - 1));
  if (!days.includes(dayIndex)) days.push(dayIndex);
  const finished = days.length >= program.days;
  const updated = await prisma.dietEnrollment.update({
    where: { id: e.id },
    data: { completedDays: JSON.stringify(days), finishedAt: finished ? new Date() : null },
  });
  if (finished) {
    await awardXp(req.userId!, 250, 'diet-program-complete');
    notifyUser(req.userId!, {
      title: 'Diet program complete! 🏆',
      titleAr: 'خلّصت برنامج الدايت! 🏆',
      body: `${program.title} — ${program.days} days of commitment. +250 XP.`,
      bodyAr: `«${program.titleAr ?? program.title}» — ${program.days} يوم التزام. +٢٥٠ نقطة.`,
      url: '/diet-programs',
      type: 'milestone',
    }).catch(() => {});
  }
  res.json({ ...shapeEnrollment(updated, program.days), finished });
});

mealsRouter.post('/diet-programs/:id/leave', async (req: AuthedRequest, res) => {
  await prisma.dietEnrollment.deleteMany({ where: { userId: req.userId!, programId: req.params.id, finishedAt: null } });
  res.json({ ok: true });
});
