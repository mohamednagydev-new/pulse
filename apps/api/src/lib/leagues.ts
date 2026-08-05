import { prisma } from './prisma';
import { weekKey, startOfDayTz } from './time';
import { awardXp } from './social';

/** Weekly leagues.
 *
 *  Everyone who earns XP sits in a room of up to ROOM_SIZE people in their tier.
 *  The room is ranked by XP earned that week; the top PROMOTE finish up a tier,
 *  the bottom DEMOTE finish down one. Rooms settle lazily — the first request in
 *  a new week settles the previous one — so this needs no cron and self-heals if
 *  the server was off for a week. */

export const TIERS = [
  { key: 'bronze', en: 'Bronze', ar: 'برونزي', icon: '🥉', color: '#B45309' },
  { key: 'silver', en: 'Silver', ar: 'فضي', icon: '🥈', color: '#64748B' },
  { key: 'gold', en: 'Gold', ar: 'ذهبي', icon: '🥇', color: '#D97706' },
  { key: 'diamond', en: 'Diamond', ar: 'ماسي', icon: '💎', color: '#0EA5E9' },
  { key: 'legend', en: 'Legend', ar: 'أسطوري', icon: '👑', color: '#7C3AED' },
];

const ROOM_SIZE = 20;
const PROMOTE = 5; // top five move up
const DEMOTE = 5; // bottom five move down
/** Paid to the top three of every room at settlement. */
const PODIUM_XP = [120, 70, 40];

export const MAX_TIER = TIERS.length - 1;

