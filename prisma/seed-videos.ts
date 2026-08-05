/**
 * Lesson video links - YouTube embeds, not copies.
 *
 * Every id below was checked against YouTube's oEmbed endpoint when this file was
 * generated; the title and channel recorded here are the real ones YouTube returned,
 * so you can audit what each lesson points at without opening a browser. Re-uploads
 * of other people's programmes were excluded deliberately.
 *
 * Idempotent and non-destructive: it only fills lessons that have NO video at all.
 * An uploaded videoId always wins, so replacing these with your own footage later
 * needs no cleanup.
 *
 * Run:    npx tsx prisma/seed-videos.ts
 * Undo:   npx tsx prisma/seed-videos.ts --clear     (clears ONLY links this file set)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** id -> the real YouTube title/channel, captured at verification time. */
const CATALOG: Record<string, { title: string; channel: string }> = {
  "eHhPe_eiCiA": { title: "Start the Day Grounded | Morning Yoga", channel: "Yoga With Adriene" },
  "0pbuvhbg7po": { title: "Grounding Into Gratitude - Root Chakra Yoga - Yoga With Adriene", channel: "Yoga With Adriene" },
  "VPMqn8OJii8": { title: "Home - Day 10 - Ground  |  30 Days of Yoga", channel: "Yoga With Adriene" },
  "g35aFP5Zeyc": { title: "Return - 2 - Ground", channel: "Yoga With Adriene" },
  "FQ74ZykbFFE": { title: "Grounding Yoga Practice | Happy Earth Day!", channel: "Yoga With Adriene" },
  "a-sZbOfau6c": { title: "Yoga for People Who Sit All Day", channel: "Yoga With Adriene" },
  "bgUUZVdPTdk": { title: "30 min Deep Stretch Yoga - FLEXIBILITY YOGA FLOW", channel: "Yoga with Kassandra" },
  "n1E8aTKJmVg": { title: "Yoga for Neck Hump | Upper Spine Posture", channel: "Yoga With Adriene" },
  "nrqH_qyBMLk": { title: "Gentle Yoga For Tight Hips", channel: "Yoga With Adriene" },
  "hg-4VfWuLQg": { title: "Yin Yoga for Tight Hips - No Props Needed!", channel: "Yoga with Kassandra" },
  "44HtKnUI5dU": { title: "30 min Yoga for Tired Legs - Gentle Yoga for Aching Muscles", channel: "Yoga with Kassandra" },
  "2akHh5GgzvM": { title: "Yoga for Heavy Hearts", channel: "Yoga With Adriene" },
  "E5ZPoXWdmMg": { title: "Yin Yoga for your HEART 💗 Emotional Healing Upper Body Yin - NO PROPS", channel: "Yoga with Kassandra" },
  "RoSO3_0Ufr0": { title: "Anchor In Hope  | 18-Minute Yoga Flow", channel: "Yoga With Adriene" },
  "icfwMWYDeac": { title: "Yoga To Shift Perspective | 20-Minute Yoga Flow", channel: "Yoga With Adriene" },
  "7SU59GxGqbo": { title: "40 MIN FULL BODY YOGA FLOW || Vinyasa Flow For Balance, Flexibility & Strength (Intermediate)", channel: "Move With Nicole" },
  "9n5EMxd1eco": { title: "20 min Morning Summer Solstice Yoga - SUN SALUTATIONS", channel: "Yoga with Kassandra" },
  "A83spinhZGs": { title: "20 min Vinyasa Yoga All Levels - Full Body Opening Flow", channel: "Yoga with Kassandra" },
  "RIgB-LpWBKE": { title: "30 min Morning Yoga Flow - Stretch, Breathe & Set Your Intention", channel: "Yoga with Kassandra" },
  "2_Z8usjTflU": { title: "30 min Yoga Pilates Fusion - Full Body Strength No Equipment (YOGALATES)", channel: "Yoga with Kassandra" },
  "S6PQeVpmSfY": { title: "30 min Gentle Yoga for Flexibility & Relaxation", channel: "Yoga with Kassandra" },
  "4pR1rzpU1_s": { title: "30 min Stress Melting Yoga - Gentle Practice for Anxiety & Tension", channel: "Yoga with Kassandra" },
  "3OsBElyha7Y": { title: "Sleep Better Tonight | 10-Minute Bedtime Flow", channel: "Yoga With Adriene" },
  "rPcBPTrPsgU": { title: "Yoga For When You Are Overstimulated", channel: "Yoga With Adriene" },
  "q8N8jkmJP6o": { title: "Legs Up The Wall for Better Sleep", channel: "Yoga With Adriene" },
  "R0__e0QTtQw": { title: "Nervous System Reset | 10 minute yoga practice", channel: "Yoga With Adriene" },
  "v7AYKMP6rOE": { title: "Yoga For Complete Beginners - 20 Minute Home Yoga Workout!", channel: "Yoga With Adriene" },
  "g6DdOHaAmSQ": { title: "Wake Up  | Gentle 10 Minute Yoga", channel: "Yoga With Adriene" },
  "lJUAPGeLrl0": { title: "15 min Peaceful Morning Yoga - Minimal Cues Flow", channel: "Yoga with Kassandra" },
  "dQRxfljJc5Y": { title: "1 Hour Yin Yoga for Flexibility - Hips & Spine Yoga Deep Stretch", channel: "Yoga with Kassandra" },
  "pC-tR0Y0hkA": { title: "Cancer Yin Yoga - Deep Feeling for Healing (Heart & Hips)", channel: "Yoga with Kassandra" },
  "VXQZhZfjiDU": { title: "Yin Yoga Class for Back Pain & Back Stiffness with Kassandra Reinhardt | Full Class", channel: "YouAligned" },
  "V5DjVzCCijI": { title: "15 Minute Full Body Stretch (DAILY FLEXIBILITY YOGA - NO PROPS)", channel: "Yoga with Kassandra" },
  "feHp2b29G5U": { title: "20-Min Pregnancy Yoga Flow For First, Second & Third Trimester", channel: "Pregnancy and Postpartum TV" },
  "zmUJWKM98hM": { title: "15-Minute Pregnancy Yoga | First, Second & Third Trimester Prenatal Yoga", channel: "Pregnancy and Postpartum TV" },
  "XqDdk1Z10RU": { title: "Prenatal Yoga To Prepare For Birth | Open Hips & Ease Back Pain (3rd Trimester)", channel: "Pregnancy and Postpartum TV" },
  "Eadzp6T-em4": { title: "Third Trimester Pregnancy Yoga (Prepare Your Body For A Positive Birth)", channel: "Pregnancy and Postpartum TV" },
  "DIHugD8FegU": { title: "Pregnancy yoga ~ surrender & let go | 20min | hips | all trimesters", channel: "yoginimelbourne" },
  "fn8fQfyHENI": { title: "20 MIN Standing Strength Workout (No Equipment) | Pregnancy Friendly", channel: "MadFit" },
  "VmKm6BPdjWM": { title: "15-Minute Labor Prep Prenatal Yoga (Safe For All Trimesters!)", channel: "nourishmovelove" },
  "6I7BVXiscEY": { title: "Pregnancy Breathing Exercises | Pranayama for Pregnant Women | 3 Prenatal Yoga Breathing Practices", channel: "Bharti Yoga" },
  "u5QbMDvSK3w": { title: "20 MIN MORNING YOGA FLOW || Yoga Flow To Stretch & Feel Good (Pregnancy Friendly)", channel: "Move With Nicole" },
  "feVaUSI9pl4": { title: "Restorative Prenatal Yoga ♥ 3 Relaxing Yoga Poses For All Trimesters ♥ YogaCandi", channel: "YogaCandi" },
  "l5NhZtuga4I": { title: "Prenatal Restorative Yoga Exercise for Pregnant People - Restorative Prenatal Stretches", channel: "What To Expect" },
  "wtVyZmHnlxM": { title: "30 MIN PILATES WORKOUT || Beginner to Moderate Pilates (No Equipment)", channel: "Move With Nicole" },
  "6X9fCbH3Q-8": { title: "Standing Beginner Cardio Workout | Low Impact, No Equipment (All Standing, No Jumping!)", channel: "BodyFit By Amy" },
  "R7mMwjYFhdU": { title: "15 Min Pilates Style Full Body Workout (Light Weights, Low Impact)", channel: "MadFit" },
  "XTSTZa-WO0s": { title: "Full Body Standing Dumbbell Workout | Upper, Lower & Core (No Mat, All Standing!)", channel: "BodyFit By Amy" },
  "l9_SoClAO5g": { title: "20 Minute Dumbbell Full Body Workout - No Repeat | Caroline Girvan", channel: "Caroline Girvan" },
  "icoe6C2E-aY": { title: "20 MIN Dumbbell Full Body Workout - Compound Movements | NO REPEAT", channel: "Caroline Girvan" },
  "ScInpT_5dIQ": { title: "30 Min MIGHTY Full Body Workout - Dumbbells | Caroline Girvan", channel: "Caroline Girvan" },
  "y-sq9j9W7g8": { title: "FUEL Series 30 Min NO REPEAT Full Body Workout | Day 29", channel: "Caroline Girvan" },
  "Z5DX8MYcl00": { title: "1 hour bodyweight full body workout | Calisthenic clusters", channel: "Caroline Girvan" },
  "NXtxjMjMs0Y": { title: "45 MIN FULL BODY WORKOUT || At-Home Intermediate Pilates (No Equipment)", channel: "Move With Nicole" },
  "I_3I73B1NPo": { title: "UNILATERAL Full Body Workout at Home with Dumbbells | Caroline Girvan", channel: "Caroline Girvan" },
  "rzNWh3siwmY": { title: "FUEL Series 30 Min TEMPO - Shoulders, Chest & Triceps Workout | Day 27", channel: "Caroline Girvan" },
  "V_RtNkbsPBc": { title: "15 MIN TRICEP WORKOUT with Dumbbells - No Repeat | Caroline Girvan", channel: "Caroline Girvan" },
  "SZaggsg2zUY": { title: "20 Minute HARD Upper Body Workout with Dumbbells | Caroline Girvan", channel: "Caroline Girvan" },
  "QWpdKTt98yk": { title: "FUEL Series 30 Min Cluster Sets Upper Body Workout | Day 22", channel: "Caroline Girvan" },
  "z0eulElSJK0": { title: "15 Minute BURNING Biceps Workout / Dumbbells - Caroline Girvan", channel: "Caroline Girvan" },
  "lVwWngzU498": { title: "45 Min Upper Body Workout / Dumbbells & Bodyweight | EPIC II - DAY 3", channel: "Caroline Girvan" },
  "hBanCm-yqB8": { title: "FUEL Series 30 Min Dumbbell LEG DAY CIRCUITS Workout | Day 21", channel: "Caroline Girvan" },
  "YdB6lnybNyM": { title: "FUEL Series 30 Min Dumbbell LEG DAY COMPLEX Workout | Day 26", channel: "Caroline Girvan" },
  "-ZToTce0sWM": { title: "40 Min Leg Workout with Dumbbells | IRON PRO Day 1 | 4M Special", channel: "Caroline Girvan" },
  "3qScLxwUAz4": { title: "FUEL Series 30 Min Glutes & Hamstrings Tempo Workout | Day 23", channel: "Caroline Girvan" },
  "GHITD1E0oWs": { title: "Standing Dumbbell Leg & Core Workout | Lower Body Strength (No Mat, All Standing!)", channel: "BodyFit By Amy" },
  "1gBjEyOT65Q": { title: "FUEL Series 30 Min Dumbbell Full Body CORE Workout | Day 24", channel: "Caroline Girvan" },
  "dYcNLMwwlMA": { title: "15 MIN PILATES CORE & ABS WORKOUT || Intermediate Pilates (No Equipment)", channel: "Move With Nicole" },
  "zAOfP9qQpX8": { title: "11: 31-Min Full Body Core Burn with Weights | Strength + Core | BodyFit By Amy", channel: "BodyFit By Amy" },
  "fie6EV_vvxs": { title: "05: No Equipment Core & More Workout | Full Body Strength, Cardio & Mobility (Ab Focus!)", channel: "BodyFit By Amy" },
  "RtarA6SpTaU": { title: "FUEL Series 30 Min POSTERIOR CHAIN CLUSTERS Workout | Day 28", channel: "Caroline Girvan" },
  "Bl28i6fWljU": { title: "20 Minute Arms and Shoulders Workout with Dumbbells | Caroline Girvan", channel: "Caroline Girvan" },
  "7IJmT1G69AM": { title: "15 min Neck & Shoulder Yoga Release (NECK & SHOULDER STRETCHES)", channel: "Yoga with Kassandra" },
  "ta_k5QZLkfk": { title: "20 MIN PILATES WORKOUT || Upper Body & Core (Moderate/Intermediate)", channel: "Move With Nicole" },
  "pRY8DmcheYs": { title: "FUEL Series 30 Min Full Body DUMBBELL HIIT CARDIO Workout | Day 25", channel: "Caroline Girvan" },
  "OnsQF94h3z0": { title: "FUEL Series Finale 30 Min NO REPEAT Dumbbell HIIT Workout | Day 30", channel: "Caroline Girvan" },
  "huSKtEzN0EA": { title: "20 MIN PILATES HIIT || Low Impact & No Repeat Workout (Stretch Included)", channel: "Move With Nicole" },
  "-7FzPssnZcs": { title: "09: Standing Gentle Mobility Workout | Low Impact Movement for Stiffness, Tension & Energy!", channel: "BodyFit By Amy" },
  "JRifialNfHY": { title: "06: Full Body Dumbbell Compound Strength Workout | Strength, Cardio & Core | BodyFit By Amy", channel: "BodyFit By Amy" },
};

