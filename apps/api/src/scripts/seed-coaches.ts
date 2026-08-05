/**
 * Seeds demo coaches, their workouts, multi-day programs, and a few ratings.
 * Idempotent: wipes anything under the @demo.pulse domain first, then recreates.
 * Run:  cd apps/api && ../../node_modules/.bin/tsx src/scripts/seed-coaches.ts
 */
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

const DEMO_DOMAIN = 'demo.pulse';

type Ex = { name: string; sets: string; reps: string; instructions?: string[] };
type WorkoutSeed = { key: string; title: string; muscleFocus: string; description?: string; exercises: Ex[] };
type ProgramSeed = { title: string; description: string; days: { label: string; workoutKey: string }[] };
type CoachSeed = {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio: string;
  specialties: string[];
  verified: boolean;
  featured: boolean;
  xp: number;
  level: number;
  streak: number;
  workouts: WorkoutSeed[];
  programs: ProgramSeed[];
};

const ex = (name: string, sets: string, reps: string, ...instructions: string[]): Ex => ({ name, sets, reps, instructions });

const COACHES: CoachSeed[] = [
  {
    firstName: 'Layla', lastName: 'Hassan', email: `layla@${DEMO_DOMAIN}`,
    headline: 'Strength & hypertrophy coach · 8 yrs',
    bio: 'I build strong, confident lifters — women and men — with progressive overload and zero fluff. Certified S&C, powerlifting background.',
    specialties: ['Strength', 'Hypertrophy', 'Powerlifting'],
    verified: true, featured: true, xp: 4200, level: 12, streak: 46,
    workouts: [
      { key: 'push', title: 'Push Day — Chest, Shoulders, Triceps', muscleFocus: 'Chest · Shoulders · Triceps', exercises: [
        ex('Barbell Bench Press', '4 sets', '6–8 reps', 'Retract the shoulder blades', 'Bar to mid-chest', 'Drive through the floor'),
        ex('Seated Dumbbell Shoulder Press', '3 sets', '8–10 reps', 'Neutral spine', 'Press to lockout'),
        ex('Incline Dumbbell Press', '3 sets', '10–12 reps'),
        ex('Cable Lateral Raise', '3 sets', '12–15 reps', 'Lead with the elbow'),
        ex('Rope Triceps Pushdown', '3 sets', '12–15 reps'),
      ]},
      { key: 'pull', title: 'Pull Day — Back & Biceps', muscleFocus: 'Back · Biceps', exercises: [
        ex('Deadlift', '4 sets', '5 reps', 'Brace the core', 'Push the floor away'),
        ex('Pull-Up', '3 sets', 'AMRAP', 'Full hang to chin over bar'),
        ex('Chest-Supported Row', '3 sets', '10–12 reps', 'Squeeze the shoulder blades'),
        ex('Face Pull', '3 sets', '15 reps'),
        ex('EZ-Bar Curl', '3 sets', '10–12 reps'),
      ]},
      { key: 'legs', title: 'Leg Day — Quads, Hams, Glutes', muscleFocus: 'Quads · Hamstrings · Glutes', exercises: [
        ex('Back Squat', '4 sets', '6–8 reps', 'Sit between the hips', 'Knees track over toes'),
        ex('Romanian Deadlift', '3 sets', '8–10 reps', 'Hinge at the hips', 'Feel the hamstring stretch'),
        ex('Bulgarian Split Squat', '3 sets', '10 reps / leg'),
        ex('Leg Press', '3 sets', '12–15 reps'),
        ex('Standing Calf Raise', '4 sets', '15–20 reps'),
      ]},
    ],
    programs: [
      { title: '6-Week Push/Pull/Legs', description: 'Classic 3-day PPL split for building muscle and strength. Repeat weekly, add weight when you hit the top of the rep range.', days: [
        { label: 'Mon · Push', workoutKey: 'push' },
        { label: 'Wed · Pull', workoutKey: 'pull' },
        { label: 'Fri · Legs', workoutKey: 'legs' },
      ]},
    ],
  },
  {
    firstName: 'Marcus', lastName: 'Reed', email: `marcus@${DEMO_DOMAIN}`,
    headline: 'HIIT & conditioning · fat loss specialist',
    bio: 'Short, brutal, effective. I coach metabolic conditioning and athletic engines. No gym? No problem — most of my work is bodyweight and kettlebell.',
    specialties: ['HIIT', 'Conditioning', 'Fat Loss'],
    verified: true, featured: true, xp: 3600, level: 10, streak: 33,
    workouts: [
      { key: 'emom', title: 'Full-Body EMOM Burner', muscleFocus: 'Full Body · Conditioning', exercises: [
        ex('Kettlebell Swing', '5 rounds', '15 reps', 'Snap the hips', 'Bell floats to eye level'),
        ex('Burpee', '5 rounds', '10 reps'),
        ex('Goblet Squat', '5 rounds', '12 reps'),
        ex('Mountain Climber', '5 rounds', '30 sec'),
      ]},
      { key: 'core', title: 'Core & Cardio Finisher', muscleFocus: 'Core · Cardio', exercises: [
        ex('Plank', '3 sets', '45–60 sec', 'Squeeze glutes', 'Ribs down'),
        ex('Hollow Hold', '3 sets', '30 sec'),
        ex('Russian Twist', '3 sets', '20 reps'),
        ex('High Knees', '3 sets', '40 sec'),
      ]},
      { key: 'sprint', title: 'Interval Sprint Session', muscleFocus: 'Legs · Cardio', exercises: [
        ex('Sprint Interval', '8 rounds', '20s on / 40s off', 'Max effort on the work'),
        ex('Jump Squat', '4 sets', '12 reps'),
        ex('Walking Lunge', '3 sets', '20 steps'),
      ]},
    ],
    programs: [
      { title: '4-Week Shred Circuit', description: 'A high-intensity 3-day conditioning block to drop body fat while keeping muscle. Keep rest short and intensity high.', days: [
        { label: 'Day 1 · EMOM', workoutKey: 'emom' },
        { label: 'Day 2 · Core & Cardio', workoutKey: 'core' },
        { label: 'Day 3 · Sprints', workoutKey: 'sprint' },
      ]},
    ],
  },
  {
    firstName: 'Nadia', lastName: 'Farouk', email: `nadia@${DEMO_DOMAIN}`,
    headline: 'Yoga & mobility · move without pain',
    bio: 'Vinyasa and mobility coach helping busy people undo desk posture and move freely. Breath-led, accessible for every body.',
    specialties: ['Yoga', 'Mobility', 'Flexibility'],
    verified: true, featured: false, xp: 2900, level: 9, streak: 61,
    workouts: [
      { key: 'flow', title: 'Morning Vinyasa Flow', muscleFocus: 'Full Body · Mobility', exercises: [
        ex('Sun Salutation A', '3 rounds', '5 breaths each', 'Link movement to breath'),
        ex('Warrior II Flow', '2 rounds', '30s / side'),
        ex('Downward Dog to Cobra', '5 reps', 'slow', 'Lengthen the spine'),
        ex('Seated Forward Fold', '1 set', '90 sec'),
      ]},
      { key: 'hips', title: 'Deep Hip Opener', muscleFocus: 'Hips · Lower Back', exercises: [
        ex('Pigeon Pose', '2 sets', '90s / side'),
        ex('90/90 Transition', '3 sets', '8 reps'),
        ex('Deep Squat Hold', '3 sets', '45 sec'),
        ex('Happy Baby', '1 set', '60 sec'),
      ]},
    ],
    programs: [
      { title: '2-Week Mobility Reset', description: 'A gentle alternating flow + hip-opening routine to restore range of motion. Do daily, alternating sessions.', days: [
        { label: 'Odd days · Flow', workoutKey: 'flow' },
        { label: 'Even days · Hips', workoutKey: 'hips' },
      ]},
    ],
  },
  {
    firstName: 'Diego', lastName: 'Santos', email: `diego@${DEMO_DOMAIN}`,
    headline: 'Powerlifting · squat, bench, deadlift',
    bio: 'Competitive powerlifter and coach. I get beginners to their first big totals safely with technique-first programming.',
    specialties: ['Powerlifting', 'Strength', 'Technique'],
    verified: true, featured: false, xp: 5100, level: 14, streak: 28,
    workouts: [
      { key: 'squat', title: 'Squat Focus', muscleFocus: 'Legs · Core', exercises: [
        ex('Competition Back Squat', '5 sets', '3 reps', 'Brace hard', 'Break at hips and knees together'),
        ex('Pause Squat', '3 sets', '5 reps', '2-second pause in the hole'),
        ex('Leg Extension', '3 sets', '12 reps'),
      ]},
      { key: 'bench', title: 'Bench Focus', muscleFocus: 'Chest · Triceps', exercises: [
        ex('Competition Bench Press', '5 sets', '3 reps', 'Tuck the elbows', 'Leg drive'),
        ex('Close-Grip Bench', '3 sets', '6 reps'),
        ex('Overhead Press', '3 sets', '8 reps'),
      ]},
      { key: 'dead', title: 'Deadlift Focus', muscleFocus: 'Back · Hamstrings', exercises: [
        ex('Competition Deadlift', '5 sets', '3 reps', 'Take the slack out', 'Push and pull simultaneously'),
        ex('Deficit Deadlift', '3 sets', '5 reps'),
        ex('Barbell Row', '3 sets', '8 reps'),
      ]},
    ],
    programs: [
      { title: '9-Week Beginner Powerlifting', description: 'Squat, bench and deadlift each once a week with technique work. Add 2.5kg per lift each week you complete all sets.', days: [
        { label: 'Day 1 · Squat', workoutKey: 'squat' },
        { label: 'Day 2 · Bench', workoutKey: 'bench' },
        { label: 'Day 3 · Deadlift', workoutKey: 'dead' },
      ]},
    ],
  },
  {
    firstName: 'Sara', lastName: 'Kim', email: `sara@${DEMO_DOMAIN}`,
    headline: 'Functional training · strong for life',
    bio: 'Functional and fat-loss coach for everyday athletes. Balanced sessions you can actually keep up with around work and family.',
    specialties: ['Functional', 'Fat Loss', 'Beginners'],
    verified: false, featured: false, xp: 1400, level: 6, streak: 12,
    workouts: [
      { key: 'total', title: 'Total-Body Strength', muscleFocus: 'Full Body', exercises: [
        ex('Goblet Squat', '3 sets', '12 reps'),
        ex('Dumbbell Bench Press', '3 sets', '10 reps'),
        ex('One-Arm Row', '3 sets', '10 / side'),
        ex('Dumbbell RDL', '3 sets', '12 reps'),
        ex('Dead Bug', '3 sets', '10 / side'),
      ]},
      { key: 'metcon', title: 'Fat-Loss MetCon', muscleFocus: 'Full Body · Cardio', exercises: [
        ex('Thruster', '4 rounds', '12 reps'),
        ex('Renegade Row', '4 rounds', '8 / side'),
        ex('Box Step-Up', '4 rounds', '20 reps'),
        ex('Jumping Jack', '4 rounds', '40 reps'),
      ]},
    ],
    programs: [
      { title: '3-Week Kickstart', description: 'A beginner-friendly strength + conditioning intro. Alternate the two sessions three times a week.', days: [
        { label: 'Session A · Strength', workoutKey: 'total' },
        { label: 'Session B · MetCon', workoutKey: 'metcon' },
      ]},
    ],
  },
];

