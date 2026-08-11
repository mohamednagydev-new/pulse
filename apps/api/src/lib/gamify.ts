import { prisma } from './prisma';
import { awardXp, createFeedPost, XP_PER_BADGE, XP_PER_STREAK_DAY } from './social';
import { dayString, daysAgoStr } from './time';

// App-timezone day math (UTC day boundaries let users double-dip streaks at Cairo midnight).
const daysAgo = (n: number) => daysAgoStr(n);
const today = () => dayString();
const yesterday = () => daysAgoStr(1);

const MAX_FREEZES = 3;

/** Called on any activity (lesson complete, food logged). Updates streak (with freeze mercy) + badges. */
export async function touchStreak(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const t = today();
  if (user.lastActiveOn === t) {
    await checkBadges(userId, user.currentStreak, user.level);
    return;
  }

  let current: number;
  let freezes = user.streakFreezes;
  let usedFreeze = false;
  if (user.lastActiveOn === yesterday()) {
    current = user.currentStreak + 1;
  } else if (user.lastActiveOn === daysAgo(2) && freezes > 0 && user.currentStreak > 0) {
    // Missed exactly one day — a freeze saves the streak instead of resetting it.
    current = user.currentStreak + 1;
    freezes -= 1;
    usedFreeze = true;
  } else {
    current = 1;
  }
  // Earn a freeze at every 7-day milestone (capped).
  if (current >= 7 && current % 7 === 0 && freezes < MAX_FREEZES) freezes += 1;

  const longest = Math.max(current, user.longestStreak);
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveOn: t, currentStreak: current, longestStreak: longest, streakFreezes: freezes },
  });
  if (usedFreeze) {
    // notifyUser, not a bare row: this deserves the push banner + live bell too.
    const { notifyUser } = await import('../routes/push');
    await notifyUser(userId, {
      type: 'reminder',
      title: 'Streak freeze used 🧊',
      titleAr: 'الفريز أنقذ سلسلتك 🧊',
      body: `Your ${current}-day streak survived a missed day. ${freezes} freeze${freezes === 1 ? '' : 's'} left.`,
      bodyAr: `سلسلتك بتاعة ${current} يوم عدّت من اليوم اللي فاتك. فاضلك ${freezes} فريز.`,
      url: '/progress',
    }).catch(() => {});
  }
  await awardXp(userId, XP_PER_STREAK_DAY);
  await checkBadges(userId, current, user.level);
}

export async function checkBadges(userId: string, streak: number, level = 1) {
  const [completions, lifts, buddies, reels, foods, challenges, referrals,
         challengesWon, water, duelWins, spins, league] = await Promise.all([
    prisma.lessonCompletion.count({ where: { userId } }),
    prisma.liftLog.count({ where: { userId } }),
    prisma.connection.count({ where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    prisma.feedPost.count({ where: { userId, kind: 'reel' } }),
    prisma.calorieEntry.count({ where: { userId } }),
    prisma.challengeParticipant.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.challengeParticipant.count({ where: { userId, completedAt: { not: null } } }),
    prisma.waterLog.count({ where: { userId, glasses: { gte: 8 } } }),
    prisma.buddyChallenge.count({ where: { winnerId: userId, status: 'finished' } }),
    prisma.spinClaim.count({ where: { userId } }),
    prisma.leagueMember.findFirst({ where: { userId }, orderBy: { tier: 'desc' }, select: { tier: true } }),
  ]);

  // Secret badges: the ones nobody is told about until they land.
  const [dawnSessions, lateSessions] = await Promise.all([
    countByHour(userId, 4, 7),
    countByHour(userId, 22, 24),
  ]);

  const codes: string[] = [];
  if (completions >= 1) codes.push('first_workout');
  if (completions >= 10) codes.push('ten_workouts');
  if (completions >= 50) codes.push('fifty_workouts');
  if (completions >= 100) codes.push('hundred_workouts');
  if (streak >= 7) codes.push('week_streak');
  if (streak >= 30) codes.push('month_streak');
  if (streak >= 90) codes.push('quarter_streak');
  if (level >= 5) codes.push('level_5');
  if (level >= 10) codes.push('level_10');
  if (lifts >= 1) codes.push('first_lift');
  if (lifts >= 25) codes.push('lifter_25');
  if (buddies >= 1) codes.push('first_buddy');
  if (buddies >= 5) codes.push('social_5');
  if (reels >= 1) codes.push('first_reel');
  if (foods >= 10) codes.push('nutrition_10');
  if (foods >= 50) codes.push('nutrition_50');
  if (challenges >= 1) codes.push('challenger');
  if (referrals >= 1) codes.push('first_referral');
  if (referrals >= 5) codes.push('recruiter_5');
  if (completions >= 250) codes.push('workouts_250');
  if (streak >= 180) codes.push('half_year_streak');
  if (level >= 20) codes.push('level_20');
  if (level >= 40) codes.push('level_40');
  if (lifts >= 100) codes.push('lifter_100');
  if (challengesWon >= 1) codes.push('challenge_winner');
  if (challengesWon >= 5) codes.push('challenge_master');
  if (water >= 7) codes.push('hydrated_week');
  if (water >= 30) codes.push('hydrated_month');
  if (duelWins >= 1) codes.push('duel_winner');
  if (duelWins >= 10) codes.push('duel_champion');
  if (spins >= 30) codes.push('lucky_streak');
  if ((league?.tier ?? 0) >= 2) codes.push('gold_league');
  if ((league?.tier ?? 0) >= 4) codes.push('legend_league');
  if (dawnSessions >= 5) codes.push('early_bird');
  if (lateSessions >= 5) codes.push('night_owl');

  for (const code of codes) {
    const badge = await prisma.badge.findUnique({ where: { code } });
    if (!badge) continue;
    const already = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (already) continue;
    // Concurrent completions can race to the same badge — the unique constraint
    // decides the winner; the loser just skips (no 500 for the user).
    try {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    } catch {
      continue;
    }
    await awardXp(userId, XP_PER_BADGE);
    await createFeedPost(userId, 'badge', `Earned the "${badge.title}" badge ${badge.icon ?? '🏅'}`, 'badge', badge.id, {
      textAr: `فتح وسام "${badge.titleAr ?? badge.title}" ${badge.icon ?? '🏅'}`,
    });
    // A milestone badge got LESS fanfare than a buddy cheer: no push, no live
    // bell. notifyUser + socket emit fix both.
    const { notifyUser } = await import('../routes/push');
    const { emitToUser } = await import('./realtime');
    emitToUser(userId, 'notify', { type: 'badge' });
    await notifyUser(userId, {
      type: 'general',
      title: `Badge earned ${badge.icon ?? '🏅'}`,
      titleAr: `كسبت وسام جديد ${badge.icon ?? '🏅'}`,
      body: badge.title,
      bodyAr: badge.titleAr ?? badge.title,
      url: '/achievements',
    }).catch(() => {});
  }
}

/** Workouts finished inside a local-time hour window — powers the secret
 *  early-bird / night-owl badges. Hours are half-open: [from, to). */
async function countByHour(userId: string, from: number, to: number): Promise<number> {
  const { localHour } = await import('./time');
  const rows = await prisma.xpEvent.findMany({
    where: { userId, reason: { in: ['workout-session', 'workout-lesson'] } },
    select: { createdAt: true },
    take: 500,
  });
  return rows.filter((r) => {
    const h = localHour(r.createdAt);
    return h >= from && h < to;
  }).length;
}
