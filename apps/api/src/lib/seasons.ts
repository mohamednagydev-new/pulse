import { prisma } from './prisma';
import { monthKey, localMonthIndex, lastDayOfMonth } from './time';

/** Auto-rotating monthly seasons: themed challenge sets + an exclusive seasonal badge.
 *  ensureCurrentSeason() runs daily from the reminder scheduler — idempotent per month. */

type Theme = { title: string; titleAr: string; emoji: string; badge: string; badgeAr: string };

// One theme per calendar month (index 0 = January).
const THEMES: Theme[] = [
  { title: 'Fresh Start', titleAr: 'بداية جديدة', emoji: '🌅', badge: 'Fresh Starter', badgeAr: 'بداية قوية' },
  { title: 'Heart Month', titleAr: 'شهر القلب', emoji: '❤️', badge: 'Heart Hero', badgeAr: 'قلب جامد' },
  { title: 'Spring Power', titleAr: 'طاقة الربيع', emoji: '🌸', badge: 'Spring Force', badgeAr: 'قوة الربيع' },
  { title: 'Endurance April', titleAr: 'أبريل التحمل', emoji: '🏃', badge: 'Endurance Ace', badgeAr: 'نفس طويل' },
  { title: 'Strength May', titleAr: 'مايو القوة', emoji: '🏋️', badge: 'Iron Month', badgeAr: 'شهر الحديد' },
  { title: 'Summer Prep', titleAr: 'استعداد الصيف', emoji: '☀️', badge: 'Summer Ready', badgeAr: 'جاهز للصيف' },
  { title: 'Summer Shred', titleAr: 'تنشيف الصيف', emoji: '🔥', badge: 'Shred Master', badgeAr: 'أسطورة التنشيف' },
  { title: 'Peak August', titleAr: 'قمة أغسطس', emoji: '⛰️', badge: 'Peak Performer', badgeAr: 'في القمة' },
  { title: 'Back On Track', titleAr: 'رجوع للجدية', emoji: '🎯', badge: 'Comeback', badgeAr: 'الرجعة' },
  { title: 'Strong October', titleAr: 'أكتوبر القوي', emoji: '💪', badge: 'October Strong', badgeAr: 'قوة أكتوبر' },
  { title: 'No-Excuses November', titleAr: 'نوفمبر بلا أعذار', emoji: '🚫', badge: 'No Excuses', badgeAr: 'من غير أعذار' },
  { title: 'Finish Strong', titleAr: 'اقفل السنة بقوة', emoji: '🏁', badge: 'Year Finisher', badgeAr: 'قفلة السنة' },
];

export function currentSeasonKey(): string {
  return monthKey(); // YYYY-MM in the app timezone
}

export async function ensureCurrentSeason() {
  const key = currentSeasonKey();
  const exists = await prisma.challenge.findFirst({ where: { seasonKey: key } });
  if (exists) return;

  const theme = THEMES[localMonthIndex()];
  const startsOn = `${key}-01`;
  const endsOn = lastDayOfMonth(); // app-timezone safe (no UTC off-by-one)

  // Exclusive seasonal badge — awarded for completing any challenge of this season.
  await prisma.badge.upsert({
    where: { code: `season_${key}` },
    create: {
      code: `season_${key}`,
      title: `${theme.badge} ${theme.emoji}`,
      titleAr: `${theme.badgeAr} ${theme.emoji}`,
      description: `Complete a ${theme.title} season challenge`,
      descriptionAr: 'خلّص أي تحدي من تحديات الموسم',
      icon: theme.emoji,
    },
    update: {},
  });

  const mk = (
    title: string, titleAr: string, description: string, descriptionAr: string,
    goalType: string, goalValue: number, rewardXp: number, difficulty: string,
  ) =>
    prisma.challenge.create({
      data: { title, titleAr, description, descriptionAr, goalType, goalValue, rewardXp, difficulty, startsOn, endsOn, seasonKey: key },
    });

  await Promise.all([
    mk(`${theme.title}: 12 Workouts ${theme.emoji}`, `${theme.titleAr}: ١٢ تمرينة ${theme.emoji}`,
       `Twelve workouts before the month ends — the ${theme.title} way.`, 'اتمرن ١٢ مرة قبل ما الشهر يخلص.',
       'lessons', 12, 400, 'medium'),
    mk(`${theme.title}: 14-Day Streak ${theme.emoji}`, `${theme.titleAr}: سلسلة ١٤ يوم ${theme.emoji}`,
       'Stay active 14 days in a row this month.', 'اتحرك ١٤ يوم ورا بعض الشهر ده.',
       'streak', 14, 350, 'medium'),
    mk(`${theme.title}: Clean 20k ${theme.emoji}`, `${theme.titleAr}: ٢٠ ألف نضيفة ${theme.emoji}`,
       'Track 20,000 kcal of mindful eating this month.', 'سجّل ٢٠ ألف سعرة أكل واعي الشهر ده.',
       'calories', 20000, 300, 'medium'),
  ]);
  console.log(`[seasons] created ${key} "${theme.title}" season (3 challenges + badge)`);
}

/** Award the seasonal badge when a user completes a season challenge. */
export async function awardSeasonBadge(userId: string, seasonKey: string) {
  const badge = await prisma.badge.findUnique({ where: { code: `season_${seasonKey}` } });
  if (!badge) return;
  const already = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
  if (already) return;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  const { notifyUser } = await import('../routes/push');
  await notifyUser(userId, {
    type: 'general',
    title: `Seasonal badge unlocked ${badge.icon ?? '🏅'}`,
    titleAr: `فتحت وسام الموسم ${badge.icon ?? '🏅'}`,
    body: badge.title,
    bodyAr: badge.titleAr ?? badge.title,
    url: '/achievements',
  }).catch(() => {});
}