const CLIENTS = [
  { firstName: 'Omar', lastName: 'Adel', email: `client.omar@${DEMO_DOMAIN}` },
  { firstName: 'Mona', lastName: 'Saleh', email: `client.mona@${DEMO_DOMAIN}` },
  { firstName: 'Youssef', lastName: 'Ibrahim', email: `client.youssef@${DEMO_DOMAIN}` },
];

async function wipeDemo() {
  const demoUsers = await prisma.user.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id);
  if (!ids.length) return;
  await prisma.coachRating.deleteMany({ where: { OR: [{ coachUserId: { in: ids } }, { clientId: { in: ids } }] } });
  await prisma.coachRequest.deleteMany({ where: { OR: [{ coachUserId: { in: ids } }, { clientId: { in: ids } }] } });
  await prisma.coachProgram.deleteMany({ where: { coachUserId: { in: ids } } });
  await prisma.coachWorkout.deleteMany({ where: { coachUserId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  console.log('Wiping existing @demo.pulse data…');
  await wipeDemo();

  const pw = await hashPassword('demo123');

  // Clients (leave ratings so featured coaches show stars)
  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const u = await prisma.user.create({ data: { ...c, passwordHash: pw } });
    clientIds.push(u.id);
  }

  let coachCount = 0, workoutCount = 0, programCount = 0, ratingCount = 0;

  for (const c of COACHES) {
    const coach = await prisma.user.create({
      data: {
        firstName: c.firstName, lastName: c.lastName, email: c.email, passwordHash: pw,
        isCoach: true, coachHeadline: c.headline, coachBio: c.bio,
        coachSpecialties: JSON.stringify(c.specialties),
        coachVerified: c.verified, coachFeatured: c.featured,
        xp: c.xp, level: c.level, currentStreak: c.streak, longestStreak: c.streak + 5,
        fitnessLevel: 'ADVANCED',
      },
    });
    coachCount++;

    // Workouts (map key -> created id)
    const keyToId = new Map<string, string>();
    for (const w of c.workouts) {
      const created = await prisma.coachWorkout.create({
        data: {
          coachUserId: coach.id, title: w.title, muscleFocus: w.muscleFocus,
          description: w.description, exercises: JSON.stringify(w.exercises),
        },
      });
      keyToId.set(w.key, created.id);
      workoutCount++;
    }

    // Programs (resolve day workoutKey -> workoutId)
    for (const p of c.programs) {
      const days = p.days
        .map((d) => ({ label: d.label, workoutId: keyToId.get(d.workoutKey) }))
        .filter((d) => d.workoutId);
      await prisma.coachProgram.create({
        data: { coachUserId: coach.id, title: p.title, description: p.description, days: JSON.stringify(days) },
      });
      programCount++;
    }

    // Ratings from each client (4–5 stars), skip self
    const stars = [5, 5, 4];
    for (let i = 0; i < clientIds.length; i++) {
      if (clientIds[i] === coach.id) continue;
      await prisma.coachRating.create({
        data: { coachUserId: coach.id, clientId: clientIds[i], stars: stars[i] ?? 5 },
      });
      ratingCount++;
    }
  }

  console.log(`✔ Seeded ${coachCount} coaches, ${workoutCount} workouts, ${programCount} programs, ${ratingCount} ratings, ${clientIds.length} demo clients.`);
  console.log('  Login for any of them: password "demo123" (e.g. layla@demo.pulse, marcus@demo.pulse).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
