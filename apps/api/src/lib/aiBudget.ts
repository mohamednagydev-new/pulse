import { prisma } from './prisma';
import { dayString } from './time';

/**
 * Daily allowance for billable AI calls, per user.
 *
 * The IP rate limit in index.ts stops a scraper; it does not stop a cost. PULSE is
 * free and has no subscription revenue behind it, so the only responsible way to run
 * a language model here is with a hard per-user ceiling that fails closed.
 *
 * The limits below are set from what a real user needs in a day, not from what the
 * budget could absorb — someone logging four meals and asking two questions is well
 * inside them, and anything past that is either a stuck loop or abuse.
 *
 * Every number here is deliberately generous enough that no honest user will ever
 * see the cap, and small enough that the worst-case monthly bill is bounded and
 * knowable: LIMITS × active users × price per call.
 */

export type AiKind = 'chat' | 'calories' | 'search' | 'vision' | 'summary';

const LIMITS: Record<AiKind, number> = {
  chat: 15, // a real conversation is 5-10 turns; answers are capped short anyway
  calories: 15, // five meals, with retries
  search: 30, // cheap, but still a call
  vision: 8, // the most expensive per call
  summary: 3, // generated weekly; 3 covers manual refreshes
};

/** Admins are exempt — they are testing the thing, and there are very few of them. */
const EXEMPT_ROLES = new Set(['ADMIN']);

export type BudgetResult = { ok: true; used: number; limit: number } | { ok: false; used: number; limit: number };

/**
 * Count one call and say whether it may proceed. Call this BEFORE hitting OpenAI:
 * counting after the fact means a burst of parallel requests all pass the check and
 * only then increment, which is exactly how a cap gets bypassed.
 */
export async function consumeAi(userId: string, kind: AiKind, role?: string): Promise<BudgetResult> {
  const limit = LIMITS[kind];
  if (role && EXEMPT_ROLES.has(role)) return { ok: true, used: 0, limit };

  const date = dayString();

  // upsert-then-read is atomic per row in SQLite, so concurrent calls cannot both
  // read the same pre-increment value.
  const row = await prisma.aiUsage.upsert({
    where: { userId_date_kind: { userId, date, kind } },
    create: { userId, date, kind, count: 1 },
    update: { count: { increment: 1 } },
  });

  return row.count > limit
    ? { ok: false, used: row.count, limit }
    : { ok: true, used: row.count, limit };
}

/** What is left today, for showing a user why a button is disabled. */
export async function remainingAi(userId: string): Promise<Record<AiKind, number>> {
  const rows = await prisma.aiUsage.findMany({ where: { userId, date: dayString() } });
  const used = new Map(rows.map((r) => [r.kind, r.count]));
  return Object.fromEntries(
    (Object.keys(LIMITS) as AiKind[]).map((k) => [k, Math.max(0, LIMITS[k] - (used.get(k) ?? 0))]),
  ) as Record<AiKind, number>;
}

/** Bilingual refusal. A user who hits the cap should be told it resets, not just
 *  handed a 429 with no explanation. */
export const OVER_BUDGET = {
  en: "You've used today's AI allowance. It resets at midnight — everything else in the app keeps working.",
  ar: 'استهلكت رصيد الذكاء الاصطناعي بتاع النهارده. بيتجدد بعد نص الليل — وكل باقي التطبيق شغال عادي.',
};
