/** Demo partners + store products (catalog only — orders happen offline).
 *  Idempotent. Run: npx tsx prisma/seed-partners.ts
 *  DELETE these once real sponsors are onboarded (they're marked "Demo" in the name). */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PARTNERS = [
  {
    name: 'NutriPower (Demo)', nameAr: 'نيوتري باور (تجريبي)', type: 'store',
    tagline: 'Supplements that actually work', taglineAr: 'مكملات بتفرق فعلاً',
    description: 'Certified whey, creatine and vitamins with delivery across Egypt.',
    descriptionAr: 'واي بروتين وكرياتين وفيتامينات معتمدة مع توصيل لكل مصر.',
    city: 'Cairo', whatsapp: '201000000001', phone: '+201000000001', website: 'https://example.com',
    featured: true, order: 0,
    products: [
      { category: 'supplements', title: 'Whey Protein 2kg', titleAr: 'واي بروتين ٢ كجم', price: '1,450 EGP', oldPrice: '1,700 EGP', badge: '-15%', description: '24g protein per scoop, chocolate & vanilla.', descriptionAr: '٢٤ جرام بروتين للسكوب، شوكولاتة وفانيليا.' },
      { category: 'supplements', title: 'Creatine Monohydrate 300g', titleAr: 'كرياتين مونوهيدرات ٣٠٠ جم', price: '650 EGP', description: 'Pure micronized creatine, 60 servings.', descriptionAr: 'كرياتين نقي مطحون، ٦٠ جرعة.' },
      { category: 'food', title: 'Protein Bars (box of 12)', titleAr: 'بروتين بار (علبة ١٢)', price: '480 EGP', description: '20g protein, low sugar.', descriptionAr: '٢٠ جرام بروتين وسكر قليل.' },
    ],
  },
  {
    name: 'IronHouse Gym (Demo)', nameAr: 'أيرون هاوس جيم (تجريبي)', type: 'gym',
    tagline: 'Train with real coaches', taglineAr: 'اتمرن مع مدربين محترفين',
    description: 'Fully equipped gym with certified trainers, group classes and a women-only section.',
    descriptionAr: 'جيم مجهز بالكامل بمدربين معتمدين وحصص جماعية وقسم للسيدات.',
    city: 'Giza', whatsapp: '201000000002', phone: '+201000000002', mapUrl: 'https://maps.google.com',
    featured: true, order: 1,
    products: [
      { category: 'membership', title: '1-Month Membership', titleAr: 'اشتراك شهر', price: '600 EGP', description: 'Full access, all equipment and classes.', descriptionAr: 'دخول كامل لكل الأجهزة والحصص.' },
      { category: 'membership', title: '3-Month Membership', titleAr: 'اشتراك ٣ شهور', price: '1,500 EGP', oldPrice: '1,800 EGP', badge: 'Best value', description: 'Save 300 EGP + one free PT session.', descriptionAr: 'وفّر ٣٠٠ جنيه + حصة تدريب شخصي مجاناً.' },
      { category: 'service', title: 'Personal Training (8 sessions)', titleAr: 'تدريب شخصي (٨ حصص)', price: '2,000 EGP', description: 'One-on-one with a certified coach.', descriptionAr: 'واحد لواحد مع مدرب معتمد.' },
    ],
  },
  {
    name: 'FitGear Store (Demo)', nameAr: 'فيت جير (تجريبي)', type: 'store',
    tagline: 'Home gym equipment', taglineAr: 'أدوات جيم للبيت',
    description: 'Dumbbells, resistance bands, mats and everything for a home setup.',
    descriptionAr: 'دمبل وأستك مقاومة ومراتب وكل حاجة للتمرين في البيت.',
    city: 'Alexandria', whatsapp: '201000000003', website: 'https://example.com', instagram: 'https://instagram.com',
    order: 2,
    products: [
      { category: 'equipment', title: 'Adjustable Dumbbell Set', titleAr: 'طقم دمبل قابل للتعديل', price: '2,300 EGP', badge: 'New', description: '2×24kg, quick-change plates.', descriptionAr: '٢×٢٤ كجم، أوزان سريعة التغيير.' },
      { category: 'equipment', title: 'Resistance Bands (5 levels)', titleAr: 'أستك مقاومة (٥ مستويات)', price: '320 EGP', description: 'Light to extra-heavy, with handles.', descriptionAr: 'من الخفيف للتقيل جداً، بمقابض.' },
      { category: 'wear', title: 'Training Shoes', titleAr: 'حذاء تمرين', price: '1,100 EGP', description: 'Flat sole, built for lifting.', descriptionAr: 'نعل مستوي معمول لرفع الأوزان.' },
    ],
  },
];

async function run() {
  let p = 0, pr = 0;
  for (const data of PARTNERS) {
    const { products, ...partner } = data;
    const exists = await prisma.partner.findFirst({ where: { name: partner.name } });
    if (exists) continue;
    const created = await prisma.partner.create({ data: partner });
    p++;
    for (let i = 0; i < products.length; i++) {
      await prisma.partnerProduct.create({ data: { ...products[i], partnerId: created.id, order: i } });
      pr++;
    }
  }
  console.log(`partners seeded: +${p} partners, +${pr} products (demo data — delete from admin once real sponsors join)`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });

/** Demo deals attached to the demo partners (run after the partners above). */
export async function seedDeals() {
  const db = new PrismaClient();
  const dstr = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const DEALS = [
    { partnerName: 'NutriPower (Demo)', title: '20% off your first order', titleAr: 'خصم ٢٠٪ على أول طلب', description: 'Valid on all supplements. Show this code at checkout.', descriptionAr: 'ساري على كل المكملات. ورّي الكود عند الدفع.', discount: '20% off', code: 'PULSE20', validUntil: dstr(60), order: 0 },
    { partnerName: 'IronHouse Gym (Demo)', title: 'Free week trial', titleAr: 'أسبوع تجريبي مجاني', description: 'Show this code at reception for a free 7-day pass.', descriptionAr: 'ورّي الكود في الاستقبال وخد أسبوع مجاني.', discount: 'FREE week', code: 'PULSEWEEK', validUntil: dstr(45), order: 1 },
    { partnerName: 'FitGear Store (Demo)', title: '15% off home equipment', titleAr: 'خصم ١٥٪ على أدوات البيت', description: 'Dumbbells, bands and mats included.', descriptionAr: 'شامل الدمبل والأستك والمراتب.', discount: '15% off', code: 'PULSEGEAR', validUntil: dstr(30), order: 2 },
  ];
  let n = 0;
  for (const d of DEALS) {
    const { partnerName, ...deal } = d;
    const partner = await db.partner.findFirst({ where: { name: partnerName } });
    if (!partner) continue;
    const exists = await db.partnerDeal.findFirst({ where: { title: deal.title, partnerId: partner.id } });
    if (exists) continue;
    await db.partnerDeal.create({ data: { ...deal, partnerId: partner.id } });
    n++;
  }
  console.log(`deals seeded: +${n}`);
  await db.$disconnect();
}
seedDeals().catch(() => {});
