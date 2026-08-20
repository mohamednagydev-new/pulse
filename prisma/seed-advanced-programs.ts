/** Three professional ADVANCED training programs (Program + Lesson rows).
 *  Idempotent: a program is skipped when one with the same title already exists.
 *  Every videoUrl below was copied from an existing Lesson.videoUrl in THIS repo's
 *  database (verified 2026-08) — no invented links. The script re-verifies each URL
 *  against the live Lesson table at run time and nulls any that is not found.
 *  Run from repo root: node node_modules/tsx/dist/cli.mjs prisma/seed-advanced-programs.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** Existing, verified videos in this DB, keyed by movement. */
const V = {
  squat: 'https://www.youtube.com/watch?v=hBanCm-yqB8',        // "Leg Day"
  squatAlt: 'https://www.youtube.com/watch?v=GHITD1E0oWs',     // "Lower Body Strength" / "Day 1 — Squat Basics"
  legs: 'https://www.youtube.com/watch?v=YdB6lnybNyM',         // "Leg Day"
  legsAlt: 'https://www.youtube.com/watch?v=3qScLxwUAz4',      // "Leg Day"
  bench: 'https://www.youtube.com/watch?v=rzNWh3siwmY',        // "Chest & Triceps" / "Heavy Push"
  push: 'https://www.youtube.com/watch?v=SZaggsg2zUY',         // "Push Day" / "Max Effort Push"
  pushAlt: 'https://www.youtube.com/watch?v=lVwWngzU498',      // "Push Power"
  deadlift: 'https://www.youtube.com/watch?v=dYcNLMwwlMA',     // "Day 4 — Hinge & Core"
  hinge: 'https://www.youtube.com/watch?v=fie6EV_vvxs',        // "Day 4 — Hinge & Core"
  pull: 'https://www.youtube.com/watch?v=QWpdKTt98yk',         // "Back & Biceps" / "Heavy Pull"
  pullAlt: 'https://www.youtube.com/watch?v=RtarA6SpTaU',      // "Pull Day" / "Max Effort Pull"
  pullPower: 'https://www.youtube.com/watch?v=z0eulElSJK0',    // "Pull Power"
  fullStrength: 'https://www.youtube.com/watch?v=l9_SoClAO5g', // "Full Body Strength"
  mobility: 'https://www.youtube.com/watch?v=-7FzPssnZcs',     // "Active Recovery Mobility"
  conditioning: 'https://www.youtube.com/watch?v=pRY8DmcheYs', // "Full Body Conditioning" / "Peak Conditioning"
  metcon: 'https://www.youtube.com/watch?v=huSKtEzN0EA',       // "Metabolic Finisher"
  gauntlet: 'https://www.youtube.com/watch?v=6X9fCbH3Q-8',     // "Conditioning Gauntlet"
  finisher: 'https://www.youtube.com/watch?v=OnsQF94h3z0',     // "Conditioning Finisher"
  intervals: 'https://www.youtube.com/watch?v=LZVODZ3HTmY',    // "Intervals — get faster"
  steadyRun: 'https://www.youtube.com/watch?v=qR4BTLwSKMs',    // "Steady 20 — run & walk"
  hiitRun: 'https://www.youtube.com/watch?v=BrliNdYmRVQ',      // "Beginner HIIT run"
  tempoRun: 'https://www.youtube.com/watch?v=ik31OZR5SEY',     // "Week 3 — Finding rhythm"
};

type L = { title: string; titleAr: string; description: string; descriptionAr: string; videoUrl: string | null; min: number };
const mk = (title: string, titleAr: string, description: string, descriptionAr: string, videoUrl: string | null, min: number): L =>
  ({ title, titleAr, description, descriptionAr, videoUrl, min });

