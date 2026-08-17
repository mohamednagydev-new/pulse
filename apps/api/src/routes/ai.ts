import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { aiEnabled, chatComplete, visionComplete, embed, cosine } from '../lib/openai';
import { dayString } from '../lib/time';
import { pickLang } from '../lib/localize';
import { consumeAi, remainingAi, OVER_BUDGET, type AiKind } from '../lib/aiBudget';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get('/status', async (req: AuthedRequest, res) => {
  if (!aiEnabled()) return res.json({ enabled: false });
  res.json({ enabled: true, remaining: await remainingAi(req.userId!) });
});

/** Guard for every billable route: is the feature on, and does this user have budget?
 *  Returns true when the caller should stop — the response has already been sent. */
async function blocked(req: AuthedRequest, res: any, kind: AiKind): Promise<boolean> {
  if (!aiEnabled()) {
    res.status(503).json({ error: 'AI not configured' });
    return true;
  }
  const budget = await consumeAi(req.userId!, kind, req.role);
  if (!budget.ok) {
    const lang = pickLang(req);
    res.status(429).json({ error: lang === 'ar' ? OVER_BUDGET.ar : OVER_BUDGET.en, limit: budget.limit });
    return true;
  }
  return false;
}

async function semanticSearch(q: string, lang: string, limit = 8) {
  const qv = await embed(q);
  const rows = await prisma.contentEmbedding.findMany({ where: { lang } });
  return rows
    .map((r) => ({ r, score: cosine(qv, JSON.parse(r.vector)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({ contentType: s.r.contentType, contentId: s.r.contentId, text: s.r.text, score: s.score }));
}

// Embeddings-based semantic search (falls back to empty if not reindexed).
aiRouter.get('/search', async (req: AuthedRequest, res) => {
  if (await blocked(req, res, 'search')) return;
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  try {
    res.json({ results: await semanticSearch(q, pickLang(req)) });
  } catch {
    res.status(500).json({ error: 'search failed' });
  }
});

// AI Coach chat with retrieval-augmented context from the app's own library.
aiRouter.post('/chat', async (req: AuthedRequest, res) => {
  if (await blocked(req, res, 'chat')) return;
  const schema = z.object({
    message: z.string().min(1),
    conversationId: z.string().optional(),
    /** 'nutrition' = the AI nutritionist persona: food-focused, answers with
     *  the user's OWN targets and journey in context. */
    mode: z.enum(['coach', 'nutrition']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const lang = pickLang(req);

  let convo = parsed.data.conversationId
    ? await prisma.conversation.findFirst({ where: { id: parsed.data.conversationId, userId: req.userId! } })
    : null;
  if (!convo) {
    convo = await prisma.conversation.create({
      data: { userId: req.userId!, title: parsed.data.message.slice(0, 40) },
    });
  }

  let context = '';
  let grounded = false;
  try {
    const hits = await semanticSearch(parsed.data.message, lang, 6);
    context = hits.map((h, i) => `[${i + 1}] (${h.contentType}) ${h.text.slice(0, 500)}`).join('\n\n');
    grounded = hits.length > 0;
  } catch {
    /* index not built — handled in the prompt below, never silently ignored */
  }

  const history = await prisma.chatMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  /**
   * Two things this prompt has to prevent.
   *
   * First, ungrounded answers. When prisma/embed.ts has never run, CONTEXT is empty —
   * and the previous prompt let the model answer anyway. At that point this is not
   * "the PULSE coach citing our library", it is generic ChatGPT wearing our name,
   * saying things nobody here wrote or reviewed. Now it is told it has no library and
   * must admit it.
   *
   * Second, medical advice. "Advise consulting a professional" is a disclaimer bolted
   * onto an answer already given. On a health surface, in a market where people will
   * absolutely ask about diabetes and blood pressure, it has to decline and hand over
   * to a human — which we can actually do, because the coach directory exists.
   */
  // The nutritionist answers with the USER'S OWN numbers on the table — a
  // generic "eat more protein" is what makes AI chats feel useless.
  const nutrition = parsed.data.mode === 'nutrition';
  let profileBlock = '';
  if (nutrition) {
    const [u, todayCals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: {
          goalCalories: true, goalProtein: true, weightKg: true, targetWeightKg: true,
          dietStartedAt: true, dietPref: true, fitnessGoal: true, gender: true,
        },
      }),
      prisma.calorieEntry.aggregate({
        where: { userId: req.userId!, date: dayString() },
        _sum: { calories: true, protein: true },
      }),
    ]);
    profileBlock = [
      '',
      "USER'S NUTRITION PROFILE (use these real numbers in answers when relevant):",
      `- Goal: ${u?.fitnessGoal ?? 'unknown'} · Daily target: ${u?.goalCalories ?? '?'} kcal / ${u?.goalProtein ?? '?'}g protein`,
      `- Weight: ${u?.weightKg ?? '?'}kg${u?.targetWeightKg ? ` → target ${u.targetWeightKg}kg (diet journey ${u.dietStartedAt ? 'ACTIVE' : 'not started'})` : ''}`,
      `- Eaten TODAY so far: ${todayCals._sum.calories ?? 0} kcal / ${Math.round(todayCals._sum.protein ?? 0)}g protein`,
      `- Diet preference: ${u?.dietPref ?? 'none'}`,
    ].join('\n');
  }

  const system = [
    nutrition
      ? 'You are the PULSE Nutritionist (أخصائي التغذية) - a practical nutrition assistant for an Egyptian audience. Egyptian foods first (فول، فراخ، أرز، كشري…), budget-aware, zero guilt-tripping.'
      : 'You are the PULSE Coach - a practical fitness and wellness assistant for an Egyptian audience.',
    `Answer in ${lang === 'ar' ? 'simple Egyptian Arabic, not formal MSA' : 'English'}.`,
    'Keep every answer SHORT: 2-4 sentences, no lists unless asked, no repetition of the question. One focused follow-up question at most.',
    ...(nutrition
      ? [
          "Use the user's profile numbers below when they matter (remaining calories today, protein gap, journey pace).",
          'When an in-app tool answers better, point to it briefly: the meal plan (خطة الوجبات), the barcode scanner, logging by voice, or the diet programs.',
        ]
      : []),
    grounded
      ? 'Answer FROM THE CONTEXT below and cite it like [1]. If the context does not cover the question, say so plainly instead of filling the gap from memory.'
      : nutrition
        ? 'No PULSE library context matched. Answer only general, uncontroversial nutrition knowledge, keep it short.'
        : "You have NO library available for this question. Answer only general, uncontroversial fitness knowledge, keep it short, and tell the user this answer is not from PULSE's own content.",
    'NEVER diagnose, never interpret symptoms, test results or medication, and never advise on pregnancy, injury or a named medical condition (diabetes, blood pressure, kidney...). For any of those, say it needs a real professional and point them to the coaches in the app.',
    'Do not invent numbers, programme names, or article titles.',
    profileBlock,
    '',
    'CONTEXT:',
    context || '(none)',
  ].join('\n');

  const messages = [
    { role: 'system' as const, content: system },
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: parsed.data.message },
  ];

  const answer = await chatComplete(messages, { temperature: 0.5, maxTokens: 220 });
  await prisma.chatMessage.create({ data: { conversationId: convo.id, role: 'user', content: parsed.data.message } });
  await prisma.chatMessage.create({ data: { conversationId: convo.id, role: 'assistant', content: answer } });

  res.json({ conversationId: convo.id, answer });
});

/**
 * RETIRED: the language-model plan generator.
 *
 * It produced an unexplainable plan from a single prompt, which is the exact thing
 * PULSE tells users it does not do. Both halves are now covered by rule engines that
 * can show their working: workouts by lib/coach.ts via /api/assessment and
 * /api/path, meals by lib/mealplan.ts via /api/meals/plan.
 *
 * It never ran in production (no key was ever set), so nothing is lost. The routes
 * stay as explicit signposts rather than 404s, because an old bundle in someone's
 * service-worker cache will still call them.
 */
aiRouter.post('/plan', (_req, res) =>
  res.status(410).json({ error: 'Replaced by /api/meals/plan (meals) and /api/path/current (training).' }),
);

aiRouter.get('/plans', (_req, res) => res.json([]));

/**
 * Estimate a meal from a photo.
 *
 * The image arrives as a data URL, goes straight to the model, and is never written
 * to disk. Storing photographs of what people eat means backups, retention rules and
 * a data-safety declaration, for no benefit — the estimate is the only part worth
 * keeping, and that lands in CalorieEntry like any other log.
 *
 * Nothing is logged automatically. The model returns candidate items and the user
 * confirms them, because a silent wrong entry is worse than no entry: it corrupts the
 * weekly averages and the outcome check that reads them.
 */
const photoSchema = z.object({
  // ~1.5 MB of base64 ≈ a 1024px JPEG, which is all "low" detail needs. The client
  // downscales before sending; this is the backstop, and express.json caps at 2 MB.
  image: z.string().startsWith('data:image/').max(1_500_000),
  note: z.string().max(200).optional(),
});

aiRouter.post('/meal-photo', async (req: AuthedRequest, res) => {
  if (await blocked(req, res, 'vision')) return;

  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Send a downscaled JPEG data URL.' });
  const lang = pickLang(req);

  const system = [
    'You identify food in a photo and estimate its nutrition. The cuisine is usually Egyptian or Middle Eastern.',
    'Identify each distinct dish. Judge the portion from the plate, bowl or bread next to it.',
    'Give figures for the portion actually visible, not for a standard serving.',
    lang === 'ar'
      ? 'Name each dish in simple Egyptian Arabic in "name", e.g. "طبق كشري وسط", "فول بالزيت", "فرخة مشوية".'
      : 'Name each dish in English in "name".',
    'If the photo is not food, return {"items":[],"notFood":true}.',
    'If you cannot tell what something is, leave it out rather than guessing.',
    'Respond as JSON: {"items":[{"name":string,"portion":string,"calories":number,"protein":number,"carbs":number,"fat":number,"confidence":"high"|"medium"|"low"}],"notFood":boolean}',
  ].join('\n');

  const prompt = parsed.data.note
    ? `What is in this photo? The user adds: ${parsed.data.note}`
    : 'What is in this photo, and roughly what is in it nutritionally?';

  const raw = await visionComplete(system, prompt, parsed.data.image, { json: true });

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return res.status(502).json({ error: 'Could not read that photo — try again with better light.' });
  }

  if (data.notFood || !Array.isArray(data.items) || data.items.length === 0) {
    return res.json({
      items: [],
      message:
        lang === 'ar'
          ? 'مقدرناش نتعرف على أكل في الصورة دي. جرّب صورة أوضح من فوق الطبق.'
          : "We couldn't find food in that photo. Try a clearer shot from above the plate.",
    });
  }

  // Clamp everything. An unreviewed number from a photo goes straight into the food
  // diary that the outcome check reads, so a wild value would quietly skew a verdict.
  const num = (v: any, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n, max)) : 0;
  };

  res.json({
    items: data.items.slice(0, 8).map((i: any) => ({
      name: String(i.name ?? '').slice(0, 80),
      portion: String(i.portion ?? '').slice(0, 60),
      calories: num(i.calories, 3000),
      protein: num(i.protein, 250),
      carbs: num(i.carbs, 400),
      fat: num(i.fat, 250),
      confidence: ['high', 'medium', 'low'].includes(i.confidence) ? i.confidence : 'low',
    })),
    message:
      lang === 'ar'
        ? 'دي تقديرات من الصورة. عدّلها قبل ما تسجّلها لو محتاجة.'
        : 'These are estimates from the photo. Adjust anything before you log it.',
  });
});

