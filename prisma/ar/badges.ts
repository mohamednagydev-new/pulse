/** Egyptian-Arabic descriptions for the original badge set (the newer badges ship
 *  bilingual from seed-gamification.ts). Idempotent.
 *  Run: npx tsx prisma/ar/badges.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AR: Record<string, { titleAr: string; descriptionAr: string }> = {
  first_workout: { titleAr: 'أول خطوة', descriptionAr: 'خلّصت أول درس ليك' },
  ten_workouts: { titleAr: 'بتقوى', descriptionAr: 'خلّصت ١٠ دروس' },
  fifty_workouts: { titleAr: 'ملتزم', descriptionAr: 'خلّصت ٥٠ درس' },
  week_streak: { titleAr: 'سبع أيام ورا بعض', descriptionAr: 'كنت نشيط ٧ أيام متواصلة' },
  month_streak: { titleAr: 'تلاتين يوم ورا بعض', descriptionAr: 'كنت نشيط ٣٠ يوم متواصلة' },
  hundred_workouts: { titleAr: 'نادي المية', descriptionAr: 'خلّص ١٠٠ تمرينة' },
  quarter_streak: { titleAr: 'مفيش حاجة توقفك', descriptionAr: 'سلسلة ٩٠ يوم' },
  level_5: { titleAr: 'نجم طالع', descriptionAr: 'وصلت لِفِل ٥' },
  level_10: { titleAr: 'نخبة', descriptionAr: 'وصلت لِفِل ١٠' },
  first_lift: { titleAr: 'أول مجموعة', descriptionAr: 'سجّل أول مجموعة ليك' },
  lifter_25: { titleAr: 'مدمن حديد', descriptionAr: 'سجّل ٢٥ مجموعة' },
  first_buddy: { titleAr: 'مع بعض أحسن', descriptionAr: 'اتواصل مع أول صاحب ليك' },
  social_5: { titleAr: 'كابتن الشلة', descriptionAr: 'اتواصل مع ٥ أصحاب' },
  first_reel: { titleAr: 'قدام الكاميرا', descriptionAr: 'انشر أول ريل ليك' },
  nutrition_10: { titleAr: 'بتسجّل أكلك', descriptionAr: 'سجّل ١٠ أكلات' },
  nutrition_50: { titleAr: 'محترف تغذية', descriptionAr: 'سجّل ٥٠ أكلة' },
  challenger: { titleAr: 'متحدي', descriptionAr: 'ادخل أول تحدي ليك' },
  first_referral: { titleAr: 'وصّل الـPULSE', descriptionAr: 'اعزم أول صاحب ليك' },
  recruiter_5: { titleAr: 'بتبني مجتمع', descriptionAr: 'اعزم ٥ أصحاب' },
};

async function run() {
  let n = 0;
  for (const [code, ar] of Object.entries(AR)) {
    const badge = await prisma.badge.findUnique({ where: { code } });
    if (!badge) continue;
    await prisma.badge.update({
      where: { code },
      // Never overwrite an Arabic title that is already there.
      data: { titleAr: badge.titleAr ?? ar.titleAr, descriptionAr: ar.descriptionAr },
    });
    n++;
  }

  // Season badges are generated monthly with an Arabic title but no Arabic body.
  const seasons = await prisma.badge.findMany({ where: { code: { startsWith: 'season_' }, descriptionAr: null } });
  for (const b of seasons) {
    await prisma.badge.update({ where: { id: b.id }, data: { descriptionAr: 'خلّص أي تحدي من تحديات الموسم' } });
    n++;
  }

  const left = await prisma.badge.count({ where: { OR: [{ titleAr: null }, { descriptionAr: null }] } });
  console.log(`Arabic filled on ${n} badges. Still missing: ${left}.`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
