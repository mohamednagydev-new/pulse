import { prisma } from './prisma';
import { dayString } from './time';

/**
 * Personal challenge nudges — the piece the challenge feature was missing.
 *
 * The room gets a daily coach prompt and the podium fires at the end, but
 * nothing ever spoke to a PARTICIPANT about THEIR run: the person who joined,
 * trained twice, drifted, and never heard from us again. That silent drop is
 * where challenges lose most people.
 *
 * Deliberately quiet. One push per participant per day at most, and only when
 * there is something genuinely worth saying:
 *   · stalled — joined, still short, and no workout for 3+ days
 *   · final days — still reachable, so the push is useful rather than taunting
 * Never nudges someone who already finished, and never someone whose goal has
 * become mathematically impossible (that message only hurts).
 */
export async function runChallengeNudges(): Promise<string> {
  const today = dayString();
  const dayNum = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
  const todayNum = dayNum(today);

  const open = await prisma.challenge.findMany({
    where: { kind: 'global', startsOn: { lte: today }, endsOn: { gte: today } },
    select: { id: true, title: true, titleAr: true, goalValue: true, endsOn: true, prizeText: true },
  });
  if (open.length === 0) return 'no open challenges';

  const { notifyUser } = await import('../routes/push');
  let stalled = 0;
  let finalCall = 0;

  for (const ch of open) {
    const daysLeft = dayNum(ch.endsOn) - todayNum;
    const parts = await prisma.challengeParticipant.findMany({
      where: { challengeId: ch.id, completedAt: null },
      select: { userId: true, progress: true },
      take: 500,
    });

    for (const p of parts) {
      const remaining = ch.goalValue - p.progress;
      if (remaining <= 0) continue;
      // Out of reach: saying "you need 9 more days in 3" is discouraging, not
      // motivating. Stay quiet and let them finish for the completion reward.
      const reachable = remaining <= daysLeft + 1;
      const title = ch.titleAr ?? ch.title;

      if (daysLeft <= 3 && reachable) {
        await notifyUser(p.userId, {
          title: daysLeft <= 1 ? 'آخر يوم في التحدي! 🏁' : `آخر ${daysLeft} أيام في التحدي 🏁`,
          titleAr: daysLeft <= 1 ? 'آخر يوم في التحدي! 🏁' : `آخر ${daysLeft} أيام في التحدي 🏁`,
          body: `«${title}» — باقي لك ${remaining} يوم تمرين وتكمّل. تقدر!`,
          bodyAr: `«${title}» — باقي لك ${remaining} يوم تمرين وتكمّل. تقدر!`,
          url: `/challenge/${ch.id}`,
          type: 'challenge',
        }).catch(() => {});
        finalCall++;
        continue;
      }

      // Stalled: no counted workout in the last 3 days.
      const since = new Date(Date.now() - 3 * 86_400_000);
      const recent = await prisma.xpEvent.findFirst({
        where: { userId: p.userId, reason: { in: ['workout-session', 'workout-lesson', 'wearable_import'] }, createdAt: { gte: since } },
        select: { id: true },
      });
      if (recent) continue;

      await notifyUser(p.userId, {
        title: 'التحدي لسه مستنيك 💪',
        titleAr: 'التحدي لسه مستنيك 💪',
        body: `«${title}» — باقي ${daysLeft} يوم و${remaining} يوم تمرين. تمرين واحد النهارده يرجّعك للسباق.`,
        bodyAr: `«${title}» — باقي ${daysLeft} يوم و${remaining} يوم تمرين. تمرين واحد النهارده يرجّعك للسباق.`,
        url: `/challenge/${ch.id}`,
        type: 'challenge',
      }).catch(() => {});
      stalled++;
    }
  }

  return `nudged — stalled:${stalled} finalCall:${finalCall} across ${open.length} challenge(s)`;
}
