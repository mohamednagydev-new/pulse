/**
 * Builds semantic-search embeddings for AI Coach retrieval + smart search.
 * Run after seeding (and after translate for Arabic):
 *   OPENAI_API_KEY=... npx tsx prisma/embed.ts
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

/**
 * No key is a normal, supported state, not an error.
 *
 * This script runs inside deploy/seed.ps1, which stops the whole seed on a non-zero
 * exit. Exiting 1 here would have made every deploy on a server without an OpenAI key
 * fail at this step and skip the Arabic passes that come after it. Skipping quietly
 * is the correct behaviour: AI search is an enhancement, and the app is designed to
 * work without it.
 */
if (!process.env.OPENAI_API_KEY) {
  console.log('  skip: OPENAI_API_KEY not set — semantic search stays off (this is fine).');
  process.exit(0);
}

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: MODEL, input: text.slice(0, 8000) });
  return res.data[0].embedding;
}

async function upsert(contentType: string, contentId: string, lang: string, text: string) {
  const vector = JSON.stringify(await embed(text));
  await prisma.contentEmbedding.upsert({
    where: { contentType_contentId_lang: { contentType, contentId, lang } },
    create: { contentType, contentId, lang, text, vector },
    update: { text, vector },
  });
}

async function run() {
  console.log('Building embeddings...');
  let n = 0;

  const articles = await prisma.article.findMany();
  for (const a of articles) {
    await upsert('article', a.id, 'en', `${a.title}. ${a.excerpt ?? ''} ${a.body}`);
    if (a.bodyAr) await upsert('article', a.id, 'ar', `${a.titleAr ?? a.title}. ${a.bodyAr}`);
    n++;
  }

  const recipes = await prisma.recipe.findMany();
  for (const r of recipes) {
    await upsert('recipe', r.id, 'en', `${r.title}. ${r.about}`);
    if (r.aboutAr) await upsert('recipe', r.id, 'ar', `${r.titleAr ?? r.title}. ${r.aboutAr}`);
    n++;
  }

  const exercises = await prisma.exercise.findMany();
  for (const e of exercises) {
    await upsert('exercise', e.id, 'en', `${e.name}. ${e.description ?? ''}`);
    if (e.descriptionAr) await upsert('exercise', e.id, 'ar', `${e.nameAr ?? e.name}. ${e.descriptionAr}`);
    n++;
  }

  const programs = await prisma.program.findMany({ include: { coach: true } });
  for (const p of programs) {
    await upsert('program', p.id, 'en', `${p.title}. ${p.description ?? ''} Coach ${p.coach.name}`);
    n++;
  }

  console.log(`Embedded ${n} items.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
