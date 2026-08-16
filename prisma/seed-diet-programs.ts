/**
 * Seeds the global diet programs. Idempotent — upserts by title.
 * Run locally:  node node_modules/tsx/dist/cli.mjs prisma/seed-diet-programs.ts
 * Run on server: & "C:\Program Files\nodejs\node.exe" node_modules\tsx\dist\cli.mjs prisma\seed-diet-programs.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tips = (arr: [string, string][]) => JSON.stringify(arr.map(([en, ar]) => ({ en, ar })));

const PROGRAMS = [
  {
    title: '14-Day Logging Commitment',
    titleAr: '١٤ يوم إلتزام',
    description: 'The habit that changes everything: log every day for 14 days. Nothing else — no target, no restriction. Awareness first.',
    descriptionAr: 'العادة اللي بتغير كل حاجة: سجّل أكلك كل يوم لمدة ١٤ يوم. من غير هدف ومن غير حرمان — الوعي الأول.',
    days: 14,
    kind: 'commit',
    emoji: '📝',
    order: 1,
    tipsJson: tips([
      ['Log everything today — even the bites you "forgot".', 'سجّل كل حاجة النهارده — حتى «التذوق» اللي بننساه.'],
      ['Log BEFORE you eat, not after. It changes decisions.', 'سجّل قبل ما تاكل مش بعد — بيغيّر القرار نفسه.'],
      ['Use the voice logger once today — say what you ate.', 'جرّب التسجيل بالصوت النهارده — قول أكلت إيه.'],
      ['Drinks count too. Log the juice and the soda.', 'المشروبات بتتحسب — سجّل العصير والحاجة الساقعة.'],
      ['Scan one barcode from your kitchen today.', 'امسح باركود منتج واحد من مطبخك النهارده.'],
      ['Halfway! Look at your week — what surprised you?', 'نص الطريق! بص على أسبوعك — إيه اللي فاجأك؟'],
      ['Weekend logging is where champions are made.', 'تسجيل الويك إند هو اللي بيفرق الجادين.'],
    ]),
  },
  {
    title: '30-Day Steady Deficit',
    titleAr: '٣٠ يوم عجز ثابت',
    description: 'A month under your calorie target — the sustainable pace that actually moves the scale. Pairs with the Diet Journey.',
    descriptionAr: 'شهر تحت هدف سعراتك — السرعة المستدامة اللي بتحرك الميزان فعلاً. اربطه برحلة الدايت.',
    days: 30,
    kind: 'deficit',
    emoji: '🔥',
    order: 2,
    tipsJson: tips([
      ['Protein first at every meal — it kills cravings.', 'ابدأ كل وجبة بالبروتين — بيقفل النفس على الحلويات.'],
      ['Water before meals. Half the "hunger" is thirst.', 'مية قبل الأكل — نص «الجوع» عطش.'],
      ['A 10-minute walk after lunch beats an hour of guilt.', 'مشي ١٠ دقايق بعد الغدا أحسن من ساعة إحساس بالذنب.'],
      ["Slipped a day? One day never ruined a month. Continue.", 'فلتّ يوم؟ يوم واحد عمره ما بوّظ شهر. كمّل.'],
      ['Sleep is a fat-loss tool. 7 hours minimum tonight.', 'النوم أداة تخسيس — ٧ ساعات على الأقل الليلة.'],
      ['Weigh in Friday morning — same scale, same time.', 'اتوزن الجمعة الصبح — نفس الميزان ونفس المعاد.'],
      ['Plan tomorrow\'s meals tonight — decisions burn willpower.', 'خطط أكل بكرة من الليلة دي — القرارات بتستهلك الإرادة.'],
    ]),
  },
  {
    title: '21-Day High Protein',
    titleAr: '٢١ يوم بروتين عالي',
    description: 'Three weeks of hitting your protein target — keep the muscle while the fat goes. The gym-goer\'s diet program.',
    descriptionAr: 'تلات أسابيع توصل فيها لهدف البروتين — احتفظ بالعضل والدهون هي اللي تمشي. برنامج أهل الجيم.',
    days: 21,
    kind: 'protein',
    emoji: '💪',
    order: 3,
    tipsJson: tips([
      ['Eggs, foul, chicken, tuna — Egyptian protein is cheap.', 'بيض، فول، فراخ، تونة — البروتين المصري مش غالي.'],
      ['Aim for protein in EVERY meal, not one big dinner.', 'بروتين في كل وجبة — مش وجبة واحدة كبيرة بالليل.'],
      ['Training day? The meal plan already added +10g for you.', 'يوم تمرين؟ الخطة زودتلك ١٠ جرام بروتين لوحدها.'],
      ['Greek yogurt or cottage cheese as the evening snack.', 'زبادي يوناني أو جبنة قريش كسناك بالليل.'],
      ['Check your tracker: did you hit the protein number yesterday?', 'بص على التراكر: وصلت لرقم البروتين امبارح؟'],
    ]),
  },
];

async function main() {
  for (const p of PROGRAMS) {
    const existing = await prisma.dietProgram.findFirst({ where: { title: p.title } });
    if (existing) {
      await prisma.dietProgram.update({ where: { id: existing.id }, data: p });
      console.log('updated', p.title);
    } else {
      await prisma.dietProgram.create({ data: p });
      console.log('created', p.title);
    }
  }
}

main().finally(() => prisma.$disconnect());
