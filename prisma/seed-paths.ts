/**
 * Seeds the 5 new content paths (YouTube follow-along embeds, link-don't-copy):
 * running C25K, desk-pain relief, postpartum, family workouts, football fitness.
 * Idempotent — upserts programs by title, wipes+rewrites their lessons.
 *
 * Local:  node node_modules/tsx/dist/cli.mjs prisma/seed-paths.ts
 * Server: & "C:\Program Files\nodejs\node.exe" node_modules\tsx\dist\cli.mjs prisma\seed-paths.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type L = { t: string; ta: string; d: string; da: string; url: string; reel?: string };
type P = {
  title: string; titleAr: string; description: string; descriptionAr: string;
  level: string; order: number; audience?: string; reelKeyword?: string; lessons: L[];
};

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const PROGRAMS: P[] = [
  {
    title: 'Couch to 5K — Start Running',
    titleAr: 'من الكنبة لـ٥ كيلو 🏃',
    description: 'Six progressive walk-run sessions that turn a non-runner into a runner. No equipment — a street or a treadmill.',
    descriptionAr: 'ست جلسات مشي وجري متدرجة تحوّلك من شخص مبيجريش لعدّاء. من غير أي أجهزة — شارع أو مشاية.',
    level: 'BEGINNER', order: 60, reelKeyword: 'beginner running',
    lessons: [
      { t: 'Week 1 — Walk more, run a little', ta: 'الأسبوع ١ — امشي كتير واجري شوية', d: 'Warm up 5 min walking, then 8 rounds: 1 min easy jog + 1.5 min walk. Follow the video pace.', da: 'سخّن ٥ دقايق مشي، بعدين ٨ مرات: دقيقة هرولة خفيفة + دقيقة ونص مشي. امشي مع الفيديو.', url: yt('SfckkC4w5Qk') },
      { t: 'Week 2 — Longer runs', ta: 'الأسبوع ٢ — جري أطول', d: 'Warm up 5 min, then 6 rounds: 1.5 min jog + 2 min walk. Breathe through your nose when you can.', da: 'تسخين ٥ دقايق، بعدين ٦ مرات: دقيقة ونص جري + دقيقتين مشي. حاول تتنفس من مناخيرك.', url: yt('pHhmDApq10s') },
      { t: 'Week 3 — Finding rhythm', ta: 'الأسبوع ٣ — بتلاقي إيقاعك', d: 'Two blocks of: 1.5 min jog, 1.5 min walk, 3 min jog, 3 min walk. The 3 minutes is the new step.', da: 'مجموعتين من: دقيقة ونص جري، دقيقة ونص مشي، ٣ دقايق جري، ٣ دقايق مشي. الـ٣ دقايق هي الخطوة الجديدة.', url: yt('ik31OZR5SEY') },
      { t: 'Steady 20 — run & walk', ta: 'عشرين دقيقة ثابتة — جري ومشي', d: 'A full 20-minute guided run/walk session. Let the coach set the pace.', da: 'جلسة ٢٠ دقيقة كاملة جري ومشي بمتابعة المدرب. سيب السرعة عليه.', url: yt('qR4BTLwSKMs') },
      { t: 'Intervals — get faster', ta: 'فترات — اجري أسرع', d: 'Walk-run intervals designed to nudge your pace up safely.', da: 'فترات مشي وجري معمولة عشان ترفع سرعتك بأمان.', url: yt('LZVODZ3HTmY') },
      { t: 'Beginner HIIT run', ta: 'هيت جري للمبتدئين', d: 'Short bursts, real rest. The session that makes normal jogging feel easy.', da: 'اندفاعات قصيرة وراحة حقيقية. الجلسة اللي هتخلي الجري العادي يحس سهل.', url: yt('BrliNdYmRVQ') },
    ],
  },
  {
    title: 'Desk Relief — Neck & Back',
    titleAr: 'ضهرك ورقبتك 🪑',
    description: 'Ten-minute routines that undo a day at the desk: neck, shoulders, lower back, hips.',
    descriptionAr: 'روتينات ١٠ دقايق تصلّح اللي بيعمله المكتب فيك: رقبة، أكتاف، أسفل الضهر، ووسط.',
    level: 'BEGINNER', order: 61, reelKeyword: 'desk stretches',
    lessons: [
      { t: 'Fast neck relief (5 min)', ta: 'راحة سريعة للرقبة (٥ دقايق)', d: 'Follow-along stretches that release neck tension right at your desk.', da: 'إطالات بالمتابعة بتسيّب شد الرقبة وانت قاعد على مكتبك.', url: yt('T64es5lGZr8') },
      { t: 'Neck, shoulders & upper back', ta: 'رقبة وأكتاف وأعلى الضهر', d: 'Ten gentle minutes for the whole upper chain.', da: 'عشر دقايق هادية لسلسلة الجزء العلوي كلها.', url: yt('fTRv8dEgK3I') },
      { t: 'Chair yoga at your desk', ta: 'يوجا الكرسي على مكتبك', d: 'No mat, no changing clothes — release shoulders and neck from the chair.', da: 'من غير مرتبة ولا هدوم تمرين — سيّب أكتافك ورقبتك من على الكرسي.', url: yt('5JqV9okL5xY') },
      { t: 'The office worker top 10', ta: 'أهم ١٠ إطالات للمكتبيين', d: 'The ten stretches every desk worker should do daily: neck to wrists.', da: 'أهم عشر إطالات لازم أي حد بيشتغل مكتب يعملها يوميًا: من الرقبة للرسغ.', url: yt('w1INfs260DY') },
      { t: 'Spine reset (10 min)', ta: 'إعادة ضبط العمود الفقري (١٠ دقايق)', d: 'A quick spine mobility flow to break up long sitting.', da: 'تدفق سريع لمرونة العمود الفقري يقطع القعدة الطويلة.', url: yt('zeeEALGS-p0') },
      { t: 'Lower back relief', ta: 'راحة أسفل الضهر', d: 'Follow-along routine targeting the lower back after long sitting days.', da: 'روتين بالمتابعة مركّز على أسفل الضهر بعد أيام القعدة الطويلة.', url: yt('sPvUeSKnbRo') },
    ],
  },
  {
    title: 'After Baby — Gentle Comeback',
    titleAr: 'بعد الولادة — رجوع هادي 🤱',
    description: 'Doctor-cleared moms only: rebuild the deep core and pelvic floor safely, ten minutes at a time.',
    descriptionAr: 'بعد إذن الدكتور: ابني عضلات البطن العميقة وقاع الحوض بأمان، عشر دقايق كل مرة.',
    level: 'BEGINNER', order: 62, audience: 'postnatal', reelKeyword: 'postpartum workout',
    lessons: [
      { t: 'Postpartum core — day one', ta: 'بطن ما بعد الولادة — البداية', d: 'Five beginner recovery exercises, diastasis-safe, no equipment.', da: 'خمس تمرينات استشفاء للمبتدئات، آمنة لانفصال عضلات البطن، من غير أجهزة.', url: yt('u3XXc_cTYJU') },
      { t: 'Pelvic floor basics', ta: 'أساسيات قاع الحوض', d: 'Connect to and strengthen the pelvic floor — the foundation everything sits on.', da: 'اتعرفي على عضلات قاع الحوض وقوّيها — الأساس اللي كل حاجة قاعدة عليه.', url: yt('mnRMQI8awMs') },
      { t: 'Daily core + pelvic floor', ta: 'روتين يومي للبطن وقاع الحوض', d: 'A short daily practice that treats the core as one unit.', da: 'ممارسة يومية قصيرة بتتعامل مع البطن كوحدة واحدة.', url: yt('NuHjGPNruzQ') },
      { t: 'Abs after baby', ta: 'بطن بعد البيبي', d: 'Eight diastasis-safe ab exercises to rebuild from the inside.', da: 'تماني تمرينات بطن آمنة لإعادة البناء من جوه.', url: yt('u4z7sBiGFA8') },
      { t: 'Diastasis repair — beginner', ta: 'إصلاح انفصال البطن — مبتدئ', d: 'The structured repair session: heal first, strengthen second.', da: 'جلسة الإصلاح المنظمة: اشفي الأول وقوّي بعدين.', url: yt('1WlKyHGxOTY') },
      { t: 'Deep core — 10 minutes', ta: 'البطن العميقة — ١٠ دقايق', d: 'No equipment deep-core finisher once the basics feel comfortable.', da: 'ختام للبطن العميقة من غير أجهزة لما الأساسيات تبقى مريحة.', url: yt('i9cy2fSlKKU') },
    ],
  },
  {
    title: 'Family Workout — You & The Kids',
    titleAr: 'انت وولادك 👨‍👧',
    description: 'Fifteen minutes of movement the whole house can do together — coordination for them, a real sweat for you.',
    descriptionAr: 'ربع ساعة حركة البيت كله يعملها مع بعض — تناسق ليهم وعرق حقيقي ليك.',
    level: 'BEGINNER', order: 63, reelKeyword: 'kids workout',
    lessons: [
      { t: 'Family session at home', ta: 'حصة عيلة في البيت', d: '25 fun exercises for all ages — follow along together.', da: '٢٥ تمرينة مسلية لكل الأعمار — اتفرجوا واتحركوا مع بعض.', url: yt('d6rF-VuJ9_I') },
      { t: 'Family cardio party', ta: 'كارديو العيلة', d: 'A cardio session built for parents + kids energy levels.', da: 'جلسة كارديو معمولة لطاقة الأهل والأطفال مع بعض.', url: yt('GidfOb4bPFA') },
      { t: 'Kid-friendly HIIT (5+)', ta: 'هيت للأطفال (٥ سنين وأكتر)', d: 'Short intervals kids actually finish — and parents actually feel.', da: 'فترات قصيرة الأطفال بيخلصوها فعلاً — والأهل بيحسوا بيها فعلاً.', url: yt('326GR2A7q-s') },
      { t: 'Full-body kids workout', ta: 'تمرين جسم كامل للأطفال', d: 'No-repeat full body — every move once, no boredom.', da: 'جسم كامل من غير تكرار — كل حركة مرة واحدة، ومفيش ملل.', url: yt('sM9tpg1CDOU') },
      { t: 'Any-age session', ta: 'حصة لأي سن', d: 'One session that scales from age 6 to 60.', da: 'حصة واحدة تنفع من سن ٦ لـ٦٠.', url: yt('hRXoKTBSZiI') },
    ],
  },
  {
    title: 'Football Fitness',
    titleAr: 'لياقة الكورة ⚽',
    description: 'Get match-fit for the weekly game: pro warmups, agility, foot speed, and the stamina to still be running in the second half.',
    descriptionAr: 'جهّز نفسك لماتش الأسبوع: تسخين المحترفين، رشاقة، سرعة رجلين، ونَفَس يخليك لسه بتجري في الشوط التاني.',
    level: 'INTERMEDIATE', order: 64, reelKeyword: 'soccer training',
    lessons: [
      { t: 'The pro warmup (10 min)', ta: 'تسخين المحترفين (١٠ دقايق)', d: 'Never start a match cold again — the follow-along professional warmup.', da: 'بلاش تنزل الماتش ساقع تاني — تسخين المحترفين بالمتابعة.', url: yt('5K6tuhOcAOs') },
      { t: 'Dynamic warmup + SAQ', ta: 'تسخين ديناميكي + سرعة ورشاقة', d: 'Eight football-specific speed/agility/quickness drills.', da: 'تماني تمرينات سرعة ورشاقة مخصوصة للكورة.', url: yt('zoLOmYwmQDg') },
      { t: 'Foot speed at home', ta: 'سرعة رجلين في البيت', d: 'A simple agility routine for faster feet — no ladder needed.', da: 'روتين رشاقة بسيط لرجلين أسرع — من غير سلم رشاقة.', url: yt('DMVRAQDGYHo') },
      { t: '5 speed & agility drills', ta: '٥ تمرينات سرعة ورشاقة', d: 'The five drills that translate directly to beating your man.', da: 'الخمس تمرينات اللي بتترجم على طول لإنك تكسب راجلك في الملعب.', url: yt('ewfKzqMaK-I') },
      { t: '16 drills — speed & endurance', ta: '١٦ تمرينة — سرعة ونَفَس', d: 'Build the engine: speed, agility and endurance in one session.', da: 'ابني الموتور: سرعة ورشاقة ونَفَس في جلسة واحدة.', url: yt('3fcuQGdhGjk') },
      { t: 'Match stamina', ta: 'نَفَس الماتش', d: 'The fitness session for still sprinting in minute 80.', da: 'جلسة اللياقة اللي تخليك لسه بتجري سبرنت في الدقيقة ٨٠.', url: yt('rVjLbtKus6k') },
    ],
  },
];

async function main() {
  // Attach to an existing WORKOUT coach; create the house coach if none.
  let coach = await prisma.coach.findFirst({ where: { type: 'WORKOUT' } });
  if (!coach) {
    coach = await prisma.coach.create({
      data: { name: 'PULSE Team', nameAr: 'فريق PULSE', type: 'WORKOUT', headline: 'Curated by PULSE', headlineAr: 'مختار بعناية من PULSE' },
    });
  }

  for (const p of PROGRAMS) {
    let program = await prisma.program.findFirst({ where: { title: p.title } });
    const data = {
      coachId: coach.id,
      title: p.title, titleAr: p.titleAr,
      description: p.description, descriptionAr: p.descriptionAr,
      level: p.level, order: p.order, audience: p.audience ?? null, reelKeyword: p.reelKeyword,
    };
    if (program) {
      program = await prisma.program.update({ where: { id: program.id }, data });
      await prisma.lesson.deleteMany({ where: { programId: program.id } });
    } else {
      program = await prisma.program.create({ data });
    }
    for (const [i, l] of p.lessons.entries()) {
      await prisma.lesson.create({
        data: {
          programId: program.id,
          title: l.t, titleAr: l.ta,
          description: l.d, descriptionAr: l.da,
          videoUrl: l.url,
          reelKeyword: l.reel ?? p.reelKeyword,
          order: i,
        },
      });
    }
    console.log(`✓ ${p.titleAr} — ${p.lessons.length} lessons`);
  }
}

main().finally(() => prisma.$disconnect());
