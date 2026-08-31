/**
 * Seeds the Carrefour prize challenge (Sept 1-14, 2026) — ONCE.
 *
 * CREATE-ONLY on purpose. install.ps1 runs this on every deploy, and it used to
 * `update` the existing row with the hardcoded pack below — so every edit the
 * admin made in the dashboard (dates, prizes, description, goal) was silently
 * reverted on the next deploy. Reported live, Aug 2026.
 *
 * Once the challenge exists, the dashboard owns it. To reset it deliberately,
 * delete the challenge in Admin and redeploy, or run with --force.
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
  const force = process.argv.includes('--force');
  const existing = await prisma.challenge.findFirst({ where: { title: CHALLENGE.title } });
  if (existing && !force) {
    console.log('· Carrefour challenge already exists — left untouched (admin edits win).');
    return;
  }
  if (existing) {
    await prisma.challenge.update({ where: { id: existing.id }, data: CHALLENGE });
    console.log('✓ Carrefour challenge RESET to the seed pack (--force)');
  } else {
    await prisma.challenge.create({ data: CHALLENGE });
    console.log('✓ Carrefour challenge created');
  }
}

main().finally(() => prisma.$disconnect());
