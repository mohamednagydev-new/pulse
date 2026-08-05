/**
 * Hand-translated Arabic (simple Egyptian dialect) — no OpenAI required.
 * Idempotent: only fills *Ar columns that are still empty, matched by the English value.
 * Run on the server against the live DB:  npx tsx prisma/translate-manual.ts
 * Batches are added over time; re-running is always safe.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---- Batch 1: navigation / short, high-visibility content ----
const MUSCLE: Record<string, string> = {
  Shoulders: 'الأكتاف',
  Chest: 'الصدر',
  Biceps: 'البايسبس',
  Forearm: 'الساعد',
  Abs: 'عضلات البطن',
  Obliques: 'جوانب البطن',
  Quads: 'مقدمة الفخد',
  Abductors: 'مبعدات الفخد',
  Adductors: 'مقربات الفخد',
  Cardio: 'كارديو',
  Triceps: 'الترايسبس',
  Traps: 'الترابيس',
  Lats: 'اللاتس',
  'Lower Back': 'أسفل الضهر',
  Glutes: 'عضلات المؤخرة',
  Hamstrings: 'خلفية الفخد',
  Calves: 'السمانة',
};

const CATEGORY: Record<string, string> = {
  Appetizers: 'مقبلات',
  'Arthritis & Joint Health': 'التهاب المفاصل وصحة المفاصل',
  'Healthy Eating': 'الأكل الصحي',
  Soups: 'شوربات',
  'Back Pain & Spine Conditions': 'وجع الضهر ومشاكل العمود الفقري',
  'Staying Active': 'تفضل نشيط',
  Breads: 'المخبوزات',
  'Blood Pressure': 'ضغط الدم',
  'Weight Management': 'التحكم في الوزن',
  'Vegetarian Salads': 'سلطات نباتية',
  Cancer: 'السرطان',
  'Musculoskeletal Health': 'صحة العظام والعضلات',
  'Meatless Main Dishes': 'أطباق رئيسية من غير لحمة',
  Cholesterol: 'الكوليسترول',
  'Healthy Travel': 'السفر الصحي',
  Poultry: 'الفراخ والطيور',
  'Dental Health': 'صحة الأسنان',
  'Better Sleep': 'نوم أحسن',
  Meat: 'اللحوم',
  Diabetes: 'السكر',
  'Stress & Mental Wellbeing': 'التوتر والصحة النفسية',
  Seafood: 'المأكولات البحرية',
  'Digestive Health': 'صحة الهضم',
  'Child Health': 'صحة الأطفال',
  'Vegetables & Legumes': 'الخضار والبقوليات',
  'Mental Health': 'الصحة النفسية',
  'Maternal Health': 'صحة الأم',
  Grains: 'الحبوب',
  'Heart Health': 'صحة القلب',
  'Healthy Ageing': 'الكبر بصحة',
  'Sauces & Condiments': 'الصوصات والتتبيلة',
  'Sleep Disorders': 'مشاكل النوم',
  Hydration: 'شرب المياه',
  Desserts: 'الحلويات',
  'Skin Health': 'صحة البشرة',
  'Quitting Smoking': 'بطّلان التدخين',
};

const BADGE: Record<string, string> = {
  'First Steps': 'أول خطوة',
  'Getting Stronger': 'بتقوى',
  Committed: 'التزام',
  '7-Day Streak': '7 أيام متواصلة',
  '30-Day Streak': '30 يوم متواصلة',
};

const CHALLENGE: Record<string, string> = {
  '30-Day Movement Challenge': 'تحدي الحركة 30 يوم',
  'Consistency Streak': 'تحدي المداومة',
  'Summer Shred': 'تنشيف الصيف',
};

async function run() {
  let n = 0;
  for (const [en, ar] of Object.entries(MUSCLE))
    n += (await prisma.muscleGroup.updateMany({ where: { name: en, nameAr: null }, data: { nameAr: ar } })).count;
  for (const [en, ar] of Object.entries(CATEGORY))
    n += (await prisma.category.updateMany({ where: { title: en, titleAr: null }, data: { titleAr: ar } })).count;
  for (const [en, ar] of Object.entries(BADGE))
    n += (await prisma.badge.updateMany({ where: { title: en, titleAr: null }, data: { titleAr: ar } })).count;
  for (const [en, ar] of Object.entries(CHALLENGE))
    n += (await prisma.challenge.updateMany({ where: { title: en, titleAr: null }, data: { titleAr: ar } })).count;

  n += (await prisma.banner.updateMany({ where: { title: 'Exclusive Fit It Offers', titleAr: null }, data: { titleAr: 'عروض حصرية من PULSE' } })).count;
  n += (await prisma.banner.updateMany({ where: { subtitle: 'Fuel your gains this month', subtitleAr: null }, data: { subtitleAr: 'قوّي مكاسبك الشهر ده' } })).count;

  console.log(`Batch 1 done — filled ${n} Arabic fields (muscle groups, categories, badges, challenges, banners).`);
  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