/** Ordered per category. Lessons that share a title rotate through the list so a
 *  programme never shows the same video twice in a row. */
const CATEGORIES: Record<string, string[]> = {
  yoga_ground: ["eHhPe_eiCiA", "0pbuvhbg7po", "VPMqn8OJii8", "g35aFP5Zeyc", "FQ74ZykbFFE"],
  yoga_spine: ["a-sZbOfau6c", "bgUUZVdPTdk", "n1E8aTKJmVg"],
  yoga_hips: ["nrqH_qyBMLk", "hg-4VfWuLQg", "44HtKnUI5dU"],
  yoga_heart: ["2akHh5GgzvM", "E5ZPoXWdmMg", "RoSO3_0Ufr0"],
  yoga_balance: ["icfwMWYDeac", "7SU59GxGqbo", "9n5EMxd1eco"],
  yoga_flow: ["A83spinhZGs", "7SU59GxGqbo", "RIgB-LpWBKE", "2_Z8usjTflU"],
  yoga_restore: ["S6PQeVpmSfY", "4pR1rzpU1_s", "bgUUZVdPTdk"],
  yoga_evening: ["3OsBElyha7Y", "rPcBPTrPsgU", "4pR1rzpU1_s"],
  yoga_legsup: ["q8N8jkmJP6o"],
  yoga_breathe: ["R0__e0QTtQw", "4pR1rzpU1_s"],
  yoga_intro: ["v7AYKMP6rOE", "g6DdOHaAmSQ", "lJUAPGeLrl0"],
  yin_still: ["dQRxfljJc5Y", "S6PQeVpmSfY"],
  yin_hips: ["hg-4VfWuLQg", "pC-tR0Y0hkA"],
  yin_spine: ["VXQZhZfjiDU", "bgUUZVdPTdk"],
  yin_heart: ["E5ZPoXWdmMg", "2akHh5GgzvM"],
  yin_legs: ["44HtKnUI5dU", "V5DjVzCCijI"],
  yin_close: ["4pR1rzpU1_s", "S6PQeVpmSfY"],
  pre_found: ["feHp2b29G5U", "zmUJWKM98hM"],
  pre_back: ["XqDdk1Z10RU", "Eadzp6T-em4"],
  pre_hips: ["DIHugD8FegU", "XqDdk1Z10RU"],
  pre_strength: ["fn8fQfyHENI", "VmKm6BPdjWM"],
  pre_calm: ["6I7BVXiscEY", "u5QbMDvSK3w"],
  pre_relax: ["feVaUSI9pl4", "l5NhZtuga4I"],
  w_fullbody_b: ["wtVyZmHnlxM", "6X9fCbH3Q-8", "R7mMwjYFhdU", "XTSTZa-WO0s"],
  w_fullbody_i: ["l9_SoClAO5g", "icoe6C2E-aY", "ScInpT_5dIQ", "y-sq9j9W7g8"],
  w_fullbody_a: ["Z5DX8MYcl00", "NXtxjMjMs0Y", "I_3I73B1NPo"],
  w_chest_tri: ["rzNWh3siwmY", "V_RtNkbsPBc", "SZaggsg2zUY"],
  w_back_bi: ["QWpdKTt98yk", "z0eulElSJK0", "lVwWngzU498"],
  w_legs: ["hBanCm-yqB8", "YdB6lnybNyM", "-ZToTce0sWM", "3qScLxwUAz4", "GHITD1E0oWs"],
  w_core: ["1gBjEyOT65Q", "dYcNLMwwlMA", "zAOfP9qQpX8", "fie6EV_vvxs"],
  w_push: ["rzNWh3siwmY", "SZaggsg2zUY", "lVwWngzU498"],
  w_pull: ["QWpdKTt98yk", "RtarA6SpTaU", "z0eulElSJK0"],
  w_shoulders: ["Bl28i6fWljU", "rzNWh3siwmY", "7IJmT1G69AM"],
  w_upper: ["QWpdKTt98yk", "SZaggsg2zUY", "ta_k5QZLkfk", "lVwWngzU498"],
  w_lower: ["GHITD1E0oWs", "hBanCm-yqB8", "3qScLxwUAz4"],
  w_condition: ["pRY8DmcheYs", "OnsQF94h3z0", "huSKtEzN0EA", "6X9fCbH3Q-8"],
  w_mobility: ["-7FzPssnZcs", "V5DjVzCCijI", "a-sZbOfau6c"],
  w_squat: ["GHITD1E0oWs", "JRifialNfHY"],
  w_hinge: ["RtarA6SpTaU", "3qScLxwUAz4"],
};

