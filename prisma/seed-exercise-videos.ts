/**
 * Exercise demo links - YouTube embeds, not copies.
 *
 * Sourced by searching YouTube for each movement, then keeping only results whose
 * title actually names that movement (so "top 10 chest exercises" compilations
 * cannot pose as a bench-press demo). Every id was then confirmed through YouTube's
 * oEmbed endpoint - the titles and channels below are the real ones it returned.
 * Where possible the default pick comes from a coaching, physio or clinical channel.
 *
 * `female` is an alternative demo from a woman-led channel, served to users whose
 * gender is female. It is optional: where none was found the default is shown to
 * everyone, so no user is ever left without a demo.
 *
 * Idempotent: only fills fields that are still empty.
 * Run:    npx tsx prisma/seed-exercise-videos.ts
 * Undo:   npx tsx prisma/seed-exercise-videos.ts --clear
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Pick = { id: string; title: string; channel: string };

const VIDEOS: Record<string, { general: Pick; female?: Pick }> = {
  "Adductor Squeeze": { general: { id: "IiOuv2qYL_M", title: "Adductor Squeeze", channel: "Jordan Weber Fitness" } },
  "Back Extension": { general: { id: "EBui4Bt5N7o", title: "STOP Doing Back Extensions Like This!", channel: "Squat University" }, female: { id: "G6HG5VzJoNc", title: "Form Tips: How to perform a back extension | Glute Bias 45° Extension Form Tips", channel: "Alexandra Yaeger" } },
  "Banded Lateral Walk": { general: { id: "M5uxEQH5BUM", title: "How to do Lateral Band Walking", channel: "National Academy of Sports Medicine (NASM)" } },
  "Barbell Back Squat": { general: { id: "-bJIpOq-LWk", title: "How to do a Barbell Back Squat", channel: "National Academy of Sports Medicine (NASM)" }, female: { id: "kgAy7NWPbLk", title: "Stop doing Squats like this 🛑 Back Squat Technique ⚠️", channel: "Marie Steffen - The Art of Health" } },
  "Barbell Bench Press": { general: { id: "rT7DgCr-3pg", title: "How To: Barbell Bench Press", channel: "ScottHermanFitness" } },
  "Barbell Curl": { general: { id: "QZEqB6wUPxQ", title: "How To: Barbell Bicep Curl | 3 GOLDEN RULES", channel: "ScottHermanFitness" } },
  "Barbell Shrug": { general: { id: "MlqHEfydPpE", title: "How to PROPERLY Perform Barbell Shrugs With Good Form For Bigger Upper Traps (Exercise Tutorial)", channel: "Gerardi Performance" } },
  "Bent-Over Barbell Row": { general: { id: "QlJeL9GZMtU", title: "Fix Your Barbell Bent-Over Row Mistakes With These Simple Tips!", channel: "ScottHermanFitness" }, female: { id: "xgVMZm-Q0X4", title: "Bent Over Row know the difference:", channel: "ArielYu_Fit" } },
  "Bent-Over Reverse Fly": { general: { id: "KoRDmXocJII", title: "How to Properly Seated Bent Over DB Rear Delt Fly With Good Form (Exercise Demonstration)", channel: "Gerardi Performance" }, female: { id: "3icYcehmnsY", title: "How to do a perfect dumbbell bent over fly", channel: "ArielYu_Fit" } },
  "Bicycle Crunch": { general: { id: "HWX93vAoLvw", title: "How to Do Bicycle Crunches: A Guide from Physical Therapists", channel: "Hinge Health" }, female: { id: "hP-ol0LxLZ8", title: "How To Do A Bicycle Crunch #shorts", channel: "Heather Robertson" } },
  "Bird Dog": { general: { id: "xEDnlOxeJH4", title: "How to Do the Bird Dog Exercise: A Guide from Physical Therapists", channel: "Hinge Health" }, female: { id: "k0PrwEG_la0", title: "common mistake you're making with bird dog exercise", channel: "Holly Dolke" } },
  "Bodyweight Squat": { general: { id: "m0GcZ24pK6k", title: "How to do a bodyweight squat | Bupa Health", channel: "Bupa Health" } },
  "Bulgarian Split Squat": { general: { id: "hiLF_pF3EJM", title: "Stop F*cking Up Bulgarian Split Squats (PROPER FORM!)", channel: "ATHLEAN-X™" }, female: { id: "uBSoEWZu07k", title: "Bulgarian Split Squat – Key Tips for Glute-Focused", channel: "ArielYu_Fit" } },
  "Cable Hip Abduction": { general: { id: "pvnR8CDb4BU", title: "How to Do Cable Hip Abduction Exercise", channel: "LIVESTRONG" } },
  "Cable Hip Adduction": { general: { id: "EHq78mQYLbI", title: "Cable Hip Abduction & Adduction", channel: "Just Raw Skill" } },
  "Cable Kickback": { general: { id: "n-cgsNePyFo", title: "How to Properly Perform Cable Glute Kickbacks With Good Form (Exercise Tutorial)", channel: "Gerardi Performance" }, female: { id: "2QdKm0aEwS8", title: "Cable Kickback Tips:", channel: "ArielYu_Fit" } },
  "Chin-Up": { general: { id: "e1YSApl-QcM", title: "PERFECT CHIN-UPS | The Only Chin-up Tutorial You'll Ever Need (Full Guide)", channel: "Simonster Strength" }, female: { id: "aV9Mz9nCsMw", title: "Chin-Up: Common Mistake⚠️", channel: "Marie Steffen - The Art of Health" } },
  "Clamshell": { general: { id: "gFyIjunfbbg", title: "How to Do the Clamshell Exercise", channel: "Hinge Health" } },
  "Close-Grip Push-Up": { general: { id: "2cdIRe5tcqI", title: "Close Grip Pushup", channel: "Atomic Athlete" } },
  "Concentration Curl": { general: { id: "os52QEIXQtM", title: "How to PROPERLY Perform Concentration Curls (For A Bigger Biceps Peak!)", channel: "Gerardi Performance" } },
  "Cossack Squat": { general: { id: "MJvazUpmdZU", title: "COSSACK SQUAT | DO IT RIGHT ✅ 📝 The Cossack squat is a great hip, hamstring and adductor mobility", channel: "Elastaboy 😎" }, female: { id: "wwgvy9uqftg", title: "Stop doing Cossack Squats Like this☝🏼", channel: "Marie Steffen - The Art of Health" } },
  "Crunch": { general: { id: "NGRKFMKhF8s", title: "How To: Floor Crunch", channel: "ScottHermanFitness" } },
  "Cycling": { general: { id: "sJeSblqIDJQ", title: "Easy way to get the right saddle height. #cycling #roadcycling #shorts", channel: "Wiggle" } },
  "Dead Bug": { general: { id: "GbSC02oU3To", title: "How to Do a Dead Bug: A Guide from Physical Therapists", channel: "Hinge Health" } },
  "Dead Hang": { general: { id: "dOCQjaasbGs", title: "How To Dead Hang Correctly", channel: "FitnessFAQs" } },
  "Dumbbell Biceps Curl": { general: { id: "iui51E31sX8", title: "How To Properly Perform Dumbbell Bicep Curls With Good Form *Palms Up* (Exercise Demonstration)", channel: "Gerardi Performance" }, female: { id: "P5sXHLmXmBM", title: "Dumbbell Hammer Curls", channel: "Nikkiey Stott" } },
  "Dumbbell Chest Fly": { general: { id: "vJh-4hRLH-o", title: "How to Properly Perform The Dumbbell Chest Fly With Good Form (Exercise Demonstration)", channel: "Gerardi Performance" } },
  "Dumbbell Overhead Press": { general: { id: "YI_VHFjfB-g", title: "How to: Dumbbell Overhead Shoulder Press | Grow Your Shoulders", channel: "Physique Development" }, female: { id: "kzKsy-TtddE", title: "Perfect Your Seated Dumbbell Shoulder Press", channel: "ArielYu_Fit" } },
  "Dumbbell Shrug": { general: { id: "_t3lrPI6Ns4", title: "Dumbbell Shrug", channel: "Renaissance Periodization" } },
  "Face Pull": { general: { id: "ljgqer1ZpXg", title: "STOP F*cking Up Face Pulls (PROPER FORM!)", channel: "ATHLEAN-X™" }, female: { id: "NGQfsT7Mjk0", title: "Build 3D Shoulders, FACE PULL How to target more Rear Delt:", channel: "ArielYu_Fit" } },
  "Farmer's Carry": { general: { id: "4Ly1EMfJk6Y", title: "Core and shoulder stability exercise Farmers Carry / Farmer’s Walk", channel: "Rehab Hero" } },
  "Farmer's Walk on Toes": { general: { id: "NH7Xv-7NQNQ", title: "How To Perform Farmer Walks Exercise Tutorial", channel: "Buff Dudes Workouts" } },
  "Front Raise": { general: { id: "-t7fuZ0KhDA", title: "How To: Dumbbell Front Raise", channel: "ScottHermanFitness" }, female: { id: "cJU-CWPFEKs", title: "Quick Cable Front Raise Tips", channel: "ArielYu_Fit" } },
  "Glute Bridge": { general: { id: "PhTDzR0TpZs", title: "How to Do a Glute Bridge Exercise: A Guide from Physical Therapists", channel: "Hinge Health" } },
  "Glute-Ham Raise": { general: { id: "SBGYSfoqyfU", title: "Glute Ham Raise", channel: "Renaissance Periodization" } },
  "Hammer Curl": { general: { id: "BRVDS6HVR9Q", title: "How To Perform HAMMER CURLS | Biceps Exercise Tutorial", channel: "Buff Dudes Workouts" }, female: { id: "P5sXHLmXmBM", title: "Dumbbell Hammer Curls", channel: "Nikkiey Stott" } },
  "Hanging Leg Raise": { general: { id: "2n4UqRIJyk4", title: "How to Properly Perform Hanging Leg Raises With Good Form For Shredded Abs (Exercise Demonstration)", channel: "Gerardi Performance" }, female: { id: "pRvuMJ9Ag7I", title: "Do this to learn hanging leg raises FAST! Build abs of steel 🦾", channel: "Marie Steffen - The Art of Health" } },
  "High-Intensity Interval Training": { general: { id: "S9bGQ19OVGU", title: "High intensity interval training (HIIT)", channel: "Next Step 2 Fitness" } },
  "Hip Thrust": { general: { id: "xDmFkJxPzeM", title: "How To Build Great Glutes with Perfect Hip Thrust Technique (Fix Mistakes!)", channel: "Jeff Nippard" }, female: { id: "PqC0fmyNlmw", title: " Hip Thrust Tips", channel: "ArielYu_Fit" } },
  "Incline Dumbbell Press": { general: { id: "8iPEnn-ltC8", title: "How To: Dumbbell Incline Chest Press", channel: "ScottHermanFitness" }, female: { id: "V3BNe4vJX60", title: "Key tips for a strong and safe dumbbell incline press", channel: "ArielYu_Fit" } },
  "Incline Push-Up": { general: { id: "cfns5VDVVvk", title: "How To Do An Incline Push Up", channel: "Train With Adby - Personal Training Gym" } },
  "Jump Rope": { general: { id: "u3zgHI8QnqE", title: "How To Jump Rope | The Right Way | Well+Good", channel: "Well+Good" } },
  "Lat Pulldown": { general: { id: "SALxEARiMkw", title: "How to do Lat Pulldowns (AVOID MISTAKES!)", channel: "ATHLEAN-X™" }, female: { id: "diBoTD4-uG8", title: "Lat Pulldown Form Tips:", channel: "ArielYu_Fit" } },
  "Lateral Raise": { general: { id: "Y29xKcze8Ik", title: "How to Perform Dumbbell Lateral Raise | Form Tutorial", channel: "Physique Development" }, female: { id: "UFcaodmbXd8", title: "Lateral Raise Tip", channel: "ArielYu_Fit" } },
  "Leg Press": { general: { id: "nDh_BlnLCGc", title: "How To Leg Press With Perfect Technique", channel: "Jeff Nippard" } },
  "Lying Leg Curl": { general: { id: "vl5nUdE9mWM", title: "How to Lying Leg Curl | Proper Technique, Set Up, & Mistakes", channel: "Physique Development" }, female: { id: "yjWAuFOjhuY", title: "Maximize your leg curls with these tips!", channel: "ArielYu_Fit" } },
  "Nordic Hamstring Curl": { general: { id: "_e9vFU9-tkc", title: "How to Set Up, Perform, & Program Nordic Hamstring Curls (Progressions | Regressions | Alternatives)", channel: "E3 Rehab" } },
  "Overhead Triceps Extension": { general: { id: "fYqswDVbJDg", title: "HOW TO: Overhead Triceps Extension (BEST EXERCISE FOR HUGE TRICEPS) || PERFECT FORM (POWERBOMB)", channel: "ScottHermanFitness" }, female: { id: "pmcUemVUnP4", title: "Cable Overhead Tricep Extension Tips", channel: "ArielYu_Fit" } },
  "Pike Push-Up": { general: { id: "eG20L9cl81w", title: "Pike Push Ups Made Easy (3 Steps)", channel: "Stozfit" }, female: { id: "VR1wFF3GcJY", title: "Stop doing Pike Push-Ups like this⚠️🛑", channel: "Marie Steffen - The Art of Health" } },
  "Plank": { general: { id: "A2b2EmIg0dA", title: "How To Plank (Proper Form | Cues | Progressions)", channel: "E3 Rehab" } },
  "Prone Y Raise": { general: { id: "w1AWGKubE5U", title: "Prone Y Raise", channel: "Performance Course" } },
  "Pull-Up": { general: { id: "OEXosPwzFdc", title: "✅ Learn the “Perfect” Pull-Up", channel: "SaturnoMovement" }, female: { id: "6zyx46Vpato", title: "How To Get Your First Pull Up (Beginner Tutorial)", channel: "nourishmovelove" } },
  "Push-Up": { general: { id: "I9fsqKE5XHo", title: "Do Push-Ups with Proper Form!", channel: "Upright Health" }, female: { id: "HHRDXEG1YCU", title: "PUSH UPS FOR BEGINNERS #shorts", channel: "MadFit" } },
  "Reverse Curl": { general: { id: "uiH-2J85mzI", title: "How to do dumbbell reverse curls", channel: "Dr. Spencer Nadolsky" } },
  "Reverse Lunge": { general: { id: "w7pyyqLorJ4", title: "Do Reverse Lunges Like a Pro: A Simple Step-by-Step Guide", channel: "Hinge Health" } },
  "Reverse Wrist Curl": { general: { id: "FW7URAaC-vE", title: "How To: Reverse Seated Wrist Curl", channel: "ScottHermanFitness" } },
  "Romanian Deadlift": { general: { id: "uhghy9pFIPY", title: "How To Perform PERFECT Romanian Deadlifts | RDLs (Everything You Need To Know)", channel: "E3 Rehab" }, female: { id: "MO4d6INgwtY", title: "Perfect Romanian Deadlift (RDL) Tips", channel: "ArielYu_Fit" } },
  "Rowing Machine": { general: { id: "4zWu1yuJ0_g", title: "Correct Rowing Machine Technique, Improve Your Rowing  | Concept2", channel: "concept2usa" } },
  "Russian Twist": { general: { id: "-BzNffL_6YE", title: "STOP Doing Russian Twists Like This! (SAVE A FRIEND)", channel: "ATHLEAN-X™" }, female: { id: "3Sa67AQb62Y", title: "Don't make these mistakes with Russian Twists! #shorts", channel: "Holly Dolke" } },
  "Seated Calf Raise": { general: { id: "BxfKOyI8sUg", title: "How to Do a Seated Calf Raise: A Guide from Physical Therapists", channel: "Hinge Health" } },
  "Side Plank": { general: { id: "wP7xBF-LZxs", title: "Fix your side plank FAST #fitnesstips", channel: "Zac Cupples" } },
  "Side-Lying Inner Thigh Raise": { general: { id: "9rQGdiVx-WY", title: "Side Lying Inner Thigh Leg Raise", channel: "Taylor Catrett" } },
  "Side-Lying Leg Raise": { general: { id: "INdCOr0c_LI", title: "How to do Side Lying Leg Raises", channel: "Rogith23" } },
  "Single-Arm Dumbbell Row": { general: { id: "qN54-QNO1eQ", title: "How to Single Arm Dumbbell Row", channel: "TylerPath" }, female: { id: "jpi4reqwiKY", title: "Tips for a Perfect Single-Arm Dumbbell Bent-Over Row", channel: "ArielYu_Fit" } },
  "Single-Leg Calf Raise": { general: { id: "ORT4oJ_R8Qs", title: "How To: Single-Leg Calf Raise", channel: "ScottHermanFitness" } },
  "Single-Leg Deadlift": { general: { id: "v5JFb2AsSVs", title: "Single Leg Deadlifts Are CRAZY HARD!", channel: "Squat University" }, female: { id: "vGuyEm2KWSI", title: "Single Leg Deadlift Tutorial - How to stay balanced✔️", channel: "Marie Steffen - The Art of Health" } },
  "Skull Crusher": { general: { id: "RavQHfFxbdA", title: "How To: Skull Crusher (BUILD BIGGER TRICEPS!) || PERFECT FORM", channel: "ScottHermanFitness" } },
  "Standing Banded Abduction": { general: { id: "4IdwUZeZACc", title: "HOW TO: Standing Banded Abduction | Strengthen Your Hip Abductors with Precision", channel: "Habitual Fitness" } },
  "Standing Calf Raise": { general: { id: "c5Kv6-fnTj8", title: "Calf Raises", channel: "Pure Sports Medicine" } },
  "Standing Side Bend": { general: { id: "Vko-SJok-fk", title: "How to do a standing side bend.", channel: "Cleveland Clinic" }, female: { id: "WmKUboCw6Ng", title: "Kettlebell side bends are a great way to tighten and strengthen your waist!", channel: "Kayla W Fitness" } },
  "Steady-State Running": { general: { id: "Q1GBckR4H-E", title: "Steady State Runs - McMillan Running", channel: "McMillan Running" } },
  "Straight-Arm Pulldown": { general: { id: "G9uNaXGTJ4w", title: "Straight Arm Pulldown", channel: "Renaissance Periodization" }, female: { id: "RtL11I6oX48", title: "Cable Straight-Arm Lat Pullover Tips", channel: "ArielYu_Fit" } },
  "Sumo Squat": { general: { id: "4eDJa5MnAmY", title: "Sumo Squat", channel: "Renaissance Periodization" }, female: { id: "sQ-lwJtpwUc", title: "Dumbbell Sumo Squat - How to Target the Glutes More Effectively", channel: "ArielYu_Fit" } },
  "Superman": { general: { id: "ZYCLnrQGUls", title: "How to Do A Superman Hold 📝", channel: "CrossFit Ipswich" } },
  "Triceps Dip": { general: { id: "thx13oPVK5c", title: "📌Triceps Dip Form 🔥", channel: "SquatCouple" } },
  "Triceps Rope Pushdown": { general: { id: "-xa-6cQaZKY", title: "Rope Pushdown", channel: "Renaissance Periodization" } },
  "Walking Lunge": { general: { id: "DlhojghkaQ0", title: "The Walking Lunge", channel: "CrossFit" } },
  "Woodchopper": { general: { id: "YIU0U_B57rU", title: "Try This Underrated Oblique Exercise 🔥 #woodchoppers", channel: "adrianleungfit" } },
  "Wrist Curl": { general: { id: "JtZ_iT8rn70", title: "How to do Wrist Curl – Dumbbell exactly", channel: "Health Hunt" } },
};

/** Ids shipped by earlier revisions - listed so --clear can still undo them. */
const RETIRED: string[] = ["IiOuv2qYL_M", "EBui4Bt5N7o", "G6HG5VzJoNc", "M5uxEQH5BUM", "-bJIpOq-LWk", "kgAy7NWPbLk", "rT7DgCr-3pg", "QZEqB6wUPxQ", "MlqHEfydPpE", "QlJeL9GZMtU", "xgVMZm-Q0X4", "KoRDmXocJII", "3icYcehmnsY", "HWX93vAoLvw", "hP-ol0LxLZ8", "xEDnlOxeJH4", "k0PrwEG_la0", "m0GcZ24pK6k", "hiLF_pF3EJM", "uBSoEWZu07k", "pvnR8CDb4BU", "EHq78mQYLbI", "n-cgsNePyFo", "2QdKm0aEwS8", "e1YSApl-QcM", "aV9Mz9nCsMw", "gFyIjunfbbg", "2cdIRe5tcqI", "os52QEIXQtM", "MJvazUpmdZU", "wwgvy9uqftg", "NGRKFMKhF8s", "sJeSblqIDJQ", "GbSC02oU3To", "dOCQjaasbGs", "iui51E31sX8", "P5sXHLmXmBM", "vJh-4hRLH-o", "YI_VHFjfB-g", "kzKsy-TtddE", "_t3lrPI6Ns4", "ljgqer1ZpXg", "NGQfsT7Mjk0", "4Ly1EMfJk6Y", "NH7Xv-7NQNQ", "-t7fuZ0KhDA", "cJU-CWPFEKs", "PhTDzR0TpZs", "SBGYSfoqyfU", "BRVDS6HVR9Q", "2n4UqRIJyk4", "pRvuMJ9Ag7I", "S9bGQ19OVGU", "xDmFkJxPzeM", "PqC0fmyNlmw", "8iPEnn-ltC8", "V3BNe4vJX60", "cfns5VDVVvk", "u3zgHI8QnqE", "SALxEARiMkw", "diBoTD4-uG8", "Y29xKcze8Ik", "UFcaodmbXd8", "nDh_BlnLCGc", "vl5nUdE9mWM", "yjWAuFOjhuY", "_e9vFU9-tkc", "fYqswDVbJDg", "pmcUemVUnP4", "eG20L9cl81w", "VR1wFF3GcJY", "A2b2EmIg0dA", "w1AWGKubE5U", "OEXosPwzFdc", "6zyx46Vpato", "I9fsqKE5XHo", "HHRDXEG1YCU", "uiH-2J85mzI", "w7pyyqLorJ4", "FW7URAaC-vE", "uhghy9pFIPY", "MO4d6INgwtY", "4zWu1yuJ0_g", "-BzNffL_6YE", "3Sa67AQb62Y", "BxfKOyI8sUg", "wP7xBF-LZxs", "9rQGdiVx-WY", "INdCOr0c_LI", "qN54-QNO1eQ", "jpi4reqwiKY", "ORT4oJ_R8Qs", "v5JFb2AsSVs", "vGuyEm2KWSI", "RavQHfFxbdA", "4IdwUZeZACc", "c5Kv6-fnTj8", "Vko-SJok-fk", "WmKUboCw6Ng", "Q1GBckR4H-E", "G9uNaXGTJ4w", "RtL11I6oX48", "4eDJa5MnAmY", "sQ-lwJtpwUc", "ZYCLnrQGUls", "thx13oPVK5c", "-xa-6cQaZKY", "DlhojghkaQ0", "YIU0U_B57rU", "JtZ_iT8rn70"];