const PROGRAMS = [
  {
    title: 'Powerlifting Peaking — 6 Weeks',
    titleAr: 'بيكينج الباورليفتنج — ٦ أسابيع',
    level: 'ADVANCED',
    reelKeyword: 'powerlifting squat bench deadlift',
    description:
      'A 6-week wave-loading peak for squat, bench and deadlift: two heavy sessions per week, planned back-off volume, a full deload, then a max-attempt test week. For lifters with solid technique who know their current 1RMs.',
    descriptionAr:
      'بيكينج ٦ أسابيع بموجات تحميل للسكوات والبنش والديدليفت: حصتين تقيلتين في الأسبوع، فوليوم باك-أوف محسوب، أسبوع ديلود كامل، وبعدين أسبوع اختبار الماكس. للي تكنيكه ثابت وعارف أرقامه الحالية.',
    lessons: [
      mk('W1D1 — Squat & Bench Volume Wave', 'أ١ ح١ — موجة فوليوم سكوات وبنش',
        'Squat 5×3 @ 80% with 3-min rests, then bench 4×4 @ 78%. Finish with barbell rows 3×8 @ RPE 7. Week 1 sets the baseline — every rep fast and clean, leave one in the tank.',
        'سكوات ٥×٣ على ٨٠٪ وراحة ٣ دقايق، وبعدها بنش ٤×٤ على ٧٨٪. اقفل بـ بار رو ٣×٨ بجهد ٧ من ١٠. الأسبوع الأول بيحدد خط الأساس — كل عدة سريعة ونضيفة وسيب عدة في جعبتك.',
        V.squat, 60),
      mk('W1D2 — Deadlift Foundation', 'أ١ ح٢ — أساس الديدليفت',
        'Deadlift 4×3 @ 80%, dead-stop every rep, 3–4 min rests. Back-off: Romanian deadlift 3×5 @ 60% of your pull. Close with 3×10 hanging knee raises to build the brace you will need at 90%+.',
        'ديدليفت ٤×٣ على ٨٠٪، وقفة كاملة على الأرض كل عدة، وراحة ٣-٤ دقايق. باك-أوف: روماني ديدليفت ٣×٥ على ٦٠٪. اقفل بـ ٣×١٠ رفع ركب متعلق عشان تبني التثبيت اللي هتحتاجه فوق الـ٩٠٪.',
        V.deadlift, 55),
      mk('W2D1 — Heavy Triples', 'أ٢ ح١ — التلاتات التقيلة',
        'Squat 4×3 @ 84% and bench 5×3 @ 82%, 3–4 min rests. Back-off bench 2×6 @ 72% with a controlled 2-second descent. If bar speed dies on the last squat set, cut it — the wave keeps climbing next week.',
        'سكوات ٤×٣ على ٨٤٪ وبنش ٥×٣ على ٨٢٪ وراحة ٣-٤ دقايق. باك-أوف بنش ٢×٦ على ٧٢٪ بنزول متحكم فيه ثانيتين. لو سرعة البار ماتت في آخر مجموعة سكوات، وقّفها — الموجة طالعة الأسبوع الجاي.',
        V.legs, 65),
      mk('W2D2 — Deadlift Doubles', 'أ٢ ح٢ — دبلات الديدليفت',
        'Deadlift 5×2 @ 85% with full resets between reps. Then paused squats 3×3 @ 70% (2-count in the hole) to harden your position. Grip work optional: 3 timed double-overhand holds.',
        'ديدليفت ٥×٢ على ٨٥٪ مع إعادة ضبط كاملة بين العدات. بعدها سكوات بوقفة ٣×٣ على ٧٠٪ (عد لاتنين تحت) عشان تقوّي وضعك. لو حابب زوّد قبضة: ٣ تعليقات بالوقت من غير ستراب.',
        V.hinge, 55),
      mk('W3D1 — Squat & Bench Doubles', 'أ٣ ح١ — دبلات سكوات وبنش',
        'Top of the wave: squat 5×2 @ 87%, 3-min rests, then bench 4×2 @ 86%. Back-off squat 3×5 @ 75% — this volume is what converts to a new max, do not skip it.',
        'قمة الموجة: سكوات ٥×٢ على ٨٧٪ براحة ٣ دقايق، وبعدها بنش ٤×٢ على ٨٦٪. باك-أوف سكوات ٣×٥ على ٧٥٪ — الفوليوم ده هو اللي بيتحول لماكس جديد، ماتفوتوش.',
        V.squatAlt, 70),
      mk('W3D2 — Deadlift Top Double', 'أ٣ ح٢ — أتقل دبل ديدليفت',
        'Work to a heavy double at 88–90%, take it only if the bar moved well last week. Back-off 2×4 @ 78%. Finish with 3×8 strict rows and 3×12 back extensions — your last hard pulling before the deload.',
        'اطلع لدبل تقيل على ٨٨-٩٠٪، وخده بس لو البار كان ماشي كويس الأسبوع اللي فات. باك-أوف ٢×٤ على ٧٨٪. اقفل بـ ٣×٨ رو صارم و٣×١٢ باك إكستنشن — آخر سحب جامد قبل الديلود.',
        V.pull, 60),
      mk('W4D1 — Deload: Technique Squat & Bench', 'أ٤ ح١ — ديلود: تكنيك سكوات وبنش',
        'Deload week — squat 3×5 @ 60% and bench 3×5 @ 60%, every rep paused and perfect. Nothing here should feel hard; you are storing recovery for the singles ahead. Sleep and food are the real training this week.',
        'أسبوع الديلود — سكوات ٣×٥ على ٦٠٪ وبنش ٣×٥ على ٦٠٪، كل عدة بوقفة ومظبوطة. مفيش حاجة المفروض تحسها صعبة؛ إنت بتخزن استشفاء للسنجلات الجاية. النوم والأكل هما التمرين الحقيقي الأسبوع ده.',
        V.fullStrength, 40),
      mk('W4D2 — Deload: Light Pull & Mobility', 'أ٤ ح٢ — ديلود: سحب خفيف ومرونة',
        'Deadlift 3×3 @ 60%, crisp and fast off the floor, then 20 minutes of hips, ankles and thoracic mobility. Walk out of the gym feeling better than you walked in.',
        'ديدليفت ٣×٣ على ٦٠٪، سريع ونضيف من الأرض، وبعدها ٢٠ دقيقة مرونة للورك والكاحل والضهر العلوي. المفروض تخرج من الجيم أحسن ما دخلت.',
        V.mobility, 40),
      mk('W5D1 — Heavy Singles: Squat & Bench', 'أ٥ ح١ — سنجلات تقيلة: سكوات وبنش',
        'Work to one single at 92–95% in both squat and bench — full competition commands, belt and setup exactly as test day. One back-off set of 3 @ 80%. Stop after the single even if it flies; the max is next week.',
        'اطلع لسنجل واحد على ٩٢-٩٥٪ في السكوات والبنش — بأوامر البطولة كاملة، والحزام والتجهيز زي يوم الاختبار بالظبط. باك-أوف مجموعة واحدة ٣ عدات على ٨٠٪. اقف بعد السنجل حتى لو طار؛ الماكس الأسبوع الجاي.',
        V.push, 55),
      mk('W5D2 — Deadlift Opener Single', 'أ٥ ح٢ — سنجل افتتاحية الديدليفت',
        'Pull one single at 92%, treat it as your planned opener rehearsal. Then decide all nine test-day attempts on paper: opener ~91%, second ~96%, third 100–102% based on this week’s bar speed.',
        'اسحب سنجل واحد على ٩٢٪ واعتبره بروفة الافتتاحية. بعدها اكتب التسع محاولات بتوع يوم الاختبار على ورق: افتتاحية حوالي ٩١٪، التانية ٩٦٪، والتالتة ١٠٠-١٠٢٪ حسب سرعة البار الأسبوع ده.',
        V.pullAlt, 45),
      mk('W6D1 — Test Day: Squat & Bench Max', 'أ٦ ح١ — يوم الاختبار: ماكس سكوات وبنش',
        'Warm up like a meet: bar, 50%, 70%, 80%, 88%, then attempts — opener 91%, second 96%, third 100–102%. 5+ minutes between attempts. Take the third only after a clean second; a miss teaches nothing today.',
        'سخّن زي البطولة: البار، ٥٠٪، ٧٠٪، ٨٠٪، ٨٨٪، وبعدين المحاولات — افتتاحية ٩١٪، التانية ٩٦٪، والتالتة ١٠٠-١٠٢٪. راحة ٥ دقايق أو أكتر بين المحاولات. ماتاخدش التالتة غير بعد تانية نضيفة؛ المحاولة الفاشلة النهارده مش هتعلمك حاجة.',
        V.squat, 75),
      mk('W6D2 — Test Day: Deadlift Max & Debrief', 'أ٦ ح٢ — يوم الاختبار: ماكس الديدليفت والمراجعة',
        'Same attempt ladder for the deadlift: 91%, 96%, 100–102%. Afterwards log all three new maxes and write two sentences on what limited each lift — that note is the seed of your next block.',
        'نفس سلم المحاولات للديدليفت: ٩١٪ و٩٦٪ و١٠٠-١٠٢٪. بعدها سجّل التلات أرقام الجديدة واكتب جملتين عن اللي حدّ كل رفعة — الملاحظة دي هي بداية البلوك الجاي.',
        V.deadlift, 60),
    ],
  },
  {
    title: 'Hypertrophy Specialization Block',
    titleAr: 'بلوك تضخيم متخصص',
    level: 'ADVANCED',
    reelKeyword: 'hypertrophy muscle building push pull legs',
    description:
      'A 4-week high-volume push/pull/legs block with weekly set progression, RIR-based loading and controlled tempo. Built for experienced lifters chasing muscle, not numbers — expect deep soreness and plan your food accordingly.',
    descriptionAr:
      'بلوك ٤ أسابيع فوليوم عالي بنظام دفع/سحب/رجل، بتدرّج في المجموعات كل أسبوع وتحميل على أساس الـRIR وتيمبو متحكم فيه. معمول للمتمرن المتقدم اللي عايز عضل مش أرقام — استعد لتكسير حقيقي وظبط أكلك على كده.',
    lessons: [
      mk('Block Primer — RIR & Tempo', 'مقدمة البلوك — الـRIR والتيمبو',
        'The whole block runs on two dials: reps in reserve (RIR) and tempo. Learn to stop sets at a true 1–2 RIR and to control a 3-1-1 tempo — 3-second lowering, 1-second pause, drive up. Test both today on light dumbbell presses and rows before Week 1 begins.',
        'البلوك كله شغال على عدادين: العدات المتبقية (RIR) والتيمبو. اتعلم توقف المجموعة وفاضل فعلاً عدة أو اتنين، وتتحكم في تيمبو ٣-١-١ — نزول ٣ ثواني، ثبات ثانية، وادفع لفوق. جرّبهم النهارده على ضغط دمبل ورو خفاف قبل ما الأسبوع الأول يبدأ.',
        V.fullStrength, 30),
      mk('W1 Push — Baseline Volume', 'أ١ دفع — فوليوم الأساس',
        'Incline barbell press 4×8 @ 2 RIR, flat dumbbell press 3×10, cable fly 3×12 with a hard 1-second squeeze, then overhead press 3×10 and triceps rope pushdown 3×15. Rest 2 min on presses, 60–90 s on isolation.',
        'بنش مايل بالبار ٤×٨ وفاضل عدتين، ضغط دمبل مستوي ٣×١٠، كيبل فلاي ٣×١٢ مع عصرة ثانية جامدة، وبعدها ضغط كتف ٣×١٠ وترايسبس بالحبل ٣×١٥. راحة دقيقتين في الضغط ومن ٦٠ لـ٩٠ ثانية في العزل.',
        V.bench, 55),
      mk('W1 Pull — Baseline Volume', 'أ١ سحب — فوليوم الأساس',
        'Weighted pull-ups 4×6–8, chest-supported row 3×10 with 3-1-1 tempo, lat pulldown 3×12, then rear-delt fly 3×15 and incline curls 3×12 @ 2 RIR. Row with the elbows, not the hands — feel the lats do the work.',
        'عقلة بوزن ٤×٦-٨، رو مستند على الصدر ٣×١٠ بتيمبو ٣-١-١، سحب أمامي ٣×١٢، وبعدها ريّر دلت فلاي ٣×١٥ وباي مايل ٣×١٢ وفاضل عدتين. اسحب بكوعك مش بإيدك — لازم تحس الظهر هو اللي شغال.',
        V.pull, 55),
      mk('W1 Legs — Baseline Volume', 'أ١ رجل — فوليوم الأساس',
        'High-bar squat 4×8 @ 2 RIR, Romanian deadlift 3×10, leg press 3×12 with a full 3-second descent, then leg curl 3×12 and standing calf raise 4×15. Two minutes rest on squats — do not rush leg day.',
        'سكوات هاي-بار ٤×٨ وفاضل عدتين، روماني ديدليفت ٣×١٠، ليج برس ٣×١٢ بنزول ٣ ثواني كاملين، وبعدها ليج كيرل ٣×١٢ وسمانة واقف ٤×١٥. راحة دقيقتين في السكوات — يوم الرجل مش بيتستعجل.',
        V.legs, 60),
      mk('W2 Push — Add a Set', 'أ٢ دفع — زوّد مجموعة',
        'Same push menu, one extra set on both presses: incline press 5×8, dumbbell press 4×10, everything else unchanged at 1–2 RIR. Add 2.5 kg to any lift where you beat last week’s reps on every set.',
        'نفس منيو الدفع بمجموعة زيادة في الضغطتين: بنش مايل ٥×٨ وضغط دمبل ٤×١٠، والباقي زي ما هو وفاضل عدة لعدتين. زوّد ٢.٥ كيلو في أي تمرين كسرت فيه عدات الأسبوع اللي فات في كل المجموعات.',
        V.push, 60),
      mk('W2 Pull — Add a Set', 'أ٢ سحب — زوّد مجموعة',
        'Pull-ups 5×6–8 and rows 4×10 this week, pulldowns, rear delts and curls unchanged. Keep the 3-1-1 tempo honest on the rows even as the weight climbs — momentum steals growth.',
        'العقلة ٥×٦-٨ والرو ٤×١٠ الأسبوع ده، والسحب الأمامي والريّر دلت والباي زي ما هما. حافظ على تيمبو ٣-١-١ في الرو حتى مع زيادة الوزن — المرجحة بتسرق الضخامة.',
        V.pullPower, 60),
      mk('W2 Legs — Add a Set', 'أ٢ رجل — زوّد مجموعة',
        'Squat 5×8 and RDL 4×10 this week at the same RIR, leg press, curls and calves unchanged. If your squat sets slow down badly, hold the weight and win with reps first.',
        'سكوات ٥×٨ وروماني ٤×١٠ الأسبوع ده بنفس الـRIR، والليج برس والكيرل والسمانة زي ما هما. لو مجموعات السكوات تقلت أوي، ثبّت الوزن واكسب بالعدات الأول.',
        V.legsAlt, 65),
      mk('W3 Push — Peak Volume + Drop Sets', 'أ٣ دفع — قمة الفوليوم مع دروب سيت',
        'Peak week: presses at 5 sets each @ 1 RIR, then a double drop set on the final cable fly — drop 30%, rep out, drop 30% again. This is the hardest push day of the block; earn it and Week 4 pays you back.',
        'أسبوع القمة: الضغط ٥ مجموعات وفاضل عدة واحدة بس، وفي آخر كيبل فلاي دروب سيت مزدوج — نزّل ٣٠٪ وكمّل لحد الآخر، ونزّل ٣٠٪ تاني. ده أصعب يوم دفع في البلوك؛ استحمله والأسبوع الرابع هيعوضك.',
        V.pushAlt, 65),
      mk('W3 Pull — Peak Volume + Myo-Reps', 'أ٣ سحب — قمة الفوليوم مع مايو-ريبس',
        'Rows and pull-ups at 5 sets @ 1 RIR, then finish pulldowns myo-rep style: one set to 1 RIR, rest 15 s, 5 mini-sets of 4. Rear delts and curls to failure on the last set only.',
        'الرو والعقلة ٥ مجموعات وفاضل عدة واحدة، واقفل السحب الأمامي بأسلوب المايو-ريبس: مجموعة لحد ما يفضل عدة، راحة ١٥ ثانية، و٥ مجموعات صغيرة ٤ عدات. الريّر دلت والباي للفشل في آخر مجموعة بس.',
        V.pullAlt, 65),
      mk('W3 Legs — Peak Volume', 'أ٣ رجل — قمة الفوليوم',
        'Squat 5×8 @ 1 RIR, RDL 4×10, leg press 4×12 with the 3-second descent, then a 20-rep widowmaker set on the leg press at your 12-rep weight. Calves 5×15. Bring food; you will need it.',
        'سكوات ٥×٨ وفاضل عدة واحدة، روماني ٤×١٠، ليج برس ٤×١٢ بنزول ٣ ثواني، وبعدين مجموعة الـ٢٠ عدة القاتلة على الليج برس بوزن الـ١٢ عدة. سمانة ٥×١٥. خد أكلك معاك؛ هتحتاجه.',
        V.squatAlt, 70),
      mk('W4 Upper — Consolidation', 'أ٤ علوي — تثبيت',
        'Volume drops so the muscle can show up: one push and one pull movement at 3×8 @ 2 RIR each (incline press + chest-supported row), plus one arm superset 3×12. Loads stay heavy, sets get few — this is planned, not lazy.',
        'الفوليوم بينزل عشان العضل يبان: تمرين دفع وتمرين سحب ٣×٨ لكل واحد وفاضل عدتين (بنش مايل + رو مستند)، مع سوبر سيت دراعات ٣×١٢. الأوزان لسه تقيلة والمجموعات قليلة — ده مخطط مش كسل.',
        V.bench, 45),
      mk('W4 Lower — Consolidation & Measure', 'أ٤ سفلي — تثبيت وقياس',
        'Squat 3×8 @ 2 RIR and RDL 3×8, nothing else heavy. Then re-measure: weight, waist, arm and thigh tape, and the same three progress photos as day one. Compare, write what grew, and pick next block’s focus from the data.',
        'سكوات ٣×٨ وفاضل عدتين وروماني ٣×٨، ومفيش حاجة تقيلة تاني. بعدها قيس من جديد: الوزن، والوسط، ومقاس الدراع والرجل، ونفس صور المتابعة التلاتة بتوع أول يوم. قارن، واكتب إيه اللي كبر، واختار تركيز البلوك الجاي من الأرقام.',
        V.legs, 50),
    ],
  },
  {
    title: 'Engine Builder — Conditioning',
    titleAr: 'باني المحرك — لياقة متقدمة',
    level: 'ADVANCED',
    reelKeyword: 'conditioning intervals hiit endurance',
    description:
      'Ten advanced conditioning sessions that build real work capacity: a benchmark test, VO2 intervals, EMOMs, tempo runs and mixed circuits, then a retest to prove the engine grew. Scale distances to your sport, not your ego.',
    descriptionAr:
      'عشر حصص لياقة متقدمة بتبني قدرة شغل حقيقية: اختبار قياس، إنترفالز VO2، تمارين EMOM، جري تيمبو ودوايرمشكّلة، وفي الآخر إعادة اختبار تثبت إن المحرك كبر. ظبط المسافات على رياضتك مش على غرورك.',
    lessons: [
      mk('Session 1 — Capacity Test', 'حصة ١ — اختبار القدرة',
        'Benchmark day: 2 km run for time, rest 10 minutes, then max burpees in 5 minutes. Record both numbers plus your heart rate one minute after finishing — these three values are what Session 10 must beat.',
        'يوم القياس: جري ٢ كيلومتر بالوقت، راحة ١٠ دقايق، وبعدها أقصى عدد بيربي في ٥ دقايق. سجّل الرقمين ومعاهم نبضك بعد دقيقة من ما تخلص — التلات أرقام دول هما اللي الحصة العاشرة لازم تكسرهم.',
        V.conditioning, 35),
      mk('Session 2 — VO2 Intervals 4×4', 'حصة ٢ — إنترفالز VO2 ٤×٤',
        'Classic 4×4: four rounds of 4 minutes hard (about 90% max heart rate) with 3 minutes easy jog between. Run, bike or row — the modality matters less than holding the same pace on round four as round one.',
        'الـ٤×٤ الكلاسيكي: أربع جولات ٤ دقايق قوية (حوالي ٩٠٪ من أقصى نبض) وبينهم ٣ دقايق هرولة خفيفة. اجري أو عجلة أو تجديف — النوع مش مهم قد إنك تحافظ على نفس السرعة في الجولة الرابعة زي الأولى.',
        V.intervals, 30),
      mk('Session 3 — EMOM 20: Push/Pull/Squat/Run', 'حصة ٣ — EMOM ٢٠: دفع/سحب/سكوات/جري',
        'Every minute on the minute for 20 minutes, rotating: min 1 — 12 push-ups, min 2 — 8 pull-ups, min 3 — 15 air squats, min 4 — 150 m hard run, min 5 — rest. Four full cycles; if any minute leaves you under 15 seconds of rest, trim two reps.',
        'كل دقيقة على رأس الدقيقة لمدة ٢٠ دقيقة بالتبادل: دقيقة ١ — ١٢ ضغط، دقيقة ٢ — ٨ عقلة، دقيقة ٣ — ١٥ سكوات هوائي، دقيقة ٤ — جري ١٥٠ متر قوي، دقيقة ٥ — راحة. أربع دورات كاملة؛ لو أي دقيقة سابتلك أقل من ١٥ ثانية راحة، قلّل عدتين.',
        V.metcon, 30),
      mk('Session 4 — Tempo Run 3×8', 'حصة ٤ — جري تيمبو ٣×٨',
        'Three blocks of 8 minutes at tempo — comfortably hard, you can say short sentences but not chat — with 2 minutes easy between. Hold even splits; the third block at the same pace is the whole point.',
        'تلات بلوكات ٨ دقايق بإيقاع التيمبو — صعب بس محتمل، تقدر تقول جملة قصيرة بس مش تدردش — وبينهم دقيقتين خفاف. ثبّت السرعة؛ البلوك التالت بنفس الإيقاع هو الهدف كله.',
        V.tempoRun, 35),
      mk('Session 5 — Mixed Circuit ×5', 'حصة ٥ — دايرة مشكّلة ×٥',
        'Five rounds for time: 400 m run, 15 kettlebell swings, 12 burpees, 10 goblet squats. Rest only as needed and log the total time. Target: under 25 minutes with unbroken swings.',
        'خمس جولات بالوقت: جري ٤٠٠ متر، ١٥ مرجحة كيتل بل، ١٢ بيربي، ١٠ جوبلت سكوات. ريّح على قد ما تحتاج بس وسجّل الوقت الكلي. الهدف: أقل من ٢٥ دقيقة من غير ما تقطع المراجيح.',
        V.gauntlet, 35),
      mk('Session 6 — Recovery Intervals', 'حصة ٦ — إنترفالز استشفاء',
        'Deliberately easy week midpoint: 30 minutes alternating 3 minutes easy jog / 2 minutes brisk walk, nasal breathing throughout if you can. Finish with 10 minutes of hips and calves mobility. Recovery is training.',
        'منتصف البرنامج خفيف بالعمد: ٣٠ دقيقة بالتبادل — ٣ دقايق هرولة خفيفة ودقيقتين مشي سريع، وحاول تتنفس من مناخيرك طول الوقت. اقفل بـ١٠ دقايق مرونة للورك والسمانة. الاستشفاء ده تمرين برضه.',
        V.steadyRun, 40),
      mk('Session 7 — Sprint Ladder', 'حصة ٧ — سلم السرعات',
        'After a thorough warm-up: sprint 100/200/300/400/300/200/100 m, walking back the same distance as recovery each time. Run the 400 at 85%, the short ones at 95%. Quality over quantity — stop the session if form breaks.',
        'بعد إحماء كويس: عدو ١٠٠/٢٠٠/٣٠٠/٤٠٠/٣٠٠/٢٠٠/١٠٠ متر، وارجع نفس المسافة مشي كراحة كل مرة. الـ٤٠٠ على ٨٥٪ والقصير على ٩٥٪. الجودة قبل الكمية — أول ما التكنيك يبوظ اقفل الحصة.',
        V.hiitRun, 35),
      mk('Session 8 — EMOM 24: Heavy Engine', 'حصة ٨ — EMOM ٢٤: محرك تقيل',
        'EMOM 24 with load: min 1 — 10 dumbbell thrusters, min 2 — 12 kettlebell swings, min 3 — 10 burpees over the bell, min 4 — rest. Six cycles. Choose weights you can move unbroken in round one and barely unbroken in round six.',
        'EMOM ٢٤ دقيقة بأوزان: دقيقة ١ — ١٠ ثراستر دمبل، دقيقة ٢ — ١٢ مرجحة كيتل بل، دقيقة ٣ — ١٠ بيربي فوق الكيتل بل، دقيقة ٤ — راحة. ست دورات. اختار أوزان تعرف تكملها من غير قطع في أول جولة، وبالعافية في آخر جولة.',
        V.finisher, 30),
      mk('Session 9 — Threshold 2×15', 'حصة ٩ — عتبة ٢×١٥',
        'Two blocks of 15 minutes at threshold pace — just below the point where breathing runs away from you — with 4 minutes easy between. This is the longest sustained work of the block and the final stimulus before the retest.',
        'بلوكين ١٥ دقيقة على سرعة العتبة — تحت النقطة اللي نفسك بيهرب منك عندها بشوية — وبينهم ٤ دقايق خفاف. ده أطول شغل متواصل في البرنامج وآخر جرعة قبل إعادة الاختبار.',
        V.tempoRun, 40),
      mk('Session 10 — Retest & Compare', 'حصة ١٠ — إعادة الاختبار والمقارنة',
        'Repeat Session 1 exactly: 2 km for time, 10 minutes rest, 5-minute burpee max, plus the 1-minute recovery heart rate. Compare all three numbers to your baseline — a faster run, more burpees or a quicker heart-rate drop each prove the engine grew.',
        'كرر الحصة الأولى بالظبط: ٢ كيلومتر بالوقت، راحة ١٠ دقايق، وأقصى بيربي في ٥ دقايق، ومعاهم نبض الاستشفاء بعد دقيقة. قارن التلات أرقام بخط الأساس — جري أسرع أو بيربي أكتر أو نبض بينزل أسرع، كلهم دليل إن المحرك كبر.',
        V.conditioning, 35),
    ],
  },
];

