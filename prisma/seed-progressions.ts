import { PrismaClient } from '@prisma/client';

/**
 * Exercise progression ladder — fills Exercise.easierId / harderId across the
 * library so the session can show "too hard? → X / too easy? → Y" chips.
 *
 * Links are pointers, not pairs: an exercise may be the "easier" of several
 * movements without those being its own "harder". Matching is by
 * (muscle group name, exercise name) because names repeat across groups
 * (Romanian Deadlift ×3, Bicycle Crunch ×2, …). Idempotent — safe to re-run;
 * never overwrites a link an admin has set to something else? It does
 * overwrite: this script is the source of truth for the default ladder, and
 * admin edits after seeding survive only until the next run — acceptable
 * because deploy/seed.ps1 is run deliberately, not on a schedule.
 */

const prisma = new PrismaClient();

type Ref = [group: string, name: string];
type Row = { at: Ref; easier?: Ref; harder?: Ref };

const LADDER: Row[] = [
  // ---- Shoulders ----
  { at: ['Shoulders', 'Front Raise'], harder: ['Shoulders', 'Lateral Raise'] },
  { at: ['Shoulders', 'Lateral Raise'], easier: ['Shoulders', 'Front Raise'], harder: ['Shoulders', 'Dumbbell Overhead Press'] },
  { at: ['Shoulders', 'Dumbbell Overhead Press'], easier: ['Shoulders', 'Lateral Raise'], harder: ['Shoulders', 'Pike Push-Up'] },
  { at: ['Shoulders', 'Pike Push-Up'], easier: ['Shoulders', 'Dumbbell Overhead Press'] },
  { at: ['Shoulders', 'Bent-Over Reverse Fly'], easier: ['Traps', 'Prone Y Raise'], harder: ['Traps', 'Face Pull'] },
  // ---- Chest ----
  { at: ['Chest', 'Incline Push-Up'], harder: ['Chest', 'Push-Up'] },
  { at: ['Chest', 'Push-Up'], easier: ['Chest', 'Incline Push-Up'], harder: ['Chest', 'Barbell Bench Press'] },
  { at: ['Chest', 'Barbell Bench Press'], easier: ['Chest', 'Push-Up'] },
  { at: ['Chest', 'Dumbbell Chest Fly'], harder: ['Chest', 'Incline Dumbbell Press'] },
  { at: ['Chest', 'Incline Dumbbell Press'], easier: ['Chest', 'Dumbbell Chest Fly'], harder: ['Chest', 'Barbell Bench Press'] },
  // ---- Biceps ----
  { at: ['Biceps', 'Dumbbell Biceps Curl'], harder: ['Biceps', 'Barbell Curl'] },
  { at: ['Biceps', 'Barbell Curl'], easier: ['Biceps', 'Dumbbell Biceps Curl'], harder: ['Biceps', 'Chin-Up'] },
  { at: ['Biceps', 'Chin-Up'], easier: ['Biceps', 'Barbell Curl'] },
  { at: ['Biceps', 'Hammer Curl'], harder: ['Biceps', 'Concentration Curl'] },
  { at: ['Biceps', 'Concentration Curl'], easier: ['Biceps', 'Hammer Curl'] },
  // ---- Forearm ----
  { at: ['Forearm', 'Dead Hang'], harder: ['Forearm', "Farmer's Carry"] },
  { at: ['Forearm', "Farmer's Carry"], easier: ['Forearm', 'Dead Hang'] },
  { at: ['Forearm', 'Wrist Curl'], harder: ['Forearm', 'Reverse Curl'] },
  { at: ['Forearm', 'Reverse Curl'], easier: ['Forearm', 'Wrist Curl'] },
  // ---- Abs ----
  { at: ['Abs', 'Dead Bug'], harder: ['Abs', 'Crunch'] },
  { at: ['Abs', 'Crunch'], easier: ['Abs', 'Dead Bug'], harder: ['Abs', 'Bicycle Crunch'] },
  { at: ['Abs', 'Bicycle Crunch'], easier: ['Abs', 'Crunch'], harder: ['Abs', 'Hanging Leg Raise'] },
  { at: ['Abs', 'Hanging Leg Raise'], easier: ['Abs', 'Bicycle Crunch'] },
  { at: ['Abs', 'Plank'], easier: ['Abs', 'Dead Bug'], harder: ['Abs', 'Hanging Leg Raise'] },
  // ---- Obliques ----
  { at: ['Obliques', 'Standing Side Bend'], harder: ['Obliques', 'Russian Twist'] },
  { at: ['Obliques', 'Russian Twist'], easier: ['Obliques', 'Standing Side Bend'], harder: ['Obliques', 'Woodchopper'] },
  { at: ['Obliques', 'Woodchopper'], easier: ['Obliques', 'Russian Twist'] },
  { at: ['Obliques', 'Side Plank'], easier: ['Obliques', 'Standing Side Bend'], harder: ['Obliques', 'Russian Twist'] },
  { at: ['Obliques', 'Bicycle Crunch'], easier: ['Obliques', 'Standing Side Bend'], harder: ['Obliques', 'Woodchopper'] },
  // ---- Quads ----
  { at: ['Quads', 'Bodyweight Squat'], harder: ['Quads', 'Leg Press'] },
  { at: ['Quads', 'Leg Press'], easier: ['Quads', 'Bodyweight Squat'], harder: ['Quads', 'Barbell Back Squat'] },
  { at: ['Quads', 'Barbell Back Squat'], easier: ['Quads', 'Leg Press'] },
  { at: ['Quads', 'Walking Lunge'], easier: ['Quads', 'Bodyweight Squat'], harder: ['Quads', 'Bulgarian Split Squat'] },
  { at: ['Quads', 'Bulgarian Split Squat'], easier: ['Quads', 'Walking Lunge'] },
  // ---- Abductors ----
  { at: ['Abductors', 'Clamshell'], harder: ['Abductors', 'Side-Lying Leg Raise'] },
  { at: ['Abductors', 'Side-Lying Leg Raise'], easier: ['Abductors', 'Clamshell'], harder: ['Abductors', 'Banded Lateral Walk'] },
  { at: ['Abductors', 'Banded Lateral Walk'], easier: ['Abductors', 'Side-Lying Leg Raise'], harder: ['Abductors', 'Cable Hip Abduction'] },
  { at: ['Abductors', 'Cable Hip Abduction'], easier: ['Abductors', 'Banded Lateral Walk'] },
  { at: ['Abductors', 'Standing Banded Abduction'], easier: ['Abductors', 'Clamshell'], harder: ['Abductors', 'Cable Hip Abduction'] },
  // ---- Adductors ----
  { at: ['Adductors', 'Adductor Squeeze'], harder: ['Adductors', 'Side-Lying Inner Thigh Raise'] },
  { at: ['Adductors', 'Side-Lying Inner Thigh Raise'], easier: ['Adductors', 'Adductor Squeeze'], harder: ['Adductors', 'Sumo Squat'] },
  { at: ['Adductors', 'Sumo Squat'], easier: ['Adductors', 'Side-Lying Inner Thigh Raise'], harder: ['Adductors', 'Cossack Squat'] },
  { at: ['Adductors', 'Cossack Squat'], easier: ['Adductors', 'Sumo Squat'] },
  { at: ['Adductors', 'Cable Hip Adduction'], easier: ['Adductors', 'Side-Lying Inner Thigh Raise'] },
  // ---- Cardio ----
  { at: ['Cardio', 'Cycling'], harder: ['Cardio', 'Steady-State Running'] },
  { at: ['Cardio', 'Steady-State Running'], easier: ['Cardio', 'Cycling'], harder: ['Cardio', 'Jump Rope'] },
  { at: ['Cardio', 'Jump Rope'], easier: ['Cardio', 'Steady-State Running'], harder: ['Cardio', 'High-Intensity Interval Training'] },
  { at: ['Cardio', 'High-Intensity Interval Training'], easier: ['Cardio', 'Jump Rope'] },
  { at: ['Cardio', 'Rowing Machine'], easier: ['Cardio', 'Cycling'], harder: ['Cardio', 'High-Intensity Interval Training'] },
  // ---- Triceps ----
  { at: ['Triceps', 'Close-Grip Push-Up'], easier: ['Chest', 'Push-Up'], harder: ['Triceps', 'Triceps Dip'] },
  { at: ['Triceps', 'Triceps Dip'], easier: ['Triceps', 'Close-Grip Push-Up'] },
  { at: ['Triceps', 'Overhead Triceps Extension'], harder: ['Triceps', 'Skull Crusher'] },
  { at: ['Triceps', 'Triceps Rope Pushdown'], harder: ['Triceps', 'Skull Crusher'] },
  { at: ['Triceps', 'Skull Crusher'], easier: ['Triceps', 'Triceps Rope Pushdown'] },
  // ---- Traps ----
  { at: ['Traps', 'Dumbbell Shrug'], harder: ['Traps', 'Barbell Shrug'] },
  { at: ['Traps', 'Barbell Shrug'], easier: ['Traps', 'Dumbbell Shrug'] },
  { at: ['Traps', 'Prone Y Raise'], harder: ['Traps', 'Face Pull'] },
  { at: ['Traps', 'Face Pull'], easier: ['Traps', 'Prone Y Raise'] },
  { at: ['Traps', "Farmer's Carry"], easier: ['Traps', 'Dumbbell Shrug'] },
  // ---- Lats ----
  { at: ['Lats', 'Lat Pulldown'], harder: ['Lats', 'Pull-Up'] },
  { at: ['Lats', 'Pull-Up'], easier: ['Lats', 'Lat Pulldown'] },
  { at: ['Lats', 'Straight-Arm Pulldown'], easier: ['Lats', 'Lat Pulldown'], harder: ['Lats', 'Pull-Up'] },
  { at: ['Lats', 'Single-Arm Dumbbell Row'], harder: ['Lats', 'Bent-Over Barbell Row'] },
  { at: ['Lats', 'Bent-Over Barbell Row'], easier: ['Lats', 'Single-Arm Dumbbell Row'] },
  // ---- Lower Back ----
  { at: ['Lower Back', 'Bird Dog'], harder: ['Lower Back', 'Superman'] },
  { at: ['Lower Back', 'Superman'], easier: ['Lower Back', 'Bird Dog'], harder: ['Lower Back', 'Back Extension'] },
  { at: ['Lower Back', 'Back Extension'], easier: ['Lower Back', 'Superman'], harder: ['Lower Back', 'Romanian Deadlift'] },
  { at: ['Lower Back', 'Romanian Deadlift'], easier: ['Lower Back', 'Back Extension'] },
  { at: ['Lower Back', 'Glute Bridge'], easier: ['Lower Back', 'Bird Dog'], harder: ['Lower Back', 'Back Extension'] },
  // ---- Glutes ----
  { at: ['Glutes', 'Glute Bridge'], harder: ['Glutes', 'Hip Thrust'] },
  { at: ['Glutes', 'Hip Thrust'], easier: ['Glutes', 'Glute Bridge'] },
  { at: ['Glutes', 'Reverse Lunge'], harder: ['Quads', 'Bulgarian Split Squat'] },
  { at: ['Glutes', 'Cable Kickback'], easier: ['Glutes', 'Glute Bridge'] },
  { at: ['Glutes', 'Romanian Deadlift'], easier: ['Glutes', 'Glute Bridge'] },
  // ---- Hamstrings ----
  { at: ['Hamstrings', 'Lying Leg Curl'], harder: ['Hamstrings', 'Romanian Deadlift'] },
  { at: ['Hamstrings', 'Romanian Deadlift'], easier: ['Hamstrings', 'Lying Leg Curl'], harder: ['Hamstrings', 'Single-Leg Deadlift'] },
  { at: ['Hamstrings', 'Single-Leg Deadlift'], easier: ['Hamstrings', 'Romanian Deadlift'], harder: ['Hamstrings', 'Nordic Hamstring Curl'] },
  { at: ['Hamstrings', 'Nordic Hamstring Curl'], easier: ['Hamstrings', 'Single-Leg Deadlift'] },
  { at: ['Hamstrings', 'Glute-Ham Raise'], easier: ['Hamstrings', 'Romanian Deadlift'] },
  // ---- Calves ----
  { at: ['Calves', 'Seated Calf Raise'], harder: ['Calves', 'Single-Leg Calf Raise'] },
  { at: ['Calves', 'Standing Calf Raise'], harder: ['Calves', 'Single-Leg Calf Raise'] },
  { at: ['Calves', 'Single-Leg Calf Raise'], easier: ['Calves', 'Standing Calf Raise'] },
  { at: ['Calves', 'Jump Rope'], easier: ['Calves', 'Standing Calf Raise'] },
  { at: ['Calves', "Farmer's Walk on Toes"], easier: ['Calves', 'Standing Calf Raise'] },
];

async function main() {
  const all = await prisma.exercise.findMany({
    select: { id: true, name: true, muscleGroup: { select: { name: true } } },
  });
  const byRef = new Map<string, string>();
  for (const e of all) byRef.set(`${e.muscleGroup.name}::${e.name}`, e.id);
  const idOf = ([g, n]: Ref) => byRef.get(`${g}::${n}`);

  let linked = 0;
  let missing = 0;
  for (const row of LADDER) {
    const id = idOf(row.at);
    if (!id) {
      console.warn(`  skip (not found): ${row.at[0]} / ${row.at[1]}`);
      missing++;
      continue;
    }
    const easierId = row.easier ? idOf(row.easier) ?? null : null;
    const harderId = row.harder ? idOf(row.harder) ?? null : null;
    if (row.easier && !easierId) console.warn(`  easier missing for ${row.at[1]}: ${row.easier[1]}`);
    if (row.harder && !harderId) console.warn(`  harder missing for ${row.at[1]}: ${row.harder[1]}`);
    await prisma.exercise.update({ where: { id }, data: { easierId, harderId } });
    linked++;
  }
  console.log(`[progressions] linked ${linked} exercises (${missing} not found).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
