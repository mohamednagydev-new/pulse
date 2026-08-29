import { prisma } from './prisma';
import { dayString } from './time';

/**
 * Prize-challenge fair-play watchdog.
 *
 * The audit screen was passive: it showed flags only when an admin remembered
 * to open it, so a farmed account could sit at #1 for the whole month. This
 * runs daily while any PRIZE challenge is open and pushes the admins the
 * moment a leader looks wrong — the leaderboard gets cleaned during the
 * challenge, not after the prizes are announced.
 *
 * Deliberately cheap: only the top 10 of challenges that actually pay out.
 */
export async function runChallengeWatch(): Promise<string> {
  const today = dayString();
  const live = await prisma.challenge.findMany({
    where: { prizeText: { not: null }, startsOn: { lte: today }, endsOn: { gte: today } },
    select: { id: true, title: true, startsOn: true },
  });
  if (live.length === 0) return 'no prize challenges running';

  const suspects: string[] = [];
  for (const ch of live) {
    const start = new Date(`${ch.startsOn}T00:00:00Z`);
    const top = await prisma.challengeParticipant.findMany({
      where: { challengeId: ch.id },
      orderBy: { progress: 'desc' },
      take: 10,
      include: { user: { select: { id: true, firstName: true, lastName: true, createdAt: true } } },
    });

    for (const p of top) {
      const events = await prisma.xpEvent.findMany({
        where: {
          userId: p.userId,
          reason: { in: ['workout-session', 'workout-lesson', 'wearable_import'] },
          createdAt: { gte: start },
        },
        select: { createdAt: true },
      });
      const perDay = new Map<string, number>();
      for (const e of events) {
        const d = dayString(e.createdAt);
        perDay.set(d, (perDay.get(d) ?? 0) + 1);
      }
      const maxPerDay = Math.max(0, ...perDay.values());
      const activeDays = perDay.size;
      const proofs = await prisma.challengeMessage.count({
        where: { challengeId: ch.id, userId: p.userId, isProof: true },
      });

      const why: string[] = [];
      if (maxPerDay > 4) why.push(`${maxPerDay} workouts in one day`);
      // Real training spreads out; a month of "progress" earned across two
      // days is a farm, not a habit.
      if (p.progress >= 5 && activeDays > 0 && p.progress / activeDays > 4) why.push(`${p.progress} progress over only ${activeDays} days`);
      if (p.user.createdAt > start && proofs === 0 && p.progress >= 5) why.push('new account, no proof check-ins');

      if (why.length > 0) {
        suspects.push(`${p.user.firstName} ${p.user.lastName} — ${ch.title}: ${why.join(' · ')}`);
      }
    }
  }

  if (suspects.length === 0) return `checked ${live.length} prize challenge(s) — leaderboards clean`;

  const { notifyUser } = await import('../routes/push');
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  const head = suspects.slice(0, 3).join(' | ');
  for (const a of admins) {
    notifyUser(a.id, {
      title: `⚠️ ${suspects.length} suspicious leader${suspects.length === 1 ? '' : 's'}`,
      titleAr: `⚠️ ${suspects.length} متصدر مشبوه في تحدي بجوايز`,
      body: `${head}${suspects.length > 3 ? ` …+${suspects.length - 3}` : ''} — review in Challenge Audit.`,
      bodyAr: `${head}${suspects.length > 3 ? ` …+${suspects.length - 3}` : ''} — راجعهم في Challenge Audit.`,
      url: '/admin/challenge-audit',
      type: 'general',
    }).catch(() => {});
  }
  return `flagged ${suspects.length}: ${head}`;
}
