/**
 * Seeds the Carrefour prize challenge (Sept 1-14, 2026). Idempotent — upserts
 * by title, so re-running updates fields without duplicating or touching
 * participants. Cover image is left for the admin to upload via the dashboard.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DESCRIPTION_AR = `🏆 اعمل ١٠ تمرينات في ١٤ يوم واكسب قسايم كارفور!

القواعد:
• التمرين المحسوب = جلسة كاملة من جوه التطبيق (خريطة العضلات أو أي برنامج).
• حد أقصى تمرينين في اليوم بيتحسبوا في المراجعة — الباقي بيتشال.
• انشر صورة/فيديو إثبات 📸 من غرفة التحدي على الأقل ٥ مرات خلال التحدي — الإثباتات بتحمي مركزك وقت المراجعة.
• الحساب لازم يكون متعمل قبل بداية التحدي، وحساب واحد لكل شخص.
• النتايج بتتراجع يدويًا قبل إعلان الفايزين — أي نشاط غير طبيعي بيستبعد صاحبه من الجوايز (وبيفضل في التحدي عادي).
• الفايزين بيتعلنوا تاني يوم بعد النهاية هنا وفي المجتمع، والقسايم بتتسلم خلال ٧ أيام داخل مصر.
• قرار فريق PULSE في المراجعة نهائي.

يلا نشوف مين قدها 💪`;

const DESCRIPTION_EN = `🏆 Do 10 workouts in 14 days and win Carrefour vouchers!

Rules:
• A counted workout = a full in-app session (muscle map or any program).
• Max 2 workouts per day count in the review.
• Post photo/video proof 📸 in the challenge room at least 5 times — proofs protect your podium spot.
• Account must exist before the challenge starts; one account per person.
• Results are reviewed manually before winners are announced; abnormal activity is excluded from prizes.
• Winners announced the day after it ends; vouchers delivered within 7 days inside Egypt.
• The PULSE team's review decision is final.`;

const CHALLENGE = {
  title: '14-Day Commitment — Carrefour Challenge',
  titleAr: 'تحدي الإلتزام ١٤ يوم 🛒',
  description: DESCRIPTION_EN,
  descriptionAr: DESCRIPTION_AR,
  goalType: 'lessons',
  goalValue: 10,
  startsOn: '2026-09-01',
  endsOn: '2026-09-14',
  kind: 'global',
  rewardXp: 100,
  prizeText: '🥇 500 EGP · 🥈 200 EGP · 🥉 200 EGP Carrefour vouchers',
  prizeTextAr: '🥇 قسيمة كارفور ٥٠٠ جنيه · 🥈 قسيمة ٢٠٠ جنيه · 🥉 قسيمة ٢٠٠ جنيه',
  prizeMode: 'top3',
  sponsorName: 'PULSE',
  difficulty: 'medium',
};

async function main() {
  const existing = await prisma.challenge.findFirst({ where: { title: CHALLENGE.title } });
  if (existing) {
    // Never overwrite a cover the admin uploaded; everything else follows the pack.
    await prisma.challenge.update({ where: { id: existing.id }, data: CHALLENGE });
    console.log('✓ Carrefour challenge updated');
  } else {
    await prisma.challenge.create({ data: CHALLENGE });
    console.log('✓ Carrefour challenge created');
  }
}

main().finally(() => prisma.$disconnect());