/** Ids shipped by an earlier revision of this file. Listed so --clear can still
 *  undo them - otherwise a dropped video would be stranded in the database. */
const RETIRED: string[] = ["D2d7zi6ya58", "J1v3FLnP-T8", "HE5qJ6OWGFg", "WrTSAWcHwv0"];

const url = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Which bucket a lesson belongs in, from its title plus its programme's context. */
function classify(title: string, programTitle: string, coachType: string, level: string | null): string {
  const t = title.toLowerCase();
  const p = programTitle.toLowerCase();

  if (coachType === 'YOGA') {
    // Pregnancy first: these lessons may ONLY point at prenatal-labelled videos.
    if (p.includes('pregnancy') || p.includes('prenatal')) {
      if (/back/.test(t)) return 'pre_back';
      if (/hip|pelvic/.test(t)) return 'pre_hips';
      if (/strength/.test(t)) return 'pre_strength';
      if (/calm|connection/.test(t)) return 'pre_calm';
      if (/rest|relax/.test(t)) return 'pre_relax';
      return 'pre_found';
    }
    if (p.includes('yin')) {
      if (/hip/.test(t)) return 'yin_hips';
      if (/spine/.test(t)) return 'yin_spine';
      if (/heart/.test(t)) return 'yin_heart';
      if (/leg/.test(t)) return 'yin_legs';
      if (/closing|reflection/.test(t)) return 'yin_close';
      return 'yin_still';
    }
    if (/legs up/.test(t)) return 'yoga_legsup';
    if (/breathe down/.test(t)) return 'yoga_breathe';
    if (/evening|unwind/.test(t)) return 'yoga_evening';
    if (/deep rest|restoration|full body rest/.test(t)) return 'yoga_restore';
    if (/ground|settle/.test(t)) return 'yoga_ground';
    if (/spine/.test(t)) return 'yoga_spine';
    if (/hip/.test(t)) return 'yoga_hips';
    if (/heart|breath/.test(t)) return 'yoga_heart';
    if (/balance/.test(t)) return 'yoga_balance';
    if (/flow|vinyasa/.test(t)) return 'yoga_flow';
    return 'yoga_intro';
  }

  const lvl = level === 'ADVANCED' ? 'a' : level === 'INTERMEDIATE' ? 'i' : 'b';
  if (/chest|tricep/.test(t)) return 'w_chest_tri';
  if (/back|bicep/.test(t)) return 'w_back_bi';
  if (/shoulder|arms/.test(t)) return 'w_shoulders';
  if (/core|abs/.test(t)) return 'w_core';
  if (/mobility|recovery/.test(t)) return 'w_mobility';
  if (/conditioning|metabolic|finisher|burnout|peak|gauntlet|ignite|test & reset|push harder|finish strong/.test(t)) return 'w_condition';
  if (/squat/.test(t)) return 'w_squat';
  if (/hinge/.test(t)) return 'w_hinge';
  if (/lower body/.test(t)) return 'w_lower';
  if (/leg day/.test(t)) return 'w_legs';
  if (/push/.test(t)) return 'w_push';
  if (/pull/.test(t)) return 'w_pull';
  if (/upper body/.test(t)) return 'w_upper';
  return `w_fullbody_${lvl}`;
}

