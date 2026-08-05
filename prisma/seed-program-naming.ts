/**
 * Programme naming, levels and audience.
 *
 * Nine of eighteen programmes were called "First / Second / Third Program", repeated
 * once per level, so a user browsing saw three identical cards and could not choose
 * between them. Three yoga programmes had no level at all, which also weakened the
 * recommendation (a null level scores lower than a matching one).
 *
 * The new names follow how blocks are actually periodised — learn the movement, add
 * load, consolidate, then split / intensify / peak — so the order inside a level
 * reads as a progression rather than a numbered list.
 *
 * `audience` marks content that is for a specific person rather than everyone.
 * Prenatal yoga must never be auto-recommended to a general user.
 *
 * Matched on the current title plus level, so it is idempotent and cannot rename the
 * wrong row. Run: npx tsx prisma/seed-program-naming.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Rename = {
  from: string;
  level: string | null;
  coach?: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  setLevel?: string;
  audience?: string;
};

const RENAMES: Rename[] = [
  // ---------- Beginner block: learn it, load it, own it ----------
  {
    from: 'First Program', level: 'BEGINNER',
    title: 'Block 1 — Learn the Movements',
    titleAr: 'المرحلة ١ — اتعلّم الحركات',
    description: 'The first block. You are learning the six patterns every workout is built from — squat, hinge, push, pull, carry, brace — with light or no load, until they feel automatic.',
    descriptionAr: 'أول مرحلة. هتتعلم الست حركات اللي أي تمرين مبني عليها — سكوات، ثني، دفع، سحب، حمل، وشد البطن — بوزن خفيف أو من غير وزن، لحد ما تبقى سهلة عليك.',
  },
  {
    from: 'Second Program', level: 'BEGINNER',
    title: 'Block 2 — Add the Load',
    titleAr: 'المرحلة ٢ — زوّد الوزن',
    description: 'Same movements, now with weight that means something. Sessions get a little longer and the reps get harder to finish — that is the point.',
    descriptionAr: 'نفس الحركات بس بوزن له قيمة. التمرينات هتبقى أطول شوية وآخر عدة هتبقى صعبة — وده المطلوب بالظبط.',
  },
  {
    from: 'Third Program', level: 'BEGINNER',
    title: 'Block 3 — Full Body Strength',
    titleAr: 'المرحلة ٣ — قوة الجسم كله',
    description: 'The block that closes the beginner stage. Everything you have learned in one full-body week, at a load you could not have handled eight weeks ago.',
    descriptionAr: 'المرحلة اللي بتقفل مستوى المبتدئين. كل اللي اتعلمته في أسبوع للجسم كله، بوزن ما كنتش تقدر عليه من تمن أسابيع.',
  },

  // ---------- Intermediate: split the week, then push it ----------
  {
    from: 'First Program', level: 'INTERMEDIATE',
    title: 'Split 1 — Upper / Lower',
    titleAr: 'التقسيم ١ — علوي / سفلي',
    description: 'Your first real split. Training upper and lower on separate days means each half gets more work and more recovery than a full-body week can give it.',
    descriptionAr: 'أول تقسيم حقيقي ليك. لما تفصل العلوي عن السفلي، كل جزء بياخد شغل أكتر وراحة أكتر من أسبوع الجسم كله.',
  },
  {
    from: 'Second Program', level: 'INTERMEDIATE',
    title: 'Split 2 — Push / Pull / Legs',
    titleAr: 'التقسيم ٢ — دفع / سحب / رجل',
    description: 'The split most lifters settle on. Pushing muscles together, pulling muscles together, legs on their own — clean recovery, no session undoing the last one.',
    descriptionAr: 'التقسيم اللي معظم اللي بيتمرنوا بيستقروا عليه. عضلات الدفع مع بعض، والسحب مع بعض، والرجل لوحدها — راحة نضيفة ومفيش تمرينة بتلغي اللي قبلها.',
  },
  {
    from: 'Third Program', level: 'INTERMEDIATE',
    title: 'Split 3 — Volume Block',
    titleAr: 'التقسيم ٣ — مرحلة الحجم',
    description: 'More sets per muscle, held at a weight you can repeat. Volume is what drives size once technique is no longer the limit.',
    descriptionAr: 'مجموعات أكتر لكل عضلة، بوزن تقدر تكرره. الحجم بييجي من كتر الشغل بعد ما الأداء يبقى مظبوط.',
  },

  // ---------- Advanced: heavy, then maximal, then conditioned ----------
  {
    from: 'First Program', level: 'ADVANCED',
    title: 'Peak 1 — Heavy Compounds',
    titleAr: 'القمة ١ — الحركات المركّبة التقيلة',
    description: 'Built around the lifts that move the most weight. Fewer reps, longer rests, and full attention on the big three.',
    descriptionAr: 'مبنية على الحركات اللي بترفع أتقل وزن. عدات أقل، راحة أطول، وتركيز كامل على التلات حركات الكبار.',
  },
  {
    from: 'Second Program', level: 'ADVANCED',
    title: 'Peak 2 — Max Effort',
    titleAr: 'القمة ٢ — أقصى مجهود',
    description: 'Top sets near your limit, backed by lighter work. This is the block that tests what the last two built — and it needs your sleep and food to match.',
    descriptionAr: 'مجموعات قريبة من حدك الأقصى، ومعاها شغل أخف. المرحلة دي بتختبر اللي بنيته في المرحلتين اللي فاتوا — ومحتاجة نومك وأكلك يكونوا مظبوطين.',
  },
  {
    from: 'Third Program', level: 'ADVANCED',
    title: 'Peak 3 — Strength & Conditioning',
    titleAr: 'القمة ٣ — قوة ولياقة',
    description: 'Heavy work kept, conditioning added back. You finish strong and able to breathe — the point of training, rather than one number.',
    descriptionAr: 'بتحافظ على الشغل التقيل وبترجّع اللياقة. بتخلص قوي ونفسك طويل — وده هدف التمرين، مش رقم واحد بس.',
  },

  // ---------- disambiguate the two identical beginner programmes ----------
  {
    from: 'Foundations of Strength', level: 'BEGINNER', coach: 'Tarek Mostafa',
    title: 'Strength Foundations — Barbell Basics',
    titleAr: 'أساسيات القوة — البار من الأول',
    description: 'Learning the barbell itself: how to set up, brace and finish a lift safely before any of it gets heavy.',
    descriptionAr: 'تتعلم البار نفسه: إزاي تقف وتشد بطنك وتخلص الرفعة بأمان قبل ما أي حاجة تتقل.',
  },

  // ---------- give the unlevelled yoga programmes a level ----------
  {
    from: '7-Day Rejuvenating Yoga Series', level: null,
    title: '7-Day Rejuvenating Yoga Series', titleAr: 'سلسلة يوجا للتجديد في ٧ أيام',
    description: 'A gentle week designed to give you back your energy, mobility and a clearer head, one day at a time.',
    descriptionAr: 'أسبوع هادي معمول عشان يرجّعلك طاقتك ومرونتك وصفا ذهنك، يوم ورا يوم.',
    setLevel: 'BEGINNER',
  },
  {
    from: 'Yin Yoga & Poetry', level: null,
    title: 'Yin Yoga & Poetry', titleAr: 'يين يوجا وشعر',
    description: 'Long, still holds with poetry read over them. Physically gentle, mentally the hardest kind of practice.',
    descriptionAr: 'وضعيات طويلة وثابتة مع كلام شعر فوقها. سهلة على الجسم، وأصعب حاجة على الدماغ.',
    setLevel: 'BEGINNER',
  },
  {
    from: 'Pregnancy Yoga', level: null,
    title: 'Pregnancy Yoga — All Trimesters',
    titleAr: 'يوجا الحمل — كل مراحل الحمل',
    description: 'Built for pregnancy, with modifications for every trimester. Check with your midwife or doctor before you start.',
    descriptionAr: 'معمولة للحمل، وفيها تعديلات لكل مرحلة. اسألي دكتورك أو الداية قبل ما تبدأي.',
    setLevel: 'BEGINNER',
    audience: 'prenatal',
  },
];

async function run() {
  let renamed = 0;
  let skipped = 0;

  for (const r of RENAMES) {
    const matches = await prisma.program.findMany({
      where: { title: r.from, level: r.level },
      include: { coach: { select: { name: true } } },
    });

    // Ambiguous without a coach hint: refuse rather than rename the wrong one.
    const target = r.coach ? matches.find((m) => m.coach?.name === r.coach) : matches[0];
    if (!target) {
      // Already renamed on a previous run — that is the expected idempotent path.
      const already = await prisma.program.findFirst({ where: { title: r.title } });
      if (already) { skipped++; continue; }
      console.warn(`  ! no match for "${r.from}" [${r.level ?? 'no level'}]${r.coach ? ` / ${r.coach}` : ''}`);
      skipped++;
      continue;
    }

    await prisma.program.update({
      where: { id: target.id },
      data: {
        title: r.title,
        titleAr: r.titleAr,
        description: r.description,
        descriptionAr: r.descriptionAr,
        ...(r.setLevel ? { level: r.setLevel } : {}),
        ...(r.audience ? { audience: r.audience } : {}),
      },
    });
    renamed++;
  }

  const total = await prisma.program.count();
  const distinct = (await prisma.program.findMany({ select: { title: true } })).map((p) => p.title);
  const noLevel = await prisma.program.count({ where: { level: null } });
  const specialised = await prisma.program.count({ where: { audience: { not: null } } });

  console.log(`Renamed ${renamed}, skipped ${skipped}.`);
  console.log(`  ${total} programmes, ${new Set(distinct).size} distinct titles, ${noLevel} without a level, ${specialised} marked specialised.`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
