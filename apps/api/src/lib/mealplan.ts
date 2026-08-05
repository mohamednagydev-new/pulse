import type { Bilingual } from './coach';
import type { Targets } from './nutrition';

/**
 * Rule-based daily meal plan.
 *
 * Built the same way as the training engine, and for the same reason: a plan you
 * cannot audit is a plan you cannot defend. Every choice here is traceable to a
 * number — the slot's calorie share, the protein gap, the cuisine bias — which is
 * what lets us show the user *why* they got this plate. An LLM cannot do that, and
 * on a health surface "because the model said so" is not an answer.
 *
 * It is also deterministic per (user, day): open the app twice and you see the same
 * plan, but tomorrow is different. That comes from seeding the shuffle with the user
 * id and the date rather than storing a row per day.
 */

export type PlanRecipe = {
  id: string;
  title: string;
  titleAr: string | null;
  coverImage: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  mealSlots: string | null; // JSON array
  cuisine: string | null;
  tags: string | null; // JSON array
  prepTimeMin: number | null;
};

export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PlannedMeal = {
  slot: Slot;
  /** How many portions of the dish — 1 or 2, because nobody eats 1.37 servings. */
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe: PlanRecipe;
  /** Why this dish landed in this slot. */
  reason: Bilingual;
};

export type MealPlan = {
  date: string;
  targets: Targets;
  meals: PlannedMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  /** How close we got, as a percentage of the target. */
  fit: { calories: number; protein: number };
  notes: Bilingual[];
};

/** Share of the day's calories per slot. Breakfast is deliberately not the biggest
 *  meal — in Egypt lunch is, and a plan that fights how people already eat gets
 *  abandoned in week one. */
const SLOT_SHARE: Record<Slot, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.28,
  snack: 0.12,
};

const SLOT_ORDER: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SLOT_LABEL: Record<Slot, Bilingual> = {
  breakfast: { en: 'Breakfast', ar: 'الفطار' },
  lunch: { en: 'Lunch', ar: 'الغدا' },
  dinner: { en: 'Dinner', ar: 'العشا' },
  snack: { en: 'Snack', ar: 'سناك' },
};

export function slotLabel(slot: Slot): Bilingual {
  return SLOT_LABEL[slot];
}

/* ------------------------------------------------------------------ *
 * Deterministic shuffle — same user + same day = same plan.
 * ------------------------------------------------------------------ */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and good enough to stop the same dish appearing daily. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Scoring.
 * ------------------------------------------------------------------ */

/** Dishes with no macro data can't be planned against — we'd be guessing, and a
 *  guessed protein number is worse than no plan at all. */
function usable(r: PlanRecipe): boolean {
  return (r.calories ?? 0) > 0 && r.protein !== null && r.protein !== undefined;
}

function fitsSlot(r: PlanRecipe, slot: Slot): boolean {
  const slots = parseList(r.mealSlots);
  return slots.length === 0 ? slot !== 'breakfast' : slots.includes(slot);
}

export type DietPref = {
  /** vegetarian | vegan — filters on the recipe's own tags. */
  diet?: string | null;
  /** Tags to avoid entirely, e.g. ['dairy'] for someone who says dairy hurts. */
  avoid?: string[];
};

function allowed(r: PlanRecipe, pref: DietPref): boolean {
  const tags = parseList(r.tags).map((t) => t.toLowerCase());
  if (pref.diet === 'vegan' && !tags.includes('vegan')) return false;
  if (pref.diet === 'vegetarian' && !tags.includes('vegan') && !tags.includes('vegetarian')) return false;
  for (const bad of pref.avoid ?? []) if (tags.includes(bad.toLowerCase())) return false;
  return true;
}

/**
 * Lower is better. Four things matter, in this order:
 *  1. hitting the slot's calorie share — the plan has to add up
 *  2. carrying its share of the day's protein — the thing most plans miss
 *  3. being food people here actually cook
 *  4. not being the same thing as yesterday
 *
 * The jitter term is not decoration. Without it the arithmetic has exactly one
 * winner per slot, so the planner serves the identical breakfast every morning
 * until the user deletes the app. It is weighted high enough to swap between
 * near-equal dishes and low enough that it can never promote a bad fit.
 */
function score(
  r: PlanRecipe,
  servings: number,
  slotKcal: number,
  slotProtein: number,
  jitter: number,
): number {
  const kcal = (r.calories ?? 0) * servings;
  const protein = (r.protein ?? 0) * servings;

  // Relative miss, so a 100 kcal error matters more on a snack than on lunch.
  const kcalMiss = Math.abs(kcal - slotKcal) / Math.max(slotKcal, 1);
  // Under-shooting protein is the real failure, so it carries most of the weight.
  // Overshoot gets a light touch — extra protein is harmless, but chasing it is how
  // every slot ends up as another chicken breast.
  const under = Math.max(0, slotProtein - protein) / Math.max(slotProtein, 1);
  const over = Math.max(0, protein - slotProtein * 1.5) / Math.max(slotProtein, 1);

  const egyptian = r.cuisine === 'egyptian' ? -0.12 : 0;

  return kcalMiss * 1.0 + under * 0.8 + over * 0.25 + egyptian + jitter * 0.35;
}

/* ------------------------------------------------------------------ *
 * The planner.
 * ------------------------------------------------------------------ */

