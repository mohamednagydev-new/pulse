import { prisma } from './prisma';
import { emitFeed, emitToUser } from './realtime';
import { notifyUser } from '../routes/push';

export const XP_PER_LESSON = 50;
export const XP_PER_BADGE = 100;
export const XP_PER_STREAK_DAY = 20;

export function levelForXp(xp: number): number {
  return 1 + Math.floor(xp / 500);
}

/** True if an accepted Connection exists between the two users in EITHER direction. */
export async function areConnected(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const conn = await prisma.connection.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(conn);
}

export function xpProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = (level - 1) * 500;
  return { level, inLevel: xp - floor, toNext: 500, pct: Math.round(((xp - floor) / 500) * 100) };
}

/** Create a feed post and broadcast it to followers in real time. */
export async function createFeedPost(
  userId: string,
  kind: string,
  text?: string,
  refType?: string,
  refId?: string,
  media?: { mediaType?: string; mediaUrl?: string },
) {
  const post = await prisma.feedPost.create({
    data: { userId, kind, text, refType, refId, mediaType: media?.mediaType, mediaUrl: media?.mediaUrl },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } } },
  });
  await emitFeed(userId, 'feed:new', post);
  return post;
}

/** Award XP; records a ledger event and, on level-up, posts to the feed.
 *  Uses an atomic increment so concurrent awards never lose XP. */
export async function awardXp(userId: string, amount: number, reason?: string) {
  const user = await prisma.user
    .update({ where: { id: userId }, data: { xp: { increment: amount } } })
    .catch(() => null);
  if (!user) return;
  const newXp = user.xp; // post-increment value
  const prevLevel = levelForXp(newXp - amount);
  const newLevel = levelForXp(newXp);
  if (newLevel !== user.level) {
    await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
  }
  await prisma.xpEvent.create({ data: { userId, amount, reason } });
  if (newLevel > prevLevel) {
    emitToUser(userId, 'levelup', { level: newLevel });
    await createFeedPost(userId, 'levelup', `Reached level ${newLevel}! 🎉`);
    notifyUser(userId, { title: 'Level up! 🎉', titleAr: 'مستوى جديد! 🎉', body: `You reached level ${newLevel}`, bodyAr: `وصلت للمستوى ${newLevel}`, url: '/profile' });
  }
}

/** Advance a user's joined challenges after activity. `trigger` scopes which goal types advance. */
export async function bumpChallenges(userId: string, trigger: 'workout' | 'calorie' = 'workout') {
  const [parts, user] = await Promise.all([
    prisma.challengeParticipant.findMany({ where: { userId }, include: { challenge: true } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const { dayString, startOfDayTz } = await import('./time');
  const since = (day: string) => startOfDayTz(day);

  for (const p of parts) {
    // Only challenges whose window is open today can move — activity before the
    // start or after the end must not count toward the goal.
    const today = dayString();
    if (p.challenge.startsOn > today || p.challenge.endsOn < today) continue;

    let progress = p.progress;
    const goal = p.challenge.goalType;

    if (goal === 'lessons' && trigger === 'workout') progress = p.progress + 1;
    else if (goal === 'streak') progress = user?.currentStreak ?? p.progress;
    else if (goal === 'calories') {
      const sum = await prisma.calorieEntry.aggregate({ where: { userId, date: dayString() }, _sum: { calories: true } });
      progress = sum._sum.calories ?? p.progress;
    } else if (goal === 'water') {
      // Total glasses logged since the challenge opened.
      const sum = await prisma.waterLog.aggregate({
        where: { userId, date: { gte: p.challenge.startsOn } },
        _sum: { glasses: true },
      });
      progress = sum._sum.glasses ?? p.progress;
    } else if (goal === 'lifts') {
      progress = await prisma.liftLog.count({
        where: { userId, createdAt: { gte: since(p.challenge.startsOn) } },
      });
    } else if (goal === 'reels') {
      progress = await prisma.reelWatch.count({
        where: { userId, createdAt: { gte: since(p.challenge.startsOn) } },
      });
    } else if (goal === 'xp') {
      const sum = await prisma.xpEvent.aggregate({
        where: { userId, createdAt: { gte: since(p.challenge.startsOn) } },
        _sum: { amount: true },
      });
      progress = sum._sum.amount ?? p.progress;
    }

    if (progress === p.progress) continue;

    // completedAt is the reward gate: it is set exactly once, so re-running this
    // after the goal is met can never pay a second time.
    const justFinished = progress >= p.challenge.goalValue && !p.completedAt;
    await prisma.challengeParticipant.update({
      where: { id: p.id },
      data: { progress, ...(justFinished ? { completedAt: new Date() } : {}) },
    });
    if (!justFinished) continue;

    await createFeedPost(userId, 'challenge', `Completed the "${p.challenge.title}" challenge! 🏆`, 'challenge', p.challengeId);
    if (p.challenge.rewardXp > 0) await awardXp(userId, p.challenge.rewardXp, 'challenge_complete').catch(() => {});
    if (p.challenge.seasonKey) {
      const { awardSeasonBadge } = await import('./seasons');
      await awardSeasonBadge(userId, p.challenge.seasonKey).catch(() => {});
    }
  }
}