/**
 * Estimate a recipe's macros from its ingredient list. Admin only.
 *
 * This is the right shape for a language model on this codebase: a bounded, checkable
 * task with a human approving the result before it is saved. It is not deciding
 * anything for a user — it is filling four number fields that an editor then eyeballs.
 *
 * It matters because macros are what make a recipe usable at all. The meal planner
 * skips any recipe without them, so every dish added from now on is invisible until
 * someone works out its protein by hand. That is the bottleneck this removes.
 */
const macroSchema = z.object({
  title: z.string().min(2),
  ingredients: z.array(z.string()).min(1).max(40),
  servings: z.number().min(1).max(20).default(4),
});

aiRouter.post('/recipe-macros', async (req: AuthedRequest, res) => {
  if (req.role !== 'ADMIN') {
    const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
    if (me?.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
  }
  if (!aiEnabled()) return res.status(503).json({ error: 'AI not configured' });

  const parsed = macroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { title, ingredients, servings } = parsed.data;

  const system = [
    'You are a food-composition analyst. Estimate nutrition from an ingredient list.',
    'Work out the totals for the whole recipe, then DIVIDE BY THE NUMBER OF SERVINGS.',
    'Every number you return is PER SERVING.',
    'Use standard food composition values. Egyptian and Middle Eastern ingredients are expected.',
    'mealSlots: which of breakfast, lunch, dinner, snack this dish realistically belongs to.',
    'Use ["condiment"] for sauces, dips and dressings that are never eaten as a meal.',
    'cuisine: one of egyptian, levantine, international.',
    'Respond as JSON: {"calories":number,"protein":number,"carbs":number,"fat":number,"mealSlots":string[],"cuisine":string,"confidence":"high"|"medium"|"low","note":string}',
    'note: one short sentence naming the single ingredient that dominates the estimate, so an editor knows what to sanity-check.',
  ].join('\n');

  const user = `Recipe: ${title}\nServings: ${servings}\nIngredients:\n${ingredients.map((i) => `- ${i}`).join('\n')}`;

  const raw = await chatComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { json: true, temperature: 0.2 },
  );

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return res.status(502).json({ error: 'Could not read the estimate — try again.' });
  }

  // Clamp rather than trust. A model that returns 9000 kcal for a salad should not be
  // able to write that into the planner's input, and an editor may not catch it.
  const num = (v: any, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n, max) * 10) / 10 : 0;
  };
  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'condiment'];

  res.json({
    calories: Math.round(num(data.calories, 2000)),
    protein: num(data.protein, 200),
    carbs: num(data.carbs, 300),
    fat: num(data.fat, 200),
    mealSlots: Array.isArray(data.mealSlots) ? data.mealSlots.filter((s: string) => SLOTS.includes(s)) : [],
    cuisine: ['egyptian', 'levantine', 'international'].includes(data.cuisine) ? data.cuisine : 'international',
    confidence: ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'low',
    note: typeof data.note === 'string' ? data.note.slice(0, 200) : '',
  });
});

// Natural-language calorie/macro estimator.
aiRouter.post('/calories', async (req: AuthedRequest, res) => {
  if (await blocked(req, res, 'calories')) return;
  const schema = z.object({ text: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const system =
    'You estimate nutrition. Given food described in any language, return JSON: {"items":[{"name":string,"calories":number,"protein":number,"carbs":number,"fat":number}]}. Grams for macros, kcal for calories. Best-effort.';
  const raw = await chatComplete([{ role: 'system', content: system }, { role: 'user', content: parsed.data.text }], { json: true });
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { items: [] };
  }
  res.json(data);
});
