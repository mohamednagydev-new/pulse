/** Creates the 4 onboarding slide rows so the admin only has to UPLOAD an image
 *  for each one (the slide text itself lives in the app). Idempotent.
 *  Run: npx tsx prisma/seed-onboarding.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SLIDES = [
  { order: 0, title: 'Slide 1 — Count Your Calories', titleAr: 'شاشة ١ — احسب سعراتك', subtitle: 'Upload a background image for this slide' },
  { order: 1, title: 'Slide 2 — A Workout For Everybody', titleAr: 'شاشة ٢ — تمرين لكل الناس', subtitle: 'Upload a background image for this slide' },
  { order: 2, title: 'Slide 3 — Yoga & Meditation', titleAr: 'شاشة ٣ — يوجا وتأمل', subtitle: 'Upload a background image for this slide' },
  { order: 3, title: 'Slide 4 — The Wellness Kitchen', titleAr: 'شاشة ٤ — مطبخ الصحة', subtitle: 'Upload a background image for this slide' },
];

async function run() {
  let n = 0;
  for (const s of SLIDES) {
    const exists = await prisma.banner.findFirst({ where: { section: 'onboarding', order: s.order } });
    if (exists) continue;
    await prisma.banner.create({ data: { section: 'onboarding', ...s } });
    n++;
  }
  console.log(`onboarding slides ready: +${n} (open Admin → Banners / Ads / Onboarding and upload an image for each)`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
