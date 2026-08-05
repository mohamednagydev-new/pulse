/** Auto-fills each content item's `reelKeyword` (only where empty) with a smart,
 *  TikTok-friendly search phrase — making the exact keyword visible & editable in
 *  the admin editors. Idempotent. Run: npx tsx prisma/seed-reel-overrides.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const clean = (s: string) => s.replace(/^Day\s*\d+\s*:\s*/i, '').replace(/[^\w\s&-]/g, '').trim().toLowerCase();

async function run() {
  let n = 0;

  // Lessons: title (minus "Day N:") + discipline from the coach type.
  const lessons = await prisma.lesson.findMany({
    where: { reelKeyword: null },
    include: { program: { include: { coach: true } } },
  });
  for (const l of lessons) {
    const kind = l.program?.coach?.type === 'YOGA' ? 'yoga' : 'workout';
    await prisma.lesson.update({ where: { id: l.id }, data: { reelKeyword: `${clean(l.title)} ${kind}`.slice(0, 60) } });
    n++;
  }

  // Programs: yoga keeps its title; gym programs search by level.
  const programs = await prisma.program.findMany({ where: { reelKeyword: null }, include: { coach: true } });
  for (const p of programs) {
    const kw = p.coach?.type === 'YOGA' ? `${clean(p.title)} yoga` : `${(p.level || 'beginner').toLowerCase()} workout plan`;
    await prisma.program.update({ where: { id: p.id }, data: { reelKeyword: kw.slice(0, 60) } });
    n++;
  }

  // Recipes: "<title> recipe".
  const recipes = await prisma.recipe.findMany({ where: { reelKeyword: null } });
  for (const r of recipes) {
    await prisma.recipe.update({ where: { id: r.id }, data: { reelKeyword: `${clean(r.title)} recipe`.slice(0, 60) } });
    n++;
  }

  // Categories: recipes get "recipes", health topics get "tips".
  const cats = await prisma.category.findMany({ where: { reelKeyword: null } });
  for (const c of cats) {
    const suffix = c.kind === 'recipe' ? 'recipes' : 'tips';
    await prisma.category.update({ where: { id: c.id }, data: { reelKeyword: `${clean(c.title)} ${suffix}`.slice(0, 60) } });
    n++;
  }

  // Muscle groups: "<name> workout".
  const groups = await prisma.muscleGroup.findMany({ where: { reelKeyword: null } });
  for (const g of groups) {
    await prisma.muscleGroup.update({ where: { id: g.id }, data: { reelKeyword: `${clean(g.name)} workout`.slice(0, 60) } });
    n++;
  }

  // Articles: category topic + "tips" (article titles are too long for search).
  const articles = await prisma.article.findMany({ where: { reelKeyword: null }, include: { category: true } });
  for (const a of articles) {
    const base = a.category ? clean(a.category.title) : 'healthy habits';
    await prisma.article.update({ where: { id: a.id }, data: { reelKeyword: `${base} tips`.slice(0, 60) } });
    n++;
  }

  console.log(`reel overrides filled: ${n} items (lessons ${lessons.length}, programs ${programs.length}, recipes ${recipes.length}, categories ${cats.length}, muscle groups ${groups.length}, articles ${articles.length})`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