export function buildMealPlan(
  date: string,
  userId: string,
  targets: Targets,
  library: PlanRecipe[],
  pref: DietPref = {},
): MealPlan {
  const pool = library.filter((r) => usable(r) && allowed(r, pref));

  const used = new Set<string>();
  const meals: PlannedMeal[] = [];

  for (const slot of SLOT_ORDER) {
    const slotKcal = Math.round(targets.calories * SLOT_SHARE[slot]);
    const slotProtein = Math.round(targets.protein * SLOT_SHARE[slot]);

    let candidates = pool.filter((r) => fitsSlot(r, slot) && !used.has(r.id));
    // Rather than fail a slot, widen it — an off-slot dish beats an empty plate.
    if (candidates.length === 0) candidates = pool.filter((r) => !used.has(r.id));
    if (candidates.length === 0) continue;

    // Each recipe's jitter has to come from the recipe itself, not from its position
    // in the list. Drawing from a shared stream in list order gives every dish the
    // same draw every day, which silently defeats the whole point of the jitter.
    const meals_seed = `${userId}:${date}:${slot}`;

    let best: { r: PlanRecipe; servings: number; s: number } | null = null;
    for (const r of candidates) {
      const jitter = rng(hash(`${meals_seed}:${r.id}`))();
      for (const servings of [1, 2]) {
        const s = score(r, servings, slotKcal, slotProtein, jitter);
        if (!best || s < best.s) best = { r, servings, s };
      }
    }
    if (!best) continue;

    used.add(best.r.id);
    const { r, servings } = best;
    meals.push({
      slot,
      servings,
      calories: Math.round((r.calories ?? 0) * servings),
      protein: Math.round((r.protein ?? 0) * servings),
      carbs: Math.round((r.carbs ?? 0) * servings),
      fat: Math.round((r.fat ?? 0) * servings),
      recipe: r,
      reason: reasonFor(slot, r, servings, slotKcal),
    });
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    date,
    targets,
    meals,
    totals,
    fit: {
      calories: Math.round((totals.calories / Math.max(targets.calories, 1)) * 100),
      protein: Math.round((totals.protein / Math.max(targets.protein, 1)) * 100),
    },
    notes: notesFor(targets, totals),
  };
}

/** One honest line per plate. Never "optimised for your goals" — say the number. */
function reasonFor(slot: Slot, r: PlanRecipe, servings: number, slotKcal: number): Bilingual {
  const kcal = Math.round((r.calories ?? 0) * servings);
  const protein = Math.round((r.protein ?? 0) * servings);
  const label = SLOT_LABEL[slot];

  if (protein >= 25) {
    return {
      en: `${protein}g of protein — this is where most of your ${label.en.toLowerCase()} protein comes from.`,
      ar: `${protein} جرام بروتين — ده مصدر البروتين الأساسي في ${label.ar}.`,
    };
  }
  if (kcal <= slotKcal * 0.85) {
    return {
      en: `Light on purpose — ${kcal} kcal, leaving room for the rest of the day.`,
      ar: `خفيف بقصد — ${kcal} سعرة، وسايبين مساحة لباقي اليوم.`,
    };
  }
  return {
    en: `${kcal} kcal — about the share ${label.en.toLowerCase()} should carry.`,
    ar: `${kcal} سعرة — تقريباً نصيب ${label.ar} من يومك.`,
  };
}

/** Whole-day notes. These are the "why" for the plan as a plan, not per dish. */
function notesFor(t: Targets, totals: MealPlan['totals']): Bilingual[] {
  const notes: Bilingual[] = [t.note];

  const proteinPct = (totals.protein / Math.max(t.protein, 1)) * 100;
  if (proteinPct < 85) {
    notes.push({
      en: `This day lands about ${Math.round(t.protein - totals.protein)}g short on protein. Add eggs, yoghurt or a tin of tuna and you're there.`,
      ar: `اليوم ده ناقص حوالي ${Math.round(t.protein - totals.protein)} جرام بروتين. زوّد بيض أو زبادي أو علبة تونة وتبقى ظبطتها.`,
    });
  }

  const kcalPct = (totals.calories / Math.max(t.calories, 1)) * 100;
  if (kcalPct > 110) {
    notes.push({
      en: 'A little over target — drop one portion at dinner rather than skipping a meal.',
      ar: 'زيادة شوية عن الهدف — قلل طبق في العشا بدل ما تلغي وجبة.',
    });
  } else if (kcalPct < 88) {
    notes.push({
      en: "Under target. Eating too little is how people stall — don't leave this gap open every day.",
      ar: 'أقل من الهدف. الأكل القليل هو اللي بيوقّف التقدم — متسيبش الفرق ده كل يوم.',
    });
  }

  notes.push({
    en: 'These are portions, not prescriptions. Swap any dish for one you like at the same calories.',
    ar: 'دي أحجام مقترحة مش أوامر. غيّر أي طبق بواحد تحبه بنفس السعرات.',
  });

  return notes;
}

/** Alternatives for one slot, so "swap this meal" doesn't have to rebuild the day. */
export function swapsFor(
  slot: Slot,
  targets: Targets,
  library: PlanRecipe[],
  excludeId: string,
  pref: DietPref = {},
  limit = 6,
): PlanRecipe[] {
  const slotKcal = targets.calories * SLOT_SHARE[slot];
  const slotProtein = targets.protein * SLOT_SHARE[slot];
  return library
    .filter((r) => usable(r) && allowed(r, pref) && fitsSlot(r, slot) && r.id !== excludeId)
    .map((r) => ({ r, s: score(r, 1, slotKcal, slotProtein, 0) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.r);
}
