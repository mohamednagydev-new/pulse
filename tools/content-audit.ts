import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

/**
 * Content punch-list for the admin pass before/after launch.
 *
 * Reports, in fix-first order:
 *   1. Lessons sharing the same video (dupes — replace or intentionally reuse)
 *   2. Programs / recipe & article categories with no image (CoverArt fallback shows)
 *   3. Lessons with no video at all
 *   4. Exercises without a demo video
 *   5. Categories that are empty (no recipes and no articles)
 *
 * Read-only. Run against any DB:
 *   node node_modules/tsx/dist/cli.mjs tools/content-audit.ts
 * (uses DATABASE_URL from .env — run on the server for the live picture)
 */

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();

function header(title: string, count: number) {
  console.log(`\n=== ${title} — ${count} ===`);
}

async function main() {
  // 1. Duplicate lesson videos
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, videoId: true, videoUrl: true, program: { select: { title: true } } },
  });
  const byVideo = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = l.videoId || l.videoUrl;
    if (!key) continue;
    if (!byVideo.has(key)) byVideo.set(key, []);
    byVideo.get(key)!.push(l);
  }
  const dupes = [...byVideo.entries()].filter(([, ls]) => ls.length > 1);
  header('Lessons sharing one video (dupes)', dupes.length);
  for (const [key, ls] of dupes.slice(0, 40)) {
    console.log(`  ${key.slice(0, 60)}`);
    for (const l of ls) console.log(`    - [${l.program?.title ?? '?'}] ${l.title} (${l.id})`);
  }

  // 2. Missing images
  const [programsNoImg, catsNoImg] = await Promise.all([
    prisma.program.findMany({ where: { OR: [{ coverImage: null }, { coverImage: '' }] }, select: { id: true, title: true } }),
    prisma.category.findMany({ where: { OR: [{ image: null }, { image: '' }] }, select: { id: true, title: true, kind: true } }),
  ]);
  header('Programs without a cover image', programsNoImg.length);
  programsNoImg.forEach((p) => console.log(`  - ${p.title} (${p.id})`));
  header('Categories without an image', catsNoImg.length);
  catsNoImg.forEach((c) => console.log(`  - [${c.kind}] ${c.title} (${c.id})`));

  // 3. Lessons without any video
  const lessonsNoVideo = lessons.filter((l) => !l.videoId && !l.videoUrl);
  header('Lessons with no video', lessonsNoVideo.length);
  lessonsNoVideo.slice(0, 40).forEach((l) => console.log(`  - [${l.program?.title ?? '?'}] ${l.title} (${l.id})`));

  // 4. Exercises without a demo
  const exercisesNoVideo = await prisma.exercise.findMany({
    where: { AND: [{ OR: [{ videoUrl: null }, { videoUrl: '' }] }, { OR: [{ videoId: null }] }] },
    select: { id: true, name: true, muscleGroup: { select: { name: true } } },
  });
  header('Exercises without a demo video', exercisesNoVideo.length);
  exercisesNoVideo.slice(0, 60).forEach((e) => console.log(`  - [${e.muscleGroup?.name ?? '?'}] ${e.name} (${e.id})`));

  // 5. Empty categories
  const cats = await prisma.category.findMany({
    select: { id: true, title: true, kind: true, _count: { select: { recipes: true, articles: true } } },
  });
  const empty = cats.filter((c) => c._count.recipes === 0 && c._count.articles === 0);
  header('Empty categories (nothing inside)', empty.length);
  empty.forEach((c) => console.log(`  - [${c.kind}] ${c.title} (${c.id})`));

  console.log('\nDone. Fix in Admin → the matching resource; re-run any time.');
}

main().finally(() => prisma.$disconnect());