/** XP earned inside a week, straight from the ledger — no separate counter to drift. */
async function weekXp(userId: string, week: string): Promise<number> {
  const start = startOfDayTz(week);
  const end = new Date(start.getTime() + 7 * 86400000);
  const agg = await prisma.xpEvent.aggregate({
    where: { userId, createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Same as weekXp but for a whole room at once — one query instead of twenty. */
async function weekXpMany(userIds: string[], week: string): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const start = startOfDayTz(week);
  const end = new Date(start.getTime() + 7 * 86400000);
  const rows = await prisma.xpEvent.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
}

/** Put a user into the emptiest non-full room of their tier. */
async function assignRoom(tier: number, week: string): Promise<number> {
  const rooms = await prisma.leagueMember.groupBy({
    by: ['room'],
    where: { weekKey: week, tier },
    _count: true,
  });
  const open = rooms.filter((r) => r._count < ROOM_SIZE).sort((a, b) => b._count - a._count)[0];
  if (open) return open.room;
  return rooms.length ? Math.max(...rooms.map((r) => r.room)) + 1 : 0;
}

/**
 * Settle every unsettled week before the current one, then make sure the user has
 * a row for this week. Returns the current row.
 */
export async function ensureLeagueMembership(userId: string) {
  const week = weekKey();

  const stale = await prisma.leagueMember.findMany({
    where: { userId, settledAt: null, weekKey: { lt: week } },
    orderBy: { weekKey: 'asc' },
  });
  for (const row of stale) await settleRoom(row.weekKey, row.tier, row.room);

  const existing = await prisma.leagueMember.findUnique({ where: { userId_weekKey: { userId, weekKey: week } } });
  if (existing) return existing;

  // Carry the tier forward from the most recent settled week; new users start at Bronze.
  const last = await prisma.leagueMember.findFirst({
    where: { userId, weekKey: { lt: week } },
    orderBy: { weekKey: 'desc' },
  });
  const tier = last ? nextTier(last) : 0;
  const room = await assignRoom(tier, week);

  try {
    return await prisma.leagueMember.create({ data: { userId, weekKey: week, tier, room } });
  } catch {
    // Lost a race against a parallel request — the other one's row is just as good.
    return prisma.leagueMember.findUnique({ where: { userId_weekKey: { userId, weekKey: week } } });
  }
}

/**
 * Users sitting just below this week's promotion line, and how far they are
 * from rank #PROMOTE. Feeds the Friday-evening "one session does it" push —
 * the most actionable notification the app can send, because the gap is real.
 */
export async function promotionCliffhangers(maxGap = 150): Promise<{ userId: string; gap: number }[]> {
  const week = weekKey();
  const rooms = await prisma.leagueMember.groupBy({ by: ['tier', 'room'], where: { weekKey: week } });
  const out: { userId: string; gap: number }[] = [];
  for (const r of rooms) {
    const members = await prisma.leagueMember.findMany({
      where: { weekKey: week, tier: r.tier, room: r.room },
      select: { userId: true },
    });
    if (members.length <= PROMOTE) continue; // everyone promotes anyway
    const xpMap = await weekXpMany(members.map((m) => m.userId), week);
    const ranked = members
      .map((m) => ({ userId: m.userId, xp: xpMap.get(m.userId) ?? 0 }))
      .sort((a, b) => b.xp - a.xp);
    const line = ranked[PROMOTE - 1].xp; // XP of the last promoting seat
    for (let i = PROMOTE; i < Math.min(ranked.length, PROMOTE + 3); i++) {
      const gap = line - ranked[i].xp + 1; // +1: beating the seat, not tying it
      if (gap > 0 && gap <= maxGap && ranked[i].xp > 0) out.push({ userId: ranked[i].userId, gap });
    }
  }
  return out;
}

function nextTier(prev: { tier: number; result: string | null }): number {
  if (prev.result === 'promoted') return Math.min(MAX_TIER, prev.tier + 1);
  if (prev.result === 'demoted') return Math.max(0, prev.tier - 1);
  return prev.tier;
}

/** Rank a finished room, pay the podium and record promote/hold/demote. Idempotent. */
export async function settleRoom(week: string, tier: number, room: number) {
  const members = await prisma.leagueMember.findMany({ where: { weekKey: week, tier, room } });
  const pending = members.filter((m) => !m.settledAt);
  if (pending.length === 0) return;

  const xpMap = await weekXpMany(members.map((m) => m.userId), week);
  const ranked = [...members].sort((a, b) => (xpMap.get(b.userId) ?? 0) - (xpMap.get(a.userId) ?? 0));

  const now = new Date();
  for (let i = 0; i < ranked.length; i++) {
    const m = ranked[i];
    if (m.settledAt) continue;
    const xp = xpMap.get(m.userId) ?? 0;
    const fromBottom = ranked.length - i;

    // A week with no XP drops you a tier — but Bronze is the floor, so nobody is
    // pushed out of the app. A room too small to rank meaningfully just holds.
    let result: string;
    if (xp === 0) result = tier === 0 ? 'held' : 'demoted';
    else if (ranked.length < 5) result = 'held';
    else if (i < PROMOTE && tier < MAX_TIER) result = 'promoted';
    else if (fromBottom <= DEMOTE && tier > 0) result = 'demoted';
    else result = 'held';

    await prisma.leagueMember.update({
      where: { id: m.id },
      data: { xp, rank: i + 1, result, settledAt: now },
    });

    if (xp > 0 && i < PODIUM_XP.length) {
      await awardXp(m.userId, PODIUM_XP[i], 'league_podium').catch(() => {});
      await prisma.notification
        .create({
          data: {
            userId: m.userId,
            type: 'general',
            title: `${TIERS[tier].icon} #${i + 1} in ${TIERS[tier].en} league`,
            body: `+${PODIUM_XP[i]} XP for finishing on the podium.`,
            url: '/leagues',
          },
        })
        .catch(() => {});
    } else if (result === 'promoted') {
      await prisma.notification
        .create({
          data: {
            userId: m.userId,
            type: 'general',
            title: `Promoted to ${TIERS[Math.min(MAX_TIER, tier + 1)].en} ${TIERS[Math.min(MAX_TIER, tier + 1)].icon}`,
            body: 'You finished in the top five. New league, new competition.',
            url: '/leagues',
          },
        })
        .catch(() => {});
    }
  }
}

/** The user's current room, live-ranked. */
export async function currentStandings(userId: string) {
  const me = await ensureLeagueMembership(userId);
  if (!me) return null;

  const members = await prisma.leagueMember.findMany({
    where: { weekKey: me.weekKey, tier: me.tier, room: me.room },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true, currentStreak: true } } },
  });
  const xpMap = await weekXpMany(members.map((m) => m.userId), me.weekKey);

  const ranked = members
    .map((m) => ({
      id: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      avatarUrl: m.user.avatarUrl,
      level: m.user.level,
      currentStreak: m.user.currentStreak,
      xp: xpMap.get(m.userId) ?? 0,
      isMe: m.userId === userId,
    }))
    .sort((a, b) => b.xp - a.xp)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  // Milliseconds to the next Saturday 00:00 — drives the countdown in the UI.
  const endsAt = startOfDayTz(me.weekKey).getTime() + 7 * 86400000;

  return {
    weekKey: me.weekKey,
    endsAt,
    tier: me.tier,
    tierInfo: TIERS[me.tier],
    tiers: TIERS,
    room: me.room,
    promoteCount: ranked.length >= 5 && me.tier < MAX_TIER ? PROMOTE : 0,
    demoteCount: ranked.length >= 5 && me.tier > 0 ? DEMOTE : 0,
    myRank: ranked.find((r) => r.isMe)?.rank ?? null,
    myXp: ranked.find((r) => r.isMe)?.xp ?? 0,
    members: ranked,
  };
}

/** Last few settled weeks — the "how did I do" history strip. */
export async function leagueHistory(userId: string, take = 8) {
  const rows = await prisma.leagueMember.findMany({
    where: { userId, settledAt: { not: null } },
    orderBy: { weekKey: 'desc' },
    take,
  });
  return rows.map((r) => ({
    weekKey: r.weekKey,
    tier: r.tier,
    tierInfo: TIERS[r.tier],
    xp: r.xp,
    rank: r.rank,
    result: r.result,
  }));
}

export { weekXp };

/** Settle every room left over from a previous week.
 *  Runs from the daily scheduler so rooms whose members never come back still
 *  close out (and their podium XP still lands). */
export async function settleStaleRooms() {
  const week = weekKey();
  const rooms = await prisma.leagueMember.groupBy({
    by: ['weekKey', 'tier', 'room'],
    where: { settledAt: null, weekKey: { lt: week } },
  });
  for (const r of rooms) {
    await settleRoom(r.weekKey, r.tier, r.room).catch((e) =>
      console.warn(`[leagues] settle ${r.weekKey}/${r.tier}/${r.room} failed:`, (e as Error).message),
    );
  }
  if (rooms.length) console.log(`[leagues] settled ${rooms.length} room(s)`);
}
