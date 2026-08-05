import { PrismaClient } from '@prisma/client';

/**
 * The Big Launch Challenge — Campaign A in LAUNCH-CAMPAIGNS.md.
 *
 * Creates (or RESETS) the official 14-day launch challenge with invite code
 * PULSE14, plus its exclusive completion badge. kind:'global' so it appears on
 * Home's "challenges worth joining" for everyone, while the invite code gives
 * the campaign its call-to-action ("ادخل بالكود PULSE14") through join-by-code.
 *
 * Completion pays 300 XP and the season-badge hook (seasonKey 'pulse14' →
 * badge code 'season_pulse14') awards the Founding Member badge automatically.
 *
 * ⚠️ RUN THIS ON LAUNCH DAY (on the server):
 *     node node_modules/tsx/dist/cli.mjs prisma/seed-launch-challenge.ts
 * Re-running RESETS the 14-day window to start today — deliberate for launch,
 * which is why this script is NOT in deploy/seed.ps1's automatic list.
 */

const prisma = new PrismaClient();
const TZ = process.env.APP_TZ || 'Africa/Cairo';

function day(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

async function main() {
  await prisma.badge.upsert({
    where: { code: 'season_pulse14' },
    create: {
      code: 'season_pulse14',
      title: 'Founding Member',
      titleAr: 'من الأوائل',
      description: 'Finished the 14-day launch challenge. You were here first.',
      descriptionAr: 'خلّصت تحدي الافتتاح — انت من أول اللي بدأوا.',
      icon: '🚀',
    },
    update: {},
  });

  const startsOn = day(0);
  const endsOn = day(13); // 14 days inclusive

  const data = {
    kind: 'global',
    title: 'The Big Start — first 14 days',
    titleAr: 'التحدي الكبير — أول ١٤ يوم',
    description: 'Complete 10 workouts in 14 days. Finishers earn 300 XP and the Founding Member badge — forever.',
    descriptionAr: 'خلّص ١٠ تمرينات في ١٤ يوم. اللي يكمّل ياخد ٣٠٠ نقطة ووسام «من الأوائل» — على طول.',
    goalType: 'lessons',
    goalValue: 10,
    startsOn,
    endsOn,
    seasonKey: 'pulse14',
    rewardXp: 300,
    difficulty: 'medium',
  };

  const existing = await prisma.challenge.findUnique({ where: { inviteCode: 'PULSE14' } });
  if (existing) {
    await prisma.challenge.update({ where: { id: existing.id }, data });
    // A fresh window means fresh progress — otherwise pre-reset workouts count
    // toward the new window. completedAt is intentionally KEPT so anyone who
    // already finished a previous window can't earn the reward twice.
    await prisma.challengeParticipant.updateMany({
      where: { challengeId: existing.id },
      data: { progress: 0 },
    });
    console.log(`[launch] PULSE14 window RESET: ${startsOn} → ${endsOn} (participants kept, progress reset to zero; past finishers keep completedAt so rewards never double-pay)`);
  } else {
    await prisma.challenge.create({ data: { ...data, inviteCode: 'PULSE14' } });
    console.log(`[launch] PULSE14 created: ${startsOn} → ${endsOn}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
