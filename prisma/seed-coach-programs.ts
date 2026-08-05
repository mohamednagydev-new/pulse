/** A starter program (with lessons) for every coach that has none. Idempotent.
 *  Run: npx tsx prisma/seed-coach-programs.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type L = { title: string; titleAr: string; description: string; descriptionAr: string; durationSec: number };
const mk = (title: string, titleAr: string, description: string, descriptionAr: string, min: number): L =>
  ({ title, titleAr, description, descriptionAr, durationSec: min * 60 });

/** Program templates keyed by coach type — picked round-robin so coaches differ. */
const WORKOUT_PROGRAMS = [
  {
    title: 'Foundations of Strength', titleAr: 'أساسيات القوة', level: 'BEGINNER',
    description: 'Six sessions that teach the core lifts properly before you add weight. Build the habit and the technique together.',
    descriptionAr: 'ست حصص بتعلمك التمارين الأساسية صح قبل ما تزوّد الأوزان. تبني العادة والأداء مع بعض.',
    reelKeyword: 'beginner strength workout',
    lessons: [
      mk('Day 1 — Squat Basics', 'اليوم ١ — أساسيات السكوات', 'Learn the squat pattern with bodyweight, then light load.', 'اتعلم حركة السكوات بوزن جسمك، وبعدين وزن خفيف.', 25),
      mk('Day 2 — Push Basics', 'اليوم ٢ — أساسيات الدفع', 'Push-ups and pressing mechanics for a strong chest and shoulders.', 'الضغط وميكانيكا الدفع لصدر وكتاف أقوى.', 25),
      mk('Day 3 — Pull Basics', 'اليوم ٣ — أساسيات السحب', 'Rows and pulls that build a healthy, strong back.', 'السحب والرو اللي بيبني ضهر قوي وسليم.', 25),
      mk('Day 4 — Hinge & Core', 'اليوم ٤ — الهينج والكور', 'Hip hinge mechanics plus a simple, effective core circuit.', 'حركة الهينج مع دائرة بطن بسيطة وفعالة.', 30),
      mk('Day 5 — Full Body Flow', 'اليوم ٥ — تمرين شامل', 'Everything you learned, combined into one full session.', 'كل اللي اتعلمته في حصة واحدة كاملة.', 35),
      mk('Day 6 — Test & Reset', 'اليوم ٦ — قياس وراحة', 'Log your numbers, then a mobility cool-down.', 'سجّل أرقامك وبعدين تهدئة ومرونة.', 20),
    ],
  },
  {
    title: '4-Week Fat Loss Circuit', titleAr: 'دائرة حرق الدهون ٤ أسابيع', level: 'INTERMEDIATE',
    description: 'High-intensity circuits that burn calories and keep your muscle. Short sessions, big output.',
    descriptionAr: 'دوائر عالية الشدة بتحرق سعرات وبتحافظ على عضلاتك. حصص قصيرة ومجهود كبير.',
    reelKeyword: 'fat burning workout',
    lessons: [
      mk('Week 1 — Ignite', 'الأسبوع ١ — الإشعال', 'Full-body circuit to wake the engine up.', 'دائرة لكل الجسم توقّظ الجسم.', 30),
      mk('Week 2 — Push Harder', 'الأسبوع ٢ — اضغط أكتر', 'Shorter rest, more rounds.', 'راحة أقل ولفّات أكتر.', 30),
      mk('Week 3 — Metabolic Peak', 'الأسبوع ٣ — ذروة الحرق', 'The toughest week — maximum calorie burn.', 'أصعب أسبوع — أقصى حرق.', 35),
      mk('Week 4 — Finish Strong', 'الأسبوع ٤ — اقفل بقوة', 'Consolidate everything and measure your progress.', 'ثبّت كل حاجة وقيس تقدمك.', 30),
    ],
  },
  {
    title: 'Home Body — No Equipment', titleAr: 'تمرين البيت — بدون أدوات', level: 'BEGINNER',
    description: 'A complete plan using nothing but your bodyweight and a small patch of floor.',
    descriptionAr: 'خطة كاملة بوزن جسمك بس وشوية مساحة على الأرض.',
    reelKeyword: 'home workout no equipment',
    lessons: [
      mk('Session 1 — Upper Body', 'الحصة ١ — الجزء العلوي', 'Push-ups, dips and core, no gear needed.', 'ضغط وديبس وبطن، من غير أي أدوات.', 20),
      mk('Session 2 — Lower Body', 'الحصة ٢ — الجزء السفلي', 'Squats, lunges and glute work at home.', 'سكوات ولانجز وتمارين المؤخرة في البيت.', 20),
      mk('Session 3 — Core & Cardio', 'الحصة ٣ — بطن وكارديو', 'Burn and strengthen in one short session.', 'حرق وتقوية في حصة قصيرة.', 20),
      mk('Session 4 — Full Body Burnout', 'الحصة ٤ — إجهاد شامل', 'Everything together, no rest days needed.', 'كل حاجة مع بعض، من غير راحة.', 25),
    ],
  },
];

