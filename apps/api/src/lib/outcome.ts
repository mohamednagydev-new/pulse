import { prisma } from './prisma';
import { daysAgoStr, startOfDayTz } from './time';
import type { Bilingual } from './coach';

/**
 * Did the plan actually work?
 *
 * Adherence answers "did they show up". This answers "did showing up do anything",
 * which is the question that decides whether the plan should change. Someone
 * training four days a week for a month with no movement on their goal does not
 * need more discipline — they need a different plan.
 *
 * Each goal is judged on the measure that suits it, and "not enough data" is a
 * first-class answer rather than a silent zero. Telling someone they made no
 * progress when they simply never logged a weight would be worse than saying nothing.
 */

export type Verdict = 'working' | 'flat' | 'too_fast' | 'no_data';

export type Outcome = {
  verdict: Verdict;
  metric: 'weight' | 'strength' | 'consistency';
  /** Signed change over the window, in kg for weight, in % for strength. */
  change: number | null;
  windowDays: number;
  message: Bilingual;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Earliest and latest weight inside the window, so we compare like with like. */
async function weightChange(userId: string, sinceDate: string) {
  const logs = await prisma.weightLog.findMany({
    where: { userId, date: { gte: sinceDate } },
    orderBy: { date: 'asc' },
    select: { date: true, weightKg: true },
  });
  if (logs.length < 2) return null;
  return round1(logs[logs.length - 1].weightKg - logs[0].weightKg);
}

/**
 * Best set (weight x reps as a rough 1RM proxy) early in the window versus late.
 * Compared per exercise, then averaged, so adding a new lift doesn't read as a
 * strength jump and dropping one doesn't read as a loss.
 */
async function strengthChange(userId: string, since: Date) {
  const logs = await prisma.liftLog.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
    select: { exercise: true, weightKg: true, reps: true, createdAt: true },
  });
  if (logs.length < 4) return null;

  const mid = since.getTime() + (Date.now() - since.getTime()) / 2;
  const est = (w: number, r: number) => w * (1 + Math.min(r, 12) / 30);

  const early = new Map<string, number>();
  const late = new Map<string, number>();
  for (const l of logs) {
    const bucket = l.createdAt.getTime() < mid ? early : late;
    const v = est(l.weightKg, l.reps);
    bucket.set(l.exercise, Math.max(bucket.get(l.exercise) ?? 0, v));
  }

  const shared = [...early.keys()].filter((k) => late.has(k));
  if (shared.length === 0) return null;

  const deltas = shared.map((k) => ((late.get(k)! - early.get(k)!) / early.get(k)!) * 100);
  return round1(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

export async function measureOutcome(
  userId: string,
  goal: string,
  planStarted: Date,
  sessionsDone: number,
): Promise<Outcome> {
  // At least four weeks, however new the plan is. Body weight and strength move
  // too slowly to say anything honest about seven days, and someone who has been
  // logging since before this plan started should still get an answer rather than
  // "no data" — their history did not stop existing when the plan began.
  const planAge = Math.floor((Date.now() - planStarted.getTime()) / 86400000);
  const windowDays = Math.max(28, Math.min(90, planAge));
  const sinceDate = daysAgoStr(windowDays);
  const since = startOfDayTz(sinceDate);

  if (goal === 'lose_weight') {
    const change = await weightChange(userId, sinceDate);
    if (change === null) {
      return {
        verdict: 'no_data', metric: 'weight', change: null, windowDays,
        message: {
          en: 'Log your weight twice and we can tell you whether this plan is working.',
          ar: 'سجّل وزنك مرتين ونقدر نقولك الخطة دي شغالة ولا لأ.',
        },
      };
    }
    // Faster than roughly 1% of body weight a week is usually muscle going too.
    if (change <= -4 && windowDays <= 28) {
      return {
        verdict: 'too_fast', metric: 'weight', change, windowDays,
        message: {
          en: `Down ${Math.abs(change)} kg in ${windowDays} days — that's fast. Eat a little more so you keep the muscle.`,
          ar: `نزلت ${Math.abs(change)} كجم في ${windowDays} يوم — ده سريع. كُل شوية أكتر عشان تحافظ على عضلاتك.`,
        },
      };
    }
    if (change < -0.5) {
      return {
        verdict: 'working', metric: 'weight', change, windowDays,
        message: {
          en: `Down ${Math.abs(change)} kg over ${windowDays} days. The plan is working — keep going.`,
          ar: `نزلت ${Math.abs(change)} كجم في ${windowDays} يوم. الخطة شغالة — كمّل.`,
        },
      };
    }
    return {
      verdict: 'flat', metric: 'weight', change, windowDays,
      message: {
        en: `Weight has held steady for ${windowDays} days. Training is only half of it — the kitchen is the other half.`,
        ar: `وزنك ثابت من ${windowDays} يوم. التمرين نص الحكاية — والنص التاني في المطبخ.`,
      },
    };
  }

  if (goal === 'build_muscle' || goal === 'get_strong') {
    const change = await strengthChange(userId, since);
    if (change === null) {
      return {
        verdict: 'no_data', metric: 'strength', change: null, windowDays,
        message: {
          en: 'Log your sets for a few sessions and we can show you whether your lifts are climbing.',
          ar: 'سجّل مجموعاتك كام تمرينة ونوريك أوزانك بتزيد ولا لأ.',
        },
      };
    }
    if (change >= 3) {
      return {
        verdict: 'working', metric: 'strength', change, windowDays,
        message: {
          en: `Your lifts are up about ${change}% over ${windowDays} days. That's real progress.`,
          ar: `أوزانك زادت حوالي ${change}% في ${windowDays} يوم. ده تقدم حقيقي.`,
        },
      };
    }
    return {
      verdict: 'flat', metric: 'strength', change, windowDays,
      message: {
        en: `Your lifts have been flat for ${windowDays} days. Usually that means adding weight, sleeping more, or eating more.`,
        ar: `أوزانك ثابتة من ${windowDays} يوم. غالباً يعني تزوّد وزن، أو تنام أكتر، أو تاكل أكتر.`,
      },
    };
  }

  // stay_fit / more_energy: the outcome is simply that they keep moving.
  if (sessionsDone === 0) {
    return {
      verdict: 'no_data', metric: 'consistency', change: null, windowDays,
      message: {
        en: 'Finish a few sessions and we can show you the pattern.',
        ar: 'خلّص كام تمرينة ونوريك الصورة.',
      },
    };
  }
  return {
    verdict: sessionsDone >= windowDays / 4 ? 'working' : 'flat',
    metric: 'consistency',
    change: sessionsDone,
    windowDays,
    message:
      sessionsDone >= windowDays / 4
        ? { en: `${sessionsDone} sessions in ${windowDays} days. That is the habit forming.`, ar: `${sessionsDone} تمرينة في ${windowDays} يوم. العادة بتتكوّن كده.` }
        : { en: `${sessionsDone} sessions in ${windowDays} days. Little and often beats big and rare.`, ar: `${sessionsDone} تمرينة في ${windowDays} يوم. القليل المستمر أحسن من الكتير المتقطع.` },
  };
}
