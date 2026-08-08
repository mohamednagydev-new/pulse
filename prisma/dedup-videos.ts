/**
 * De-duplicate lesson videos.
 *
 * A production scan (Aug 2026) found 23 YouTube links shared by 2+ lessons.
 * For each duplicate group the first/original lesson keeps its video; every
 * other lesson gets a distinct replacement curated for the lesson's level and
 * focus. Every id below was checked against YouTube's oEmbed endpoint when
 * this file was generated - the note records the real title and channel that
 * YouTube returned, so you can audit what each lesson points at without
 * opening a browser. Re-uploads of other people's programmes were excluded
 * deliberately (several search hits failed that check and were dropped).
 *
 * Idempotent and non-destructive: a row is applied ONLY if the lesson still
 * carries the old duplicated link. Lessons an admin has since re-pointed (or
 * that got an uploaded videoId - videoId always wins over videoUrl anyway)
 * are left alone.
 *
 * Run:  npx tsx prisma/dedup-videos.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const url = (id: string) => `https://www.youtube.com/watch?v=${id}`;

type Row = { lessonId: string; oldUrl: string; newUrl: string; note: string };

const REPLACEMENTS: Row[] = [
  // ---- was hg-4VfWuLQg (kept by Yin Yoga & Poetry / Melting the Hips) ----
  { lessonId: 'cmsdq6rfv0015uabgpr9dx58v', oldUrl: url('hg-4VfWuLQg'), newUrl: url('3iWaAxjHdkc'),
    note: '30 min MORNING Yoga for Hips - DEEP STRETCH NO PROPS — Yoga with Kassandra' }, // 7 Days of Calm / Day 3 — Hips Release

  // ---- was E5ZPoXWdmMg (kept by The Quiet Heart) ----
  { lessonId: 'cmsdq6rfx0017uabgl47aloc0', oldUrl: url('E5ZPoXWdmMg'), newUrl: url('iL_fhffZopY'),
    note: 'Heart Chakra Yoga For Beginners | Yoga With Adriene — Yoga With Adriene' }, // 7 Days of Calm / Day 4 — Heart & Breath

  // ---- was 4pR1rzpU1_s (kept by Closing Reflection) ----
  { lessonId: 'cmsdq6rg0001duabgyhksojoj', oldUrl: url('4pR1rzpU1_s'), newUrl: url('sdaYb7Pzl5E'),
    note: '30 min RECLINED Yin Yoga - Deep Relaxation & Stretches — Yoga with Kassandra' }, // 7 Days of Calm / Day 7 — Deep Rest

  // ---- was rzNWh3siwmY (kept by Block 1 / Chest & Triceps) ----
  { lessonId: 'cms6e29ge001tc71gqcgilzlz', oldUrl: url('rzNWh3siwmY'), newUrl: url('Hww8Y6GxVbw'),
    note: 'IRON Series 30 Min Upper Body Chest and Triceps Workout | 12 — Caroline Girvan' }, // Block 2 / Upper Body Push
  { lessonId: 'cms6e29m50031c71g63g4z5uk', oldUrl: url('rzNWh3siwmY'), newUrl: url('w8cSjkXkYRc'),
    note: '20 Minute Shoulder Workout with Dumbbells | Caroline Girvan — Caroline Girvan' }, // Split 2 / Arms & Shoulders
  { lessonId: 'cms6e29ol003lc71gxevvn1js', oldUrl: url('rzNWh3siwmY'), newUrl: url('OV3ScwKtveo'),
    note: 'BOLD Upper Body Workout with Dumbbells | EPIC Endgame Day 2 — Caroline Girvan' }, // Peak 1 / Heavy Push
  { lessonId: 'cms6e29pw003zc71g7ztbinlf', oldUrl: url('rzNWh3siwmY'), newUrl: url('uvlrHB00jz0'),
    note: 'Day 18 of EPIC | 40 Min Chest and Triceps Workout at Home — Caroline Girvan' }, // Peak 2 / Chest & Triceps
  { lessonId: 'cms6e29s5004hc71gxeak3wbx', oldUrl: url('rzNWh3siwmY'), newUrl: url('6DQLwfyp6yY'),
    note: 'UNBREAKABLE Upper Body Workout - Shoulders, Chest & Triceps | EPIC Endgame Day 46 — Caroline Girvan' }, // Peak 3 / Arms & Shoulders
  { lessonId: 'cmsdq6rg9001tuabglqaxrcax', oldUrl: url('rzNWh3siwmY'), newUrl: url('7p0Lu2ZIp1A'),
    note: '30 Minute Dumbbell Upper Body & Core Workout: Home Workout for Arms, Shoulders, Back, & Abs — BodyFit By Amy' }, // Strength Foundations (Barbell Basics) / Day 2 — Push Basics

  // ---- was QWpdKTt98yk (kept by Block 1 / Back & Biceps) ----
  { lessonId: 'cms6e29gl001vc71gk6ib0wf7', oldUrl: url('QWpdKTt98yk'), newUrl: url('xPxCcwG56Po'),
    note: 'IRON Series 30 Min Back & Biceps Workout - Rows, Curls | 10 — Caroline Girvan' }, // Block 2 / Upper Body Pull
  { lessonId: 'cms6e29or003nc71g42o9c1kn', oldUrl: url('QWpdKTt98yk'), newUrl: url('V_cqoVYN6wU'),
    note: 'BUILD Back and Biceps Workout at Home / Dumbbells | EPIC II - Day 9 — Caroline Girvan' }, // Peak 1 / Heavy Pull
  { lessonId: 'cms6e29q50041c71gx3ufx1uc', oldUrl: url('QWpdKTt98yk'), newUrl: url('fMOqRNJSUkE'),
    note: 'BIGGER Back and Bicep Workout - Unilateral Training | EPIC III Day 38 — Caroline Girvan' }, // Peak 2 / Back & Biceps
  { lessonId: 'cmsdq6rfm000ruabgslytwnei', oldUrl: url('QWpdKTt98yk'), newUrl: url('s5lVj49v-B4'),
    note: '15 min BODYWEIGHT Upper Body Workout AT HOME (No Equipment) — MadFit' }, // Home Body / Session 1 — Upper Body
  { lessonId: 'cmsdq6rgb001vuabgou1030wa', oldUrl: url('QWpdKTt98yk'), newUrl: url('GUnwWXd2Wog'),
    note: '35-Minute Upper Body PULL WORKOUT At Home (Back + Biceps + Cardio) — nourishmovelove' }, // Strength Foundations / Day 3 — Pull Basics

  // ---- was hBanCm-yqB8 (kept by Block 1 / Leg Day) ----
  { lessonId: 'cms6e29p1003pc71gmitxucef', oldUrl: url('hBanCm-yqB8'), newUrl: url('GPbhp1ENocQ'),
    note: 'UNILATERAL Leg Day / 45 Min Lower Body Workout | EPIC II - Day 8 — Caroline Girvan' }, // Peak 1 / Leg Day
  { lessonId: 'cmsdq6rfn000tuabgwpq9ld7k', oldUrl: url('hBanCm-yqB8'), newUrl: url('9hQTvrP6EsM'),
    note: 'TONED LEGS & ROUND BOOTY At Home Workout (No Equipment) — MadFit' }, // Home Body / Session 2 — Lower Body

  // ---- was 1gBjEyOT65Q (kept by Block 1 / Core Blast) ----
  { lessonId: 'cms6e29me0033c71gvfjw86la', oldUrl: url('1gBjEyOT65Q'), newUrl: url('1WIah0t1Bzw'),
    note: '20 Minute Abs and Core Workout - Dumbbells + Bodyweight | Caroline Girvan — Caroline Girvan' }, // Split 2 / Core Blast
  { lessonId: 'cms6e29sg004jc71g4z96d7yq', oldUrl: url('1gBjEyOT65Q'), newUrl: url('cS-bIr-6hQM'),
    note: '15 MIN ROCK HARD ABS WORKOUT | Core Strength at Home - Caroline Girvan — Caroline Girvan' }, // Peak 3 / Core Blast

  // ---- was GHITD1E0oWs (kept by Block 2 / Lower Body Strength) ----
  { lessonId: 'cms6e29nm003bc71ge22yowo0', oldUrl: url('GHITD1E0oWs'), newUrl: url('TFjLCQMdNng'),
    note: 'Dumbbell Lower Body COMPLEX Workout / Leg Day | EPIC II - Day 22 — Caroline Girvan' }, // Split 3 / Leg Day
  { lessonId: 'cmsdq6rf40003uabg6feo408t', oldUrl: url('GHITD1E0oWs'), newUrl: url('pNxUtMmzes8'),
    note: '30-Minute Leg Workout (Over 200 Squats) — nourishmovelove' }, // Foundations of Strength / Day 1 — Squat Basics

  // ---- was dYcNLMwwlMA (kept by Block 2 / Core Blast) ----
  { lessonId: 'cms6e29o2003fc71g464wytre', oldUrl: url('dYcNLMwwlMA'), newUrl: url('U5LwQW_IQOc'),
    note: '30 MIN PILATES CORE WORKOUT || At-Home Pilates Abs (Moderate) — Move With Nicole' }, // Split 3 / Core Blast
  { lessonId: 'cmsdq6rf90009uabg4s2j33pv', oldUrl: url('dYcNLMwwlMA'), newUrl: url('nat_QGGa6Jc'),
    note: 'Build 30 Day 4: 30-Minute Leg Workout (Glutes and Hamstrings) — nourishmovelove' }, // Foundations of Strength / Day 4 — Hinge & Core

  // ---- was SZaggsg2zUY (kept by Block 3 / Push Day) ----
  { lessonId: 'cms6e29my0037c71gag64449r', oldUrl: url('SZaggsg2zUY'), newUrl: url('JZPzynsdYCE'),
    note: '20 Minute Dumbbell Upper Body Circuit Workout | Caroline Girvan — Caroline Girvan' }, // Split 3 / Chest & Triceps
  { lessonId: 'cms6e29rc004bc71gv3i37z8e', oldUrl: url('SZaggsg2zUY'), newUrl: url('SFBiPoJU8Io'),
    note: 'TORCHED Triceps & Chest Workout - Dumbbells | EPIC Endgame Day 6 — Caroline Girvan' }, // Peak 3 / Max Effort Push

  // ---- was RtarA6SpTaU (kept by Block 3 / Pull Day) ----
  { lessonId: 'cms6e29rk004dc71gne5d3wi6', oldUrl: url('RtarA6SpTaU'), newUrl: url('xShZ2K5hSL8'),
    note: 'MUSCLE BUILDING Back and Bicep Workout | EPIC III Day 26 — Caroline Girvan' }, // Peak 3 / Max Effort Pull

  // ---- was YdB6lnybNyM (kept by Block 3 / Leg Day) ----
  { lessonId: 'cms6e29qd0043c71gvpifyf89', oldUrl: url('YdB6lnybNyM'), newUrl: url('LS-iJMsGcVY'),
    note: 'LEGENDARY Leg Workout / No Frills Leg Day | EPIC II - Day 48 — Caroline Girvan' }, // Peak 2 / Leg Day

  // ---- was pRY8DmcheYs (kept by Block 3 / Full Body Conditioning) ----
  { lessonId: 'cms6e29sq004lc71gcjho59ha', oldUrl: url('pRY8DmcheYs'), newUrl: url('p1UP_ChjIDg'),
    note: 'Day 45 of EPIC | RELENTLESS EMOM HIIT WORKOUT - Caroline Girvan — Caroline Girvan' }, // Peak 3 / Peak Conditioning
  { lessonId: 'cmsdq6rfi000luabg0e21wq2p', oldUrl: url('pRY8DmcheYs'), newUrl: url('f8GzCmbz6YY'),
    note: 'Intense 30 Minute Full Body HIIT // No Equipment Workout — Heather Robertson' }, // 4-Week Fat Loss Circuit / Week 3 — Metabolic Peak

  // ---- was zAOfP9qQpX8 (kept by Block 3 / Core Blast) ----
  { lessonId: 'cms6e29pf003tc71gbieo41kk', oldUrl: url('zAOfP9qQpX8'), newUrl: url('3oeimlA6s68'),
    note: '20 Min ABS WORKOUT at Home [NO EQUIPMENT + NO REPEAT] Caroline Girvan — Caroline Girvan' }, // Peak 1 / Core Blast
  { lessonId: 'cmsdq6rfp000vuabglnwneqi9', oldUrl: url('zAOfP9qQpX8'), newUrl: url('2mkwIgukTuY'),
    note: '15 MIN TOTAL CORE/AB WORKOUT (At Home No Equipment) — MadFit' }, // Home Body / Session 3 — Core & Cardio

  // ---- was z0eulElSJK0 (kept by Split 1 / Back & Biceps) ----
  { lessonId: 'cms6e29lj002xc71gg964xkav', oldUrl: url('z0eulElSJK0'), newUrl: url('kO_b0D8P1Jg'),
    note: '20 Minute Superset Back Workout with Dumbbells | Caroline Girvan — Caroline Girvan' }, // Split 2 / Pull Power
  { lessonId: 'cmsdq6rf80007uabgoe2962il', oldUrl: url('z0eulElSJK0'), newUrl: url('1MKnW5VXF9I'),
    note: 'Stronger 25 Day 2: 25-Minute Back + Bicep Workout — nourishmovelove' }, // Foundations of Strength / Day 3 — Pull Basics

  // ---- was Bl28i6fWljU (kept by Split 1 / Shoulders & Traps) ----
  { lessonId: 'cms6e29qk0045c71g3mpieghg', oldUrl: url('Bl28i6fWljU'), newUrl: url('exC2PUDk_HM'),
    note: 'PUMPED 30 Min Shoulder Workout with Dumbbells | EPIC Heat - Day 36 — Caroline Girvan' }, // Peak 2 / Shoulders & Traps

  // ---- was -ZToTce0sWM (kept by Split 1 / Leg Day) ----
  { lessonId: 'cms6e29rw004fc71gtxqfzmxk', oldUrl: url('-ZToTce0sWM'), newUrl: url('ckOcS33roeA'),
    note: 'Lower Body Workout - Calves, Hamstrings, Glutes & Quads | EPIC II - Day 32 — Caroline Girvan' }, // Peak 3 / Leg Day

  // ---- was fie6EV_vvxs (kept by Split 1 / Core Blast) ----
  { lessonId: 'cms6e29qu0047c71gw8f1i1j0', oldUrl: url('fie6EV_vvxs'), newUrl: url('hPi79mq_1rE'),
    note: '15 Minute Tucked Abs Workout - Bodyweight Only | Caroline Girvan — Caroline Girvan' }, // Peak 2 / Core Blast
  { lessonId: 'cmsdq6rgc001xuabgzwm2avhk', oldUrl: url('fie6EV_vvxs'), newUrl: url('KT0Wbp3PHXg'),
    note: '35 Minute Dumbbell Lower Body & Core Workout: Home Weights Workout for legs, glutes, hips and core — BodyFit By Amy' }, // Strength Foundations / Day 4 — Hinge & Core

  // ---- was OnsQF94h3z0 (kept by Split 1 / Conditioning Finisher) ----
  { lessonId: 'cmsdq6rfc000duabg579np7f6', oldUrl: url('OnsQF94h3z0'), newUrl: url('F9PXg7NeVP0'),
    note: '30 Minute Full Body Dumbbell Workout — BodyFit By Amy' }, // Foundations of Strength / Day 6 — Test & Reset
  { lessonId: 'cmsdq6rfj000nuabgzkm3ipnl', oldUrl: url('OnsQF94h3z0'), newUrl: url('Emu7uB59E2g'),
    note: '30 Minute FULL BODY HIIT Workout // No Equipment — Heather Robertson' }, // 4-Week Fat Loss / Week 4 — Finish Strong

  // ---- was lVwWngzU498 (kept by Split 2 / Push Power) ----
  { lessonId: 'cms6e29na0039c71g6byihduj', oldUrl: url('lVwWngzU498'), newUrl: url('496T-KtRAAU'),
    note: 'Day 36 of EPIC | BACK WORKOUT / BICEP WORKOUT with Dumbbells — Caroline Girvan' }, // Split 3 / Back & Biceps
  { lessonId: 'cmsdq6rf60005uabgrm8eqima', oldUrl: url('lVwWngzU498'), newUrl: url('c0XQs9aMWrA'),
    note: '15 MIN CHEST & SHOULDERS WORKOUT at Home | Upper Body with Dumbbells — Caroline Girvan' }, // Foundations of Strength / Day 2 — Push Basics

  // ---- was huSKtEzN0EA (kept by Split 3 / Metabolic Finisher) ----
  { lessonId: 'cmsdq6rff000huabgtmpokzyi', oldUrl: url('huSKtEzN0EA'), newUrl: url('tYo0rWVEmYc'),
    note: '30 Minute HIIT CARDIO Workout // At Home (No Equipment) — Heather Robertson' }, // 4-Week Fat Loss / Week 1 — Ignite
  { lessonId: 'cmsdq6rfq000xuabgyumemnsj', oldUrl: url('huSKtEzN0EA'), newUrl: url('af49HZUnMNE'),
    note: '20 MIN FULL BODY HIIT - All Standing, No Repeats, No Equipment — MadFit' }, // Home Body / Session 4 — Full Body Burnout

  // ---- was 6X9fCbH3Q-8 (kept by Peak 1 / Conditioning Gauntlet) ----
  { lessonId: 'cmsdq6rfg000juabgpyqw8l6l', oldUrl: url('6X9fCbH3Q-8'), newUrl: url('J4wm6qiv5pI'),
    note: '20 MIN KILLER HIIT Full Body Workout (No Equipment, No Repeat, Cardio At Home) — MadFit' }, // 4-Week Fat Loss / Week 2 — Push Harder
  { lessonId: 'cmsdq6rgd001zuabgtm88f6bx', oldUrl: url('6X9fCbH3Q-8'), newUrl: url('4V0ANPCVY7c'),
    note: '34 Minute Full Body Dumbbell Strength Burner Workout to Sculpt and Tone — BodyFit By Amy' }, // Strength Foundations / Day 5 — Full Body Flow
  { lessonId: 'cmsdq6rge0021uabg6zwq3s35', oldUrl: url('6X9fCbH3Q-8'), newUrl: url('x27pQEly0y8'),
    note: '32 Minute Dumbbell Total Body Strength Workout — BodyFit By Amy' }, // Strength Foundations / Day 6 — Test & Reset

  // ---- was 7SU59GxGqbo (kept by 7 Days of Calm / Day 5 — Balance) ----
  { lessonId: 'cmsdq6rfz001buabgt6aqulpq', oldUrl: url('7SU59GxGqbo'), newUrl: url('W-e55pc4ZSk'),
    note: '30 min Full Body Yoga Flow - Intermediate Vinyasa Yoga NO PROPS — Yoga with Kassandra' }, // 7 Days of Calm / Day 6 — Full Flow
];

async function run() {
  // Sanity: the whole point is distinct links, so refuse to run on a bad edit.
  const targets = new Set(REPLACEMENTS.map((r) => r.newUrl));
  if (targets.size !== REPLACEMENTS.length) {
    throw new Error('Duplicate newUrl inside REPLACEMENTS - fix the mapping before running.');
  }

  let changed = 0;
  let skipped = 0;

  for (const r of REPLACEMENTS) {
    // Only touch the lesson if it still carries the old duplicated link,
    // so re-runs are no-ops and later admin edits are respected.
    const res = await prisma.lesson.updateMany({
      where: { id: r.lessonId, videoUrl: r.oldUrl },
      data: { videoUrl: r.newUrl },
    });
    if (res.count === 1) {
      changed++;
      console.log(`updated ${r.lessonId}: ${r.oldUrl} -> ${r.newUrl}  (${r.note})`);
    } else {
      skipped++;
      const current = await prisma.lesson.findUnique({ where: { id: r.lessonId }, select: { videoUrl: true } });
      console.log(`skipped ${r.lessonId}: ${current ? `videoUrl is ${current.videoUrl ?? 'null'}, not the old duplicate` : 'lesson not found'}`);
    }
  }

  console.log(`\nDone. ${changed} lesson(s) updated, ${skipped} skipped (already applied, edited since, or missing).`);
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