async function clear() {
  const links = new Set([...Object.keys(CATALOG), ...RETIRED].map(url));
  const rows = await prisma.lesson.findMany({ where: { videoUrl: { not: null } }, select: { id: true, videoUrl: true } });
  const mine = rows.filter((r) => links.has(r.videoUrl as string));
  for (const r of mine) await prisma.lesson.update({ where: { id: r.id }, data: { videoUrl: null } });
  console.log(`Cleared ${mine.length} link(s) set by this seed. Left ${rows.length - mine.length} other link(s) alone.`);
}

async function run() {
  if (process.argv.includes('--clear')) return clear();

  const lessons = await prisma.lesson.findMany({
    where: { videoId: null, videoUrl: null },
    include: { program: { include: { coach: { select: { type: true } } } } },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
  });

  const seen: Record<string, number> = {};
  let filled = 0;
  const unmatched: string[] = [];

  for (const l of lessons) {
    const cat = classify(l.title, l.program?.title ?? '', l.program?.coach?.type ?? 'WORKOUT', l.program?.level ?? null);
    const pool = CATEGORIES[cat];
    if (!pool || pool.length === 0) { unmatched.push(l.title); continue; }

    // Rotate within the category so repeated lesson titles get different videos.
    const i = seen[cat] ?? 0;
    seen[cat] = i + 1;
    await prisma.lesson.update({ where: { id: l.id }, data: { videoUrl: url(pool[i % pool.length]) } });
    filled++;
  }

  const total = await prisma.lesson.count();
  const withVideo = await prisma.lesson.count({ where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] } });
  console.log(`Linked ${filled} lesson(s). Coverage: ${withVideo}/${total}.`);
  if (unmatched.length) console.log(`  no category for: ${unmatched.join(", ")}`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