const YOGA_PROGRAMS = [
  {
    title: '7 Days of Calm', titleAr: '٧ أيام هدوء', level: 'BEGINNER',
    description: 'A gentle week of breath-led movement to release tension and rebuild mobility.',
    descriptionAr: 'أسبوع لطيف من الحركة مع النفس عشان يفك التوتر ويرجّع مرونتك.',
    reelKeyword: 'yoga for beginners',
    lessons: [
      mk('Day 1 — Settle In', 'اليوم ١ — استقرار', 'Slow breathing and grounding poses.', 'تنفس بطيء ووضعيات تثبيت.', 15),
      mk('Day 2 — Open the Spine', 'اليوم ٢ — افتح ضهرك', 'Cat-cow, twists and gentle backbends.', 'القطة والبقرة واللف وانحناءات لطيفة.', 18),
      mk('Day 3 — Hips Release', 'اليوم ٣ — فك الورك', 'Deep hip openers for desk-tight bodies.', 'فتح عميق للورك للي قاعد كتير.', 20),
      mk('Day 4 — Heart & Breath', 'اليوم ٤ — الصدر والنفس', 'Chest opening with steady breathing.', 'فتح الصدر مع نفس ثابت.', 18),
      mk('Day 5 — Balance', 'اليوم ٥ — توازن', 'Standing balance to build focus.', 'توازن واقف يبني تركيزك.', 20),
      mk('Day 6 — Full Flow', 'اليوم ٦ — تدفق كامل', 'Link it all into one flowing sequence.', 'اربط كل حاجة في سلسلة متدفقة.', 25),
      mk('Day 7 — Deep Rest', 'اليوم ٧ — راحة عميقة', 'Long restorative holds and relaxation.', 'وضعيات استرخاء طويلة وراحة.', 20),
    ],
  },
  {
    title: 'Sleep & Stress Reset', titleAr: 'إعادة ضبط النوم والتوتر', level: 'BEGINNER',
    description: 'Short evening practices that calm the nervous system and prepare you for real rest.',
    descriptionAr: 'تمارين مسائية قصيرة بتهدّي أعصابك وتجهزك لنوم حقيقي.',
    reelKeyword: 'yoga for sleep',
    lessons: [
      mk('Evening 1 — Unwind', 'مسا ١ — فك التوتر', 'Release the day from your shoulders and neck.', 'فك تعب اليوم من كتافك ورقبتك.', 15),
      mk('Evening 2 — Legs Up', 'مسا ٢ — الرجلين لفوق', 'Restorative inversion for tired legs.', 'وضعية استرخاء للرجلين التعبانة.', 15),
      mk('Evening 3 — Breathe Down', 'مسا ٣ — نفس هادي', 'Slow breathing to drop your heart rate.', 'تنفس بطيء يهدّي نبضك.', 12),
      mk('Evening 4 — Full Body Rest', 'مسا ٤ — راحة كاملة', 'A guided full-body relaxation before bed.', 'استرخاء كامل موجّه قبل النوم.', 20),
    ],
  },
  {
    title: 'Mobility for Lifters', titleAr: 'مرونة لرافعي الأوزان', level: 'INTERMEDIATE',
    description: 'Targeted mobility that improves your squat depth, overhead position and recovery.',
    descriptionAr: 'مرونة مركّزة بتحسّن نزولك في السكوات ووضعك فوق الراس واستشفاءك.',
    reelKeyword: 'mobility stretching',
    lessons: [
      mk('Mobility 1 — Hips & Ankles', 'مرونة ١ — الورك والكاحل', 'Fix the two things limiting your squat.', 'صلّح الحاجتين اللي بيحدّدوا سكواتك.', 20),
      mk('Mobility 2 — Shoulders', 'مرونة ٢ — الأكتاف', 'Overhead position without pain.', 'وضع فوق الراس من غير ألم.', 20),
      mk('Mobility 3 — Spine & Core', 'مرونة ٣ — الضهر والكور', 'Rotation and bracing for heavy lifts.', 'اللف والتثبيت للأوزان التقيلة.', 18),
      mk('Mobility 4 — Recovery Flow', 'مرونة ٤ — تدفق الاستشفاء', 'A full flow for rest days.', 'تدفق كامل لأيام الراحة.', 25),
    ],
  },
];

async function run() {
  const coaches = await prisma.coach.findMany({ include: { _count: { select: { programs: true } } }, orderBy: { order: 'asc' } });
  let p = 0, l = 0;
  let wi = 0, yi = 0;

  for (const coach of coaches) {
    if (coach._count.programs > 0) continue; // already has content
    const pool = coach.type === 'YOGA' ? YOGA_PROGRAMS : WORKOUT_PROGRAMS;
    const tpl = pool[(coach.type === 'YOGA' ? yi++ : wi++) % pool.length];

    const program = await prisma.program.create({
      data: {
        coachId: coach.id,
        title: tpl.title,
        titleAr: tpl.titleAr,
        description: tpl.description,
        descriptionAr: tpl.descriptionAr,
        level: tpl.level,
        reelKeyword: tpl.reelKeyword,
        order: 0,
      },
    });
    p++;
    for (let i = 0; i < tpl.lessons.length; i++) {
      const ls = tpl.lessons[i];
      await prisma.lesson.create({
        data: {
          programId: program.id,
          title: ls.title,
          titleAr: ls.titleAr,
          description: ls.description,
          descriptionAr: ls.descriptionAr,
          durationSec: ls.durationSec,
          reelKeyword: `${tpl.reelKeyword}`,
          order: i,
        },
      });
      l++;
    }
  }
  console.log(`+${p} programs, +${l} lessons across ${coaches.length} coaches`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