async function run() {
  // Anchor coach: the same coach the existing ADVANCED programs belong to.
  const anchor = await prisma.program.findFirst({ where: { level: 'ADVANCED' }, select: { coachId: true } });
  const coach = anchor
    ? await prisma.coach.findUnique({ where: { id: anchor.coachId } })
    : await prisma.coach.findFirst({ where: { type: 'WORKOUT' }, orderBy: { order: 'asc' } });
  if (!coach) throw new Error('No coach found to attach programs to.');

  // Runtime safety net: only videoUrls already present in this DB may be used.
  const existing = await prisma.lesson.findMany({ where: { videoUrl: { not: null } }, select: { videoUrl: true } });
  const verified = new Set(existing.map((e) => e.videoUrl as string));

  const maxOrder = await prisma.program.aggregate({ _max: { order: true } });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  let createdPrograms = 0, createdLessons = 0, nulledVideos = 0;
  const usedVideos = new Set<string>();

  for (const tpl of PROGRAMS) {
    const dup = await prisma.program.findFirst({ where: { title: tpl.title } });
    if (dup) { console.log(`= skip (exists): ${tpl.title}`); continue; }

    const program = await prisma.program.create({
      data: {
        coachId: coach.id,
        title: tpl.title,
        titleAr: tpl.titleAr,
        description: tpl.description,
        descriptionAr: tpl.descriptionAr,
        level: tpl.level,
        reelKeyword: tpl.reelKeyword,
        order: nextOrder++,
      },
    });
    createdPrograms++;

    for (let i = 0; i < tpl.lessons.length; i++) {
      const ls = tpl.lessons[i];
      let videoUrl: string | null = ls.videoUrl;
      if (videoUrl && !verified.has(videoUrl)) {
        console.warn(`! video not found in DB, storing null: ${videoUrl} (${ls.title})`);
        videoUrl = null;
        nulledVideos++;
      }
      if (videoUrl) usedVideos.add(videoUrl);
      await prisma.lesson.create({
        data: {
          programId: program.id,
          title: ls.title,
          titleAr: ls.titleAr,
          description: ls.description,
          descriptionAr: ls.descriptionAr,
          videoUrl,
          durationSec: ls.min * 60,
          reelKeyword: tpl.reelKeyword,
          order: i,
        },
      });
      createdLessons++;
    }
    console.log(`+ ${tpl.title} (${tpl.lessons.length} lessons)`);
  }

  const advCount = await prisma.program.count({ where: { level: 'ADVANCED' } });
  console.log(`\nSummary: ${createdPrograms} programs created, ${createdLessons} lessons created, ` +
    `${usedVideos.size} distinct existing videos reused, ${nulledVideos} lessons left without video. ` +
    `Coach: ${coach.name}. ADVANCED programs now: ${advCount}.`);
  await prisma.$disconnect();
}

run().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
