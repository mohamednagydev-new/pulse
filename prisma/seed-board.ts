/** Demo events board + partner lead forms.
 *  Idempotent — matched on title, so re-running updates instead of duplicating.
 *  Run: npx tsx prisma/seed-board.ts
 *  DELETE these once real sponsors are onboarded (they're marked "Demo"). */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** Events are dated relative to today so the board is never full of past dates. */
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const LEAD_FORMS = [
  {
    partnerMatch: 'IronHouse',
    kind: 'trial',
    title: 'Book a free trial day',
    titleAr: 'احجز يوم تجربة مجاني',
    description: 'One full day at IronHouse — gym floor, one group class and a body composition scan. No card needed.',
    descriptionAr: 'يوم كامل في أيرون هاوس — الجيم وحصة جماعية وقياس نسبة الدهون. من غير أي فلوس.',
    question: 'Which branch works for you?',
    questionAr: 'أي فرع يناسبك؟',
    cta: 'Request my trial day',
    ctaAr: 'اطلب يوم التجربة',
    order: 0,
  },
  {
    partnerMatch: 'IronHouse',
    kind: 'membership',
    title: 'Get a membership quote',
    titleAr: 'اعرف أسعار الاشتراك',
    description: 'Tell us your goal and how many days a week you can train — we will send you the right plan and price.',
    descriptionAr: 'قولنا هدفك وكام يوم في الأسبوع تقدر تتمرن — هنبعتلك الباقة والسعر المناسب.',
    question: 'How many days a week can you train?',
    questionAr: 'كام يوم في الأسبوع تقدر تتمرن؟',
    cta: 'Send me a quote',
    ctaAr: 'ابعتلي العرض',
    order: 1,
  },
  {
    partnerMatch: 'NutriPower',
    kind: 'consult',
    title: 'Free supplement consultation',
    titleAr: 'استشارة مكملات مجانية',
    description: 'A certified nutritionist reviews your goal and tells you what you actually need — and what you do not.',
    descriptionAr: 'أخصائي تغذية معتمد يشوف هدفك ويقولك محتاج إيه فعلاً — وإيه اللي مش محتاجه.',
    question: 'What is your main goal right now?',
    questionAr: 'إيه هدفك الأساسي دلوقتي؟',
    cta: 'Talk to a nutritionist',
    ctaAr: 'كلّم أخصائي التغذية',
    order: 2,
  },
];

