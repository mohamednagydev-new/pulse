import type { Bilingual } from './coach';

/**
 * Daily calorie and macro targets.
 *
 * Until now these were only ever set by the 4-step /setup wizard, which is reached
 * from email sign-up alone — so everyone who signed in with Google ended up with an
 * empty Tracker and nothing to measure their eating against. The coaching intake
 * already knows the goal, the activity level and how often they train, so it is the
 * right place to work these out.
 *
 * Mifflin-St Jeor is used when we have height, weight, age and sex, because it is
 * the equation most dietetic bodies default to for healthy adults. Without those we
 * fall back to flat per-goal figures rather than inventing a number that looks
 * personalised but isn't.
 *
 * These are starting points, not prescriptions. The four-week outcome check is what
 * actually corrects them, because real intake and real weight change beat any formula.
 */

export type BodyStats = {
  heightCm?: number | null;
  weightKg?: number | null;
  birthYear?: number | null;
  gender?: string | null;
};

export type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 'estimated' = from their measurements, 'default' = goal-based fallback. */
  basis: 'estimated' | 'default';
  note: Bilingual;
};

/** Multipliers for daily movement outside training. Deliberately conservative — over-
 *  estimating activity is the most common way these numbers end up too high. */
const ACTIVITY: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.5,
  active: 1.65,
};

/** Calorie shift for the goal, as a fraction of maintenance. */
const GOAL_SHIFT: Record<string, number> = {
  lose_weight: -0.18,
  build_muscle: 0.1,
  get_strong: 0.08,
  stay_fit: 0,
  more_energy: 0,
};

/** Protein grams per kg of body weight. Higher when losing, to protect muscle. */
const PROTEIN_PER_KG: Record<string, number> = {
  lose_weight: 2.0,
  build_muscle: 1.8,
  get_strong: 1.8,
  stay_fit: 1.4,
  more_energy: 1.4,
};

/** Used when we have no measurements at all — same spirit as the old wizard. */
const FALLBACK: Record<string, Omit<Targets, 'basis' | 'note'>> = {
  lose_weight: { calories: 1900, protein: 150, carbs: 170, fat: 55 },
  build_muscle: { calories: 2600, protein: 180, carbs: 280, fat: 75 },
  get_strong: { calories: 2500, protein: 175, carbs: 265, fat: 75 },
  stay_fit: { calories: 2200, protein: 140, carbs: 240, fat: 70 },
  more_energy: { calories: 2200, protein: 140, carbs: 240, fat: 70 },
};

const round5 = (n: number) => Math.round(n / 5) * 5;

export function computeTargets(
  goal: string,
  activityLevel: string,
  daysPerWeek: number,
  body: BodyStats,
): Targets {
  const height = Number(body.heightCm) || 0;
  const weight = Number(body.weightKg) || 0;
  const age = body.birthYear ? new Date().getFullYear() - Number(body.birthYear) : 0;
  const known = height > 100 && weight > 30 && age > 12 && age < 100;

  if (!known) {
    const f = FALLBACK[goal] ?? FALLBACK.stay_fit;
    return {
      ...f,
      basis: 'default',
      note: {
        en: 'A starting point for your goal. Add your height and weight and we can tailor it to you.',
        ar: 'رقم مبدئي على أساس هدفك. ضيف طولك ووزنك ونظبطه عليك انت.',
      },
    };
  }

  // Mifflin-St Jeor. The female constant is used when sex is unknown, so we never
  // overshoot someone's needs by guessing male.
  const male = String(body.gender).toLowerCase() === 'male';
  const bmr = 10 * weight + 6.25 * height - 5 * age + (male ? 5 : -161);

  // Training adds on top of daily movement — roughly 60 kcal per session, spread
  // across the week rather than spiking on training days.
  const activity = ACTIVITY[activityLevel] ?? 1.375;
  const trainingBump = (Math.min(daysPerWeek, 6) * 250) / 7;
  const maintenance = bmr * activity + trainingBump;

  const shift = GOAL_SHIFT[goal] ?? 0;
  // Never prescribe below a floor — an aggressive deficit is how people lose muscle
  // and quit in week three.
  const floor = male ? 1500 : 1200;
  const calories = Math.max(floor, round5(maintenance * (1 + shift)));

  const protein = Math.round(weight * (PROTEIN_PER_KG[goal] ?? 1.4));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    basis: 'estimated',
    note: {
      en: `Worked out from your height, weight, age and how often you train. Adjust anytime in Tracker.`,
      ar: 'محسوبة من طولك ووزنك وسنك وعدد أيام تمرينك. تقدر تعدّلها من التراكر في أي وقت.',
    },
  };
}
