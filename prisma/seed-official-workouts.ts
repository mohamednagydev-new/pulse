/**
 * Three CoachWorkouts for the official coach account — one per weekly live
 * slot (Full-Body Kickoff / HIIT Express / Yoga Wind-Down). The recurring
 * session job links these via coachWorkoutId, so every auto-created session
 * has a real "Start together" workout with enriched exercises, not just text.
 *
 * Idempotent: skips any workout the coach already has with the same title.
 * Run: npx tsx prisma/seed-official-workouts.ts   (works on dev and server)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const OFFICIAL = process.env.OFFICIAL_COACH_EMAIL ?? 'coach@pulse.geddo.online';

const WORKOUTS = [
  {
    title: 'Full-Body Kickoff',
    muscleFocus: 'Full body',
    description: 'The Saturday live session workout — 3 rounds, 45s work / 15s rest, all levels.',
    exercises: [
      { name: 'Squat', sets: '3', reps: '45s', instructions: ['Feet shoulder-width, chest up.', 'Sit back and down, knees tracking over toes.', 'Drive through your heels to stand.'] },
      { name: 'Push-ups', sets: '3', reps: '45s', instructions: ['Hands under shoulders, body in one line.', 'Knees down is a valid version — keep the line.', 'Lower with control, press up strong.'] },
      { name: 'Plank', sets: '3', reps: '45s', instructions: ['Elbows under shoulders.', 'Squeeze glutes and brace your core.', 'Breathe — no holding your breath.'] },
      { name: 'Lunges', sets: '3', reps: '45s', instructions: ['Step forward, both knees to ~90°.', 'Front heel stays down.', 'Alternate legs each rep.'] },
      { name: 'Glute Bridge', sets: '3', reps: '45s', instructions: ['Heels close to your hips.', 'Drive through the heels, squeeze at the top.', 'One second pause up top, lower with control.'] },
    ],
  },
  {
    title: 'HIIT Express',
    muscleFocus: 'Cardio',
    description: 'The Tuesday live burner — 5 rounds, 40s work / 20s rest. Your pace, just don’t stop.',
    exercises: [
      { name: 'Jumping Jacks', sets: '5', reps: '40s', instructions: ['Soft knees on landing.', 'Full arm swing overhead.'] },
      { name: 'High Knees', sets: '5', reps: '40s', instructions: ['Drive knees to hip height.', 'Stay on the balls of your feet.', 'Pump the arms.'] },
      { name: 'Mountain Climbers', sets: '5', reps: '40s', instructions: ['Shoulders over wrists.', 'Hips level — no piking.', 'Drive knees straight to chest.'] },
      { name: 'Burpees', sets: '5', reps: '40s', instructions: ['Step back instead of jumping if you are new.', 'Chest to floor optional — keep moving.', 'Finish tall each rep.'] },
    ],
  },
  {
    title: 'Yoga Wind-Down',
    muscleFocus: 'Mobility',
    description: 'The Thursday wind-down — slow flow, 45-60s per move. Stretch to a gentle pull, never pain.',
    exercises: [
      { name: 'Deep Breathing', sets: '1', reps: '2 min', instructions: ['Sit tall or lie down.', 'In through the nose 4s, out through the mouth 6s.'] },
      { name: 'Cat-Cow', sets: '1', reps: '60s', instructions: ['On all fours.', 'Inhale: arch and look up. Exhale: round and tuck.', 'Move with the breath.'] },
      { name: "Child's Pose", sets: '1', reps: '60s', instructions: ['Knees wide, big toes together.', 'Arms long, forehead to the mat.', 'Breathe into your back.'] },
      { name: 'Hamstring Stretch', sets: '1', reps: '45s each', instructions: ['One leg long, hinge from the hips.', 'Back flat — depth comes later.'] },
      { name: 'Floor Twist', sets: '1', reps: '45s each', instructions: ['Knees fall to one side, shoulders stay down.', 'Look the opposite way.'] },
      { name: 'Relax', sets: '1', reps: '3 min', instructions: ['Flat on your back, palms up.', 'Let the floor hold you.'] },
    ],
  },
];

async function main() {
  const coach = await prisma.user.findUnique({ where: { email: OFFICIAL }, select: { id: true, firstName: true } });
  if (!coach) {
    console.log(`No official coach account (${OFFICIAL}) in this DB — nothing to do.`);
    return;
  }
  let created = 0;
  for (const w of WORKOUTS) {
    const exists = await prisma.coachWorkout.findFirst({ where: { coachUserId: coach.id, title: w.title }, select: { id: true } });
    if (exists) { console.log(`  = ${w.title} (already there)`); continue; }
    await prisma.coachWorkout.create({
      data: {
        coachUserId: coach.id,
        title: w.title,
        description: w.description,
        muscleFocus: w.muscleFocus,
        exercises: JSON.stringify(w.exercises),
      },
    });
    created++;
    console.log(`  + ${w.title}`);
  }
  console.log(`Done — ${created} workout(s) created for ${coach.firstName} (${OFFICIAL}).`);
}

main().finally(() => prisma.$disconnect());