const EVENTS = [
  {
    partnerMatch: 'IronHouse',
    kind: 'bootcamp',
    title: 'Sunrise Bootcamp — Al Azhar Park',
    titleAr: 'بوت كامب الفجر — حديقة الأزهر',
    description: 'Ninety minutes of circuits, sprints and core work as the sun comes up. All levels — the coach scales every movement.',
    descriptionAr: 'ساعة ونص سيركِت وجري وتمارين بطن مع شروق الشمس. لكل المستويات — المدرب بيظبط كل حركة على مستواك.',
    city: 'Cairo', venue: 'Al Azhar Park', venueAr: 'حديقة الأزهر',
    date: inDays(6), time: '6:00 AM', price: '150 EGP',
    sponsored: true, featured: true,
  },
  {
    partnerMatch: 'IronHouse',
    kind: 'class',
    title: 'Women-only strength class',
    titleAr: 'حصة حديد للسيدات',
    description: 'A closed session for women with a female coach. Barbell basics: squat, hinge, press. Beginners welcome.',
    descriptionAr: 'حصة مغلقة للسيدات مع مدربة. أساسيات البار: سكوات، ديدليفت، ضغط. المبتدئات مرحب بيهم.',
    city: 'Cairo', venue: 'IronHouse Nasr City', venueAr: 'أيرون هاوس مدينة نصر',
    date: inDays(3), time: '7:00 PM', price: 'Free for members',
    featured: true,
  },
  {
    kind: 'race',
    title: 'PULSE 5K Community Run',
    titleAr: 'جري ٥ كيلو مع PULSE',
    description: 'Our monthly community run. Walk it, jog it or race it — everyone finishes together and breakfast is on us.',
    descriptionAr: 'الجري الشهري بتاعنا. امشيها أو اجريها زي ما تحب — كلنا بنخلص مع بعض والفطار علينا.',
    city: 'Cairo', venue: 'Nile Corniche, Maadi', venueAr: 'كورنيش النيل، المعادي',
    date: inDays(12), time: '7:30 AM', price: 'Free',
  },
  {
    partnerMatch: 'NutriPower',
    kind: 'workshop',
    title: 'Meal prep workshop: a week in two hours',
    titleAr: 'ورشة تحضير الأكل: أسبوع في ساعتين',
    description: 'Cook, portion and store five days of meals in one session. You leave with the food and the shopping list.',
    descriptionAr: 'اطبخ وقسّم وخزّن أكل ٥ أيام في جلسة واحدة. هتمشي ومعاك الأكل وليستة المشتريات.',
    city: 'Cairo', venue: 'NutriPower Kitchen, Zamalek', venueAr: 'مطبخ نيوتري باور، الزمالك',
    date: inDays(9), time: '5:00 PM', price: '300 EGP',
    sponsored: true,
  },
  {
    kind: 'open_day',
    title: 'Alexandria beach workout day',
    titleAr: 'يوم تمرين على بحر إسكندرية',
    description: 'Sand sprints, bodyweight circuits and a swim to finish. Bring water and a towel — that is the whole kit list.',
    descriptionAr: 'جري على الرملة وتمارين وزن الجسم وسباحة في الآخر. هات مياه وفوطة وبس.',
    city: 'Alexandria', venue: 'Stanley Beach', venueAr: 'شاطئ ستانلي',
    date: inDays(18), time: '8:00 AM', price: 'Free',
  },
  {
    kind: 'class',
    title: 'Sunset yoga on the roof',
    titleAr: 'يوجا الغروب على السطح',
    description: 'Slow flow and breath work with the city underneath you. Mats provided, no experience needed.',
    descriptionAr: 'حركات هادية وتمارين تنفس والمدينة تحتيك. المراتب موجودة ومش محتاج خبرة.',
    city: 'Cairo', venue: 'Zamalek Rooftop Studio', venueAr: 'استوديو السطح، الزمالك',
    date: inDays(4), time: '6:30 PM', price: '200 EGP',
  },
];

async function run() {
  const partners = await prisma.partner.findMany({ select: { id: true, name: true } });
  const findPartner = (match?: string) =>
    match ? partners.find((p) => p.name.toLowerCase().includes(match.toLowerCase()))?.id : undefined;

  let forms = 0;
  for (const { partnerMatch, ...data } of LEAD_FORMS) {
    const partnerId = findPartner(partnerMatch);
    if (!partnerId) {
      console.warn(`  skipped lead form "${data.title}" — no partner matching "${partnerMatch}"`);
      continue;
    }
    const existing = await prisma.partnerLeadForm.findFirst({ where: { title: data.title } });
    if (existing) await prisma.partnerLeadForm.update({ where: { id: existing.id }, data: { ...data, partnerId } });
    else await prisma.partnerLeadForm.create({ data: { ...data, partnerId } });
    forms++;
  }

  let events = 0;
  for (const { partnerMatch, ...data } of EVENTS) {
    const partnerId = findPartner(partnerMatch) ?? null;
    const existing = await prisma.fitEvent.findFirst({ where: { title: data.title } });
    if (existing) await prisma.fitEvent.update({ where: { id: existing.id }, data: { ...data, partnerId } });
    else await prisma.fitEvent.create({ data: { ...data, partnerId } });
    events++;
  }

  console.log(`Seeded ${forms} lead forms and ${events} events.`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
