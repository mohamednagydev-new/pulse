/** Force-corrects Arabic badge/challenge titles to gender-neutral Egyptian phrasing.
 *  Safe to re-run. Run after seed-engagement: npx tsx prisma/ar/neutral-fix.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BADGES: Record<string, string> = {
  level_5: 'موهبة صاعدة',
  lifter_25: 'قلبك حديد',
  social_5: 'روح الشلة',
  nutrition_10: 'يوميات الأكل',
  nutrition_50: 'أسطورة التغذية',
  challenger: 'روح التحدي',
  committed: 'التزام',
};
const CHALLENGES: Record<string, string> = {
  'Weekend Warrior': 'طاقة الويك إند',
  'Macro Master': 'أسطورة الماكروز',
};

async function run() {
  let n = 0;
  for (const [code, titleAr] of Object.entries(BADGES))
    n += (await prisma.badge.updateMany({ where: { code }, data: { titleAr } })).count;
  // batch-1 badge had title 'Committed' (code unknown) — match by title too
  n += (await prisma.badge.updateMany({ where: { title: 'Committed' }, data: { titleAr: 'التزام' } })).count;
  for (const [title, titleAr] of Object.entries(CHALLENGES))
    n += (await prisma.challenge.updateMany({ where: { title }, data: { titleAr } })).count;
  console.log(`gender-neutral fix applied to ${n} rows`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
