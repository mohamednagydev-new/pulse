/**
 * AI translation: fills every Arabic (*Ar) column from its English source using OpenAI.
 * Run once after seeding:  OPENAI_API_KEY=... npx tsx prisma/translate.ts
 * Safe to re-run — it only fills columns that are still empty.
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required.');
  process.exit(1);
}

/** Translate a batch of strings to Arabic in a single call, preserving order. */
async function translateBatch(strings: string[]): Promise<string[]> {
  if (!strings.length) return [];
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You translate content for a fitness & wellness app into SIMPLE, EVERYDAY SPOKEN EGYPTIAN ARABIC (اللهجة المصرية العامية البسيطة). Use the natural, friendly, easy words an ordinary Egyptian would actually say in daily life — like you are talking to a friend. Do NOT use formal Modern Standard Arabic (فصحى) and do NOT be stiff, bookish, or literary. Keep it warm, casual, and clear. Keep numbers, units and measurements as they are. Translate each English string in order. Return JSON: {"items": string[]} in the SAME order and length as the input.',
      },
      { role: 'user', content: JSON.stringify({ items: strings }) },
    ],
  });
  try {
    const parsed = JSON.parse(res.choices[0].message.content || '{}');
    const items = parsed.items;
    if (Array.isArray(items) && items.length === strings.length) return items;
  } catch {
    /* fall through */
  }
  return strings; // fallback: leave source
}

const T = (v: string[]) => JSON.stringify(v);
const arr = (s: string | null) => {
  try {
    return s ? (JSON.parse(s) as string[]) : [];
  } catch {
    return [];
  }
};

async function run() {
  console.log('Translating content to Arabic...');

  // Simple single-field models
  const coaches = await prisma.coach.findMany({ where: { nameAr: null } });
  for (const c of coaches) {
    const [nameAr, headlineAr, bioAr] = await translateBatch([c.name, c.headline ?? '', c.bio ?? '']);
    await prisma.coach.update({ where: { id: c.id }, data: { nameAr, headlineAr, bioAr } });
  }
  console.log(`  coaches: ${coaches.length}`);

  const programs = await prisma.program.findMany({ where: { titleAr: null } });
  for (const p of programs) {
    const [titleAr, descriptionAr] = await translateBatch([p.title, p.description ?? '']);
    await prisma.program.update({ where: { id: p.id }, data: { titleAr, descriptionAr } });
  }
  console.log(`  programs: ${programs.length}`);

  const lessons = await prisma.lesson.findMany({ where: { titleAr: null } });
  for (const l of lessons) {
    const [titleAr, descriptionAr] = await translateBatch([l.title, l.description ?? '']);
    await prisma.lesson.update({ where: { id: l.id }, data: { titleAr, descriptionAr } });
  }
  console.log(`  lessons: ${lessons.length}`);

  const groups = await prisma.muscleGroup.findMany({ where: { nameAr: null } });
  for (const g of groups) {
    const [nameAr] = await translateBatch([g.name]);
    await prisma.muscleGroup.update({ where: { id: g.id }, data: { nameAr } });
  }
  console.log(`  muscle groups: ${groups.length}`);

  const exercises = await prisma.exercise.findMany({ where: { nameAr: null } });
  for (const e of exercises) {
    const ins = arr(e.instructions);
    const out = await translateBatch([e.name, e.description ?? '', ...ins]);
    await prisma.exercise.update({
      where: { id: e.id },
      data: { nameAr: out[0], descriptionAr: out[1], instructionsAr: T(out.slice(2)) },
    });
  }
  console.log(`  exercises: ${exercises.length}`);

  const categories = await prisma.category.findMany({ where: { titleAr: null } });
  for (const c of categories) {
    const [titleAr] = await translateBatch([c.title]);
    await prisma.category.update({ where: { id: c.id }, data: { titleAr } });
  }
  console.log(`  categories: ${categories.length}`);

  const articles = await prisma.article.findMany({ where: { titleAr: null } });
  for (const a of articles) {
    const [titleAr, excerptAr, bodyAr] = await translateBatch([a.title, a.excerpt ?? '', a.body]);
    await prisma.article.update({ where: { id: a.id }, data: { titleAr, excerptAr, bodyAr } });
  }
  console.log(`  articles: ${articles.length}`);

  const recipes = await prisma.recipe.findMany({ where: { titleAr: null } });
  for (const r of recipes) {
    const ing = arr(r.ingredients);
    const steps = arr(r.steps);
    const out = await translateBatch([r.title, r.about, ...ing, ...steps]);
    let i = 2;
    const ingAr = out.slice(i, (i += ing.length));
    const stepsAr = out.slice(i, i + steps.length);
    await prisma.recipe.update({
      where: { id: r.id },
      data: { titleAr: out[0], aboutAr: out[1], ingredientsAr: T(ingAr), stepsAr: T(stepsAr) },
    });
  }
  console.log(`  recipes: ${recipes.length}`);

  const featured = await prisma.featuredItem.findMany({ where: { titleAr: null } });
  for (const f of featured) {
    const [titleAr, descriptionAr] = await translateBatch([f.title, f.description ?? '']);
    await prisma.featuredItem.update({ where: { id: f.id }, data: { titleAr, descriptionAr } });
  }
  console.log(`  featured: ${featured.length}`);

  const challenges = await prisma.challenge.findMany({ where: { titleAr: null } });
  for (const c of challenges) {
    const [titleAr] = await translateBatch([c.title]);
    await prisma.challenge.update({ where: { id: c.id }, data: { titleAr } });
  }
  console.log(`  challenges: ${challenges.length}`);

  const badges = await prisma.badge.findMany({ where: { titleAr: null } });
  for (const b of badges) {
    const [titleAr] = await translateBatch([b.title]);
    await prisma.badge.update({ where: { id: b.id }, data: { titleAr } });
  }
  console.log(`  badges: ${badges.length}`);

  const banners = await prisma.banner.findMany({ where: { titleAr: null } });
  for (const bn of banners) {
    const [titleAr, subtitleAr] = await translateBatch([bn.title, bn.subtitle ?? '']);
    await prisma.banner.update({ where: { id: bn.id }, data: { titleAr, subtitleAr } });
  }
  console.log(`  banners: ${banners.length}`);

  const plans = await prisma.membershipPlan.findMany({ where: { nameAr: null } });
  for (const p of plans) {
    const feats = arr(p.features);
    const out = await translateBatch([p.name, ...feats]);
    await prisma.membershipPlan.update({ where: { id: p.id }, data: { nameAr: out[0], featuresAr: T(out.slice(1)) } });
  }
  console.log(`  plans: ${plans.length}`);

  console.log('Arabic translation complete.');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
