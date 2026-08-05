/**
 * Tag exercises with the joints they load hard, plus a gentler swap.
 *
 * This is what makes "we work around your injuries" true inside a session rather
 * than only on the plan screen. Matching is by movement name, and anything not
 * listed is left untagged — a missing tag shows the exercise as normal, which is
 * the safe direction for a false negative here (the user was already going to see
 * it), whereas a wrong tag would hide a movement someone can do perfectly well.
 *
 * Idempotent. Run: npx tsx prisma/seed-contraindications.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Rule = { match: RegExp; areas: string[]; safer?: string };

const RULES: Rule[] = [
  // ---- knee ----
  { match: /bulgarian split squat/i, areas: ['knee'], safer: 'Glute Bridge' },
  { match: /walking lunge|reverse lunge|lunge/i, areas: ['knee'], safer: 'Glute Bridge' },
  { match: /cossack squat/i, areas: ['knee', 'back'], safer: 'Side-Lying Inner Thigh Raise' },
  { match: /barbell back squat/i, areas: ['knee', 'back'], safer: 'Leg Press' },
  { match: /bodyweight squat|sumo squat/i, areas: ['knee'], safer: 'Glute Bridge' },
  { match: /leg press/i, areas: ['knee'] },
  { match: /jump rope/i, areas: ['knee'] },
  { match: /nordic hamstring curl/i, areas: ['knee'] },

  // ---- lower back ----
  { match: /romanian deadlift|single-leg deadlift|deadlift/i, areas: ['back'], safer: 'Hip Thrust' },
  { match: /back extension/i, areas: ['back'], safer: 'Bird Dog' },
  { match: /good morning|bent-over barbell row/i, areas: ['back'], safer: 'Single-Arm Dumbbell Row' },
  { match: /russian twist/i, areas: ['back'], safer: 'Dead Bug' },
  { match: /woodchopper/i, areas: ['back'], safer: 'Side Plank' },
  { match: /superman/i, areas: ['back'], safer: 'Bird Dog' },
  { match: /barbell shrug|farmer'?s carry|farmer'?s walk/i, areas: ['back'] },

  // ---- shoulder ----
  { match: /overhead press|dumbbell overhead press|pike push-?up/i, areas: ['shoulder'], safer: 'Front Raise' },
  { match: /lateral raise|front raise|bent-over reverse fly/i, areas: ['shoulder'] },
  { match: /barbell bench press|incline dumbbell press|dumbbell chest fly/i, areas: ['shoulder'], safer: 'Push-Up' },
  { match: /triceps dip|dip/i, areas: ['shoulder', 'wrist'], safer: 'Triceps Rope Pushdown' },
  { match: /pull-?up|chin-?up|lat pulldown|straight-arm pulldown/i, areas: ['shoulder'] },
  { match: /face pull|prone y raise/i, areas: [] }, // explicitly fine — rehab-friendly

  // ---- wrist ----
  { match: /push-?up|close-grip push-?up|incline push-?up/i, areas: ['wrist'], safer: 'Dumbbell Chest Fly' },
  { match: /plank/i, areas: ['wrist'], safer: 'Dead Bug' },
  { match: /wrist curl|reverse wrist curl|reverse curl/i, areas: ['wrist'] },
  { match: /dead hang/i, areas: ['wrist', 'shoulder'] },
  { match: /barbell curl/i, areas: ['wrist'], safer: 'Hammer Curl' },
  { match: /skull crusher/i, areas: ['wrist', 'shoulder'], safer: 'Triceps Rope Pushdown' },

  // ---- neck ----
  { match: /crunch|bicycle crunch|sit-?up/i, areas: ['neck'], safer: 'Dead Bug' },
  { match: /hanging leg raise/i, areas: ['neck', 'shoulder'], safer: 'Dead Bug' },
];

async function run() {
  const exercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
  let tagged = 0;
  let cleared = 0;

  for (const ex of exercises) {
    // First matching rule wins, so the list runs most-specific first.
    const rule = RULES.find((r) => r.match.test(ex.name));
    const areas = rule?.areas ?? [];

    if (areas.length === 0) {
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { contraindications: null, saferAlternative: null },
      });
      cleared++;
      continue;
    }

    await prisma.exercise.update({
      where: { id: ex.id },
      data: {
        contraindications: JSON.stringify(areas),
        saferAlternative: rule?.safer ?? null,
      },
    });
    tagged++;
  }

  const byArea: Record<string, number> = {};
  for (const ex of await prisma.exercise.findMany({ where: { contraindications: { not: null } }, select: { contraindications: true } })) {
    for (const a of JSON.parse(ex.contraindications!) as string[]) byArea[a] = (byArea[a] ?? 0) + 1;
  }

  console.log(`Tagged ${tagged} exercise(s), left ${cleared} untagged.`);
  console.log('  by area:', Object.entries(byArea).map(([k, v]) => `${k} ${v}`).join(', ') || 'none');
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
