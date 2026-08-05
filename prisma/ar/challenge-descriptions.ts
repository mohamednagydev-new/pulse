/** Arabic descriptions for the seeded challenges (matched by English title). Idempotent.
 *  Run: npx tsx prisma/ar/challenge-descriptions.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const D: Record<string, string> = {
  'New Week, New You': 'خلّص ٥ تمارين الأسبوع ده.',
  '14-Day Fire Streak': 'فضل نشيط ١٤ يوم على التوالي.',
  'Clean Fuel Week': 'سجّل أكلك ٧ أيام — ١٠ آلاف سعرة متتبعة.',
  '20 Sessions in 30 Days': 'عشرين تمرينة في شهر واحد. للأساطير بس.',
  'Weekend Warrior': 'تمرينتين قبل ما الأسبوع يبدأ.',
  '30-Day Consistency Crown': 'شهر كامل متواصل. خد التاج.',
  'Macro Master': 'تابع ٢٥ ألف سعرة من الأكل النضيف.',
  'Fresh Start 10': 'عشر تمارين — رجعتك بتبدأ دلوقتي.',
  'First Step: 3 Workouts': 'لسه بادئ؟ ٣ تمارين بس عشان تبدأ.',
  'Morning Movers': 'سبع تمارين بدري — املك صباحك.',
  '50 Workouts Club': 'خمسين تمرينة. نفس طويل ونتايج حقيقية.',
  'Hydration & Nutrition 15k': 'تابع ١٥ ألف سعرة من الأكل الواعي.',
  '7-Day Kickstart Streak': 'أسبوع من غير قطع. أصعب وأهم أسبوع.',
  '21-Day Habit Builder': 'تلات أسابيع متواصلة — هنا بتبقى عادة.',
  '60-Day Iron Will': 'شهرين كاملين من الالتزام. مستوى الأساطير.',
  'Ramadan Ready': 'خمستاشر حصة تدخل بيهم بقوة وتفضل ملتزم.',
  'Weekend Double': 'تمرينتين كل ويك إند لمدة شهر.',
  'Clean Eating 30k': 'تلاتين ألف سعرة متتبعة من الأكل الواعي.',
  '30-Day Movement Challenge': 'اتحرك كل يوم لمدة ٣٠ يوم.',
  'Consistency Streak': 'الالتزام أهم من الشدة.',
  'Summer Shred': 'جهّز نفسك للصيف.',
};

async function run() {
  let n = 0;
  for (const [title, descriptionAr] of Object.entries(D)) {
    n += (await prisma.challenge.updateMany({ where: { title, descriptionAr: null }, data: { descriptionAr } })).count;
  }
  // Season challenges follow a "<Theme>: <goal>" pattern — give them a generic Arabic line.
  n += (await prisma.challenge.updateMany({
    where: { seasonKey: { not: null }, descriptionAr: null },
    data: { descriptionAr: 'تحدي الموسم — كمّله وخد وسام الشهر 🏆' },
  })).count;
  console.log(`challenge descriptions (ar): ${n} filled`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
