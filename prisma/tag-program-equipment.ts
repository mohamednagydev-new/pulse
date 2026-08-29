/**
 * Tag every program with what you need to follow it: none | home_basic | full_gym.
 *
 * Lessons are video classes with no exercise links, so there is nothing to
 * derive this from except the words — program title/description plus every
 * lesson title. That is evidence, not proof, so the rule is deliberately
 * conservative: tag only when the text actually names equipment, and leave
 * everything else NULL. Null means "works for anyone" and hides nothing, so a
 * wrong guess is worse than no guess.
 *
 * Review the printed table afterwards and fix any row from Admin → Programs.
 *
 * Run:   node node_modules/tsx/dist/cli.mjs prisma/tag-program-equipment.ts
 * Undo:  node node_modules/tsx/dist/cli.mjs prisma/tag-program-equipment.ts --clear
 * Dry:   node node_modules/tsx/dist/cli.mjs prisma/tag-program-equipment.ts --dry
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const GYM = /barbell|machine|cable|smith|lat pulldown|leg press|rack|bench press|deadlift|gym[- ]?based|في الجيم|بار حديد|جهاز|أجهزة/i;
const HOME_KIT = /dumbbell|kettlebell|resistance band|band[s]? |bench|pull-?up bar|jump rope|دمبل|كيتل|أستك|مطاط|بار عقلة/i;
const NO_KIT = /bodyweight|body-?weight|no equipment|equipment-?free|at home|home workout|calisthenic|yoga|pilates|stretch|mobility|breath|meditat|وزن الجسم|من غير معدات|بدون معدات|في البيت|منزلي|يوجا|بيلاتس|إطالة|تنفس|تأمل/i;

function classify(text: string): 'none' | 'home_basic' | 'full_gym' | null {
  // Most specific wins: naming a barbell beats the word "home" in a title.
  if (GYM.test(text)) return 'full_gym';
  if (HOME_KIT.test(text)) return 'home_basic';
  if (NO_KIT.test(text)) return 'none';
  return null;
}

async function main() {
  const clear = process.argv.includes('--clear');
  const dry = process.argv.includes('--dry');

  const programs = await prisma.program.findMany({
    include: { coach: { select: { type: true } }, lessons: { select: { title: true, titleAr: true } } },
  });

  if (clear) {
    const r = await prisma.program.updateMany({ data: { equipment: null } });
    console.log(`Cleared the equipment tag on ${r.count} program(s).`);
    return;
  }

  const counts: Record<string, number> = { none: 0, home_basic: 0, full_gym: 0, unknown: 0 };
  const rows: string[] = [];

  for (const p of programs) {
    const text = [
      p.title, p.titleAr, p.description, p.descriptionAr,
      ...p.lessons.flatMap((l) => [l.title, l.titleAr]),
    ].filter(Boolean).join(' \n ');

    // A yoga class needs a mat at most — that is not equipment anyone lacks.
    let tag = classify(text);
    if (!tag && p.coach?.type === 'YOGA') tag = 'none';

    counts[tag ?? 'unknown']++;
    rows.push(`${(tag ?? 'unknown').padEnd(10)} | ${p.title}`);

    if (!dry && tag !== p.equipment) {
      await prisma.program.update({ where: { id: p.id }, data: { equipment: tag } });
    }
  }

  console.log(rows.sort().join('\n'));
  console.log(
    `\n${dry ? '[dry run] ' : ''}${programs.length} program(s): ` +
    `none ${counts.none} · home_basic ${counts.home_basic} · full_gym ${counts.full_gym} · left untagged ${counts.unknown}`,
  );
  console.log('Untagged = shown to everyone. Fix anything wrong in Admin → Programs → Equipment.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