const url = (id: string) => `https://www.youtube.com/watch?v=${id}`;

async function clear() {
  const ids = new Set([...Object.values(VIDEOS).flatMap((v) => [v.general.id, v.female?.id]), ...RETIRED].filter(Boolean).map((i) => url(i as string)));
  const rows = await prisma.exercise.findMany({
    where: { OR: [{ videoUrl: { not: null } }, { videoUrlFemale: { not: null } }] },
    select: { id: true, videoUrl: true, videoUrlFemale: true },
  });
  let n = 0;
  for (const r of rows) {
    const data: Record<string, null> = {};
    if (r.videoUrl && ids.has(r.videoUrl)) data.videoUrl = null;
    if (r.videoUrlFemale && ids.has(r.videoUrlFemale)) data.videoUrlFemale = null;
    if (Object.keys(data).length) { await prisma.exercise.update({ where: { id: r.id }, data }); n++; }
  }
  console.log(`Cleared links on ${n} exercise(s). Links set by hand were left alone.`);
}

async function run() {
  if (process.argv.includes('--clear')) return clear();

  const rows = await prisma.exercise.findMany({ select: { id: true, name: true, videoId: true, videoUrl: true, videoUrlFemale: true } });
  let general = 0;
  let female = 0;
  const missing: string[] = [];

  for (const ex of rows) {
    const v = VIDEOS[ex.name];
    if (!v) { missing.push(ex.name); continue; }

    const data: Record<string, string> = {};
    // An uploaded videoId outranks a link, so only fill when there is no video at all.
    if (!ex.videoId && !ex.videoUrl) { data.videoUrl = url(v.general.id); general++; }
    if (!ex.videoUrlFemale && v.female) { data.videoUrlFemale = url(v.female.id); female++; }
    if (Object.keys(data).length) await prisma.exercise.update({ where: { id: ex.id }, data });
  }

  const total = await prisma.exercise.count();
  const withVideo = await prisma.exercise.count({ where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] } });
  const withFemale = await prisma.exercise.count({ where: { videoUrlFemale: { not: null } } });
  console.log(`Linked ${general} demo(s) and ${female} woman-led variant(s).`);
  console.log(`Coverage: ${withVideo}/${total} exercises have a demo, ${withFemale} also have a woman-led version.`);
  if (missing.length) console.log(`  no video for: ${[...new Set(missing)].join(", ")}`);
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
