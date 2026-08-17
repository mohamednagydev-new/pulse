import { prisma } from './prisma';
import { awardXp, createFeedPost } from './social';
import { dayString } from './time';

/**
 * Walk challenges — the low-pressure goal type. lib/social's bumpChallenges only
 * knows 'workout'/'calorie' triggers; walks live here so the shared helper (edited
 * elsewhere) stays untouched. Each logged walk (manual or wearable-imported)
 * advances every open 'walk' challenge by one.
 */
export async function bumpWalkChallenges(userId: string) {
  const parts = await prisma.challengeParticipant.findMany({
    where: { userId, challenge: { goalType: 'walk' } },
    include: { challenge: true },
  });
  const today = dayString();

  for (const p of parts) {
    // Only challenges whose window is open today can move.
    if (p.challenge.startsOn > today || p.challenge.endsOn < today) continue;

    const progress = p.progress + 1;
    // completedAt is the reward gate — set once, never pays twice.
    const justFinished = progress >= p.challenge.goalValue && !p.completedAt;
    await prisma.challengeParticipant.update({
      where: { id: p.id },
      data: { progress, ...(justFinished ? { completedAt: new Date() } : {}) },
    });
    if (!justFinished) continue;

    await createFeedPost(userId, 'challenge', `Completed the "${p.challenge.title}" challenge! 🏆`, 'challenge', p.challengeId, {
      textAr: `خلّص تحدي "${p.challenge.titleAr ?? p.challenge.title}"! 🏆`,
    }).catch(() => {});
    const { emitToUser } = await import('./realtime');
    emitToUser(userId, 'notify', { type: 'challenge' });
    const { notifyUser } = await import('../routes/push');
    notifyUser(userId, {
      title: 'Challenge complete! 🏆',
      titleAr: 'خلصت التحدي! 🏆',
      body: `"${p.challenge.title}" done${p.challenge.rewardXp > 0 ? ` — +${p.challenge.rewardXp} XP` : ''}`,
      bodyAr: `"${p.challenge.titleAr ?? p.challenge.title}" خلص${p.challenge.rewardXp > 0 ? ` — كسبت ${p.challenge.rewardXp} نقطة` : ''}`,
      url: `/challenge/${p.challengeId}`,
      type: 'challenge',
    }).catch(() => {});
    if (p.challenge.rewardXp > 0) await awardXp(userId, p.challenge.rewardXp, 'challenge_complete').catch(() => {});
    if (p.challenge.seasonKey) {
      const { awardSeasonBadge } = await import('./seasons');
      await awardSeasonBadge(userId, p.challenge.seasonKey).catch(() => {});
    }
  }
}
