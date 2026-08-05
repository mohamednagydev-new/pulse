/** Arabic coverage report — run this on the SERVER to see exactly what is (and isn't)
 *  translated in the live database.  Run: npx tsx prisma/ar/coverage.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const rows: [string, number, number][] = [];
  const add = async (name: string, total: Promise<number>, done: Promise<number>) =>
    rows.push([name, await total, await done]);

  await add('Articles (title)', prisma.article.count(), prisma.article.count({ where: { titleAr: { not: null } } }));
  await add('Articles (body)', prisma.article.count(), prisma.article.count({ where: { bodyAr: { not: null } } }));
  await add('Recipes', prisma.recipe.count(), prisma.recipe.count({ where: { titleAr: { not: null } } }));
  await add('Exercises', prisma.exercise.count(), prisma.exercise.count({ where: { nameAr: { not: null } } }));
  await add('Programs', prisma.program.count(), prisma.program.count({ where: { titleAr: { not: null } } }));
  await add('Lessons', prisma.lesson.count(), prisma.lesson.count({ where: { titleAr: { not: null } } }));
  await add('Coaches', prisma.coach.count(), prisma.coach.count({ where: { nameAr: { not: null } } }));
  await add('Categories', prisma.category.count(), prisma.category.count({ where: { titleAr: { not: null } } }));
  await add('Muscle groups', prisma.muscleGroup.count(), prisma.muscleGroup.count({ where: { nameAr: { not: null } } }));
  await add('Challenges (title)', prisma.challenge.count(), prisma.challenge.count({ where: { titleAr: { not: null } } }));
  await add('Challenges (desc)', prisma.challenge.count(), prisma.challenge.count({ where: { descriptionAr: { not: null } } }));
  await add('Badges', prisma.badge.count(), prisma.badge.count({ where: { titleAr: { not: null } } }));
  await add('Banners', prisma.banner.count(), prisma.banner.count({ where: { titleAr: { not: null } } }));
  await add('Store products', prisma.partnerProduct.count(), prisma.partnerProduct.count({ where: { titleAr: { not: null } } }));
  await add('Partners', prisma.partner.count(), prisma.partner.count({ where: { nameAr: { not: null } } }));

  console.log('\n  Arabic coverage\n  ' + '-'.repeat(46));
  let gaps = 0;
  for (const [name, total, done] of rows) {
    const pct = total ? Math.round((done / total) * 100) : 100;
    if (pct < 100 && total > 0) gaps++;
    const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10, '░');
    console.log(`  ${name.padEnd(20)} ${bar} ${String(done).padStart(4)}/${String(total).padEnd(4)} ${pct}%`);
  }
  console.log('  ' + '-'.repeat(46));
  console.log(gaps === 0
    ? '  ✅ Everything is translated.\n'
    : `  ⚠️  ${gaps} table(s) incomplete — run the scripts in prisma/ar/ and prisma/translate-manual.ts\n`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
