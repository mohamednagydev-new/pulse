import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const CONTENT = path.resolve(__dirname, 'content');

function load<T>(file: string, fallback: T): T {
  const p = path.join(CONTENT, file);
  if (!fs.existsSync(p)) {
    console.warn(`  ! missing ${file} — skipping`);
    return fallback;
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

const S = (v: unknown) => JSON.stringify(v ?? []);

async function reset() {
  // Order matters for FK constraints.
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.challengeParticipant.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.lessonCompletion.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.program.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.muscleGroup.deleteMany();
  await prisma.article.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.featuredItem.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membershipPlan.deleteMany();
}

async function seedAdmin() {
  const email = 'admin@fitit.app';
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      email,
      firstName: 'FIT IT',
      lastName: 'Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });
  console.log('  admin: admin@fitit.app / admin123');
}

async function seedPlans() {
  const plans = [
    { name: 'Yoga', priceCents: 999, interval: 'month', features: S(['All yoga programs', 'Wellness library']) },
    { name: 'Workout', priceCents: 1299, interval: 'month', features: S(['All workout programs', 'Exercise library']) },
    { name: 'All Access', priceCents: 1999, interval: 'month', features: S(['Everything', 'New content weekly']) },
  ];
  for (const p of plans) await prisma.membershipPlan.create({ data: p });
  console.log(`  ${plans.length} membership plans`);
}

async function seedPrograms() {
  const data = load<any>('programs.json', { coaches: [], banners: [], fitForLife: [], mealPrep: [], challenges: [] });
  let programs = 0;
  let lessons = 0;
  for (const [ci, coach] of (data.coaches ?? []).entries()) {
    const created = await prisma.coach.create({
      data: {
        name: coach.name,
        type: coach.type ?? 'WORKOUT',
        headline: coach.headline ?? null,
        bio: coach.bio ?? null,
        order: ci,
      },
    });
    for (const [pi, prog] of (coach.programs ?? []).entries()) {
      const p = await prisma.program.create({
        data: {
          coachId: created.id,
          title: prog.title,
          description: prog.description ?? null,
          level: prog.level ?? null,
          order: pi,
        },
      });
      programs++;
      for (const [li, lesson] of (prog.lessons ?? []).entries()) {
        await prisma.lesson.create({
          data: {
            programId: p.id,
            title: lesson.title,
            description: lesson.description ?? null,
            durationSec: lesson.durationSec ?? null,
            order: li,
          },
        });
        lessons++;
      }
    }
  }
  for (const [i, b] of (data.banners ?? []).entries()) {
    await prisma.banner.create({
      data: { section: b.section ?? 'home_sponsor', title: b.title ?? null, subtitle: b.subtitle ?? null, order: b.order ?? i },
    });
  }
  const featured = [
    ...(data.fitForLife ?? []).map((f: any, i: number) => ({ section: 'fit_for_life', ...f, order: i })),
    ...(data.mealPrep ?? []).map((f: any, i: number) => ({ section: 'meal_prep', ...f, order: i })),
    ...(data.challenges ?? []).map((f: any, i: number) => ({ section: 'challenge', ...f, order: i })),
  ];
  for (const f of featured) {
    await prisma.featuredItem.create({
      data: {
        section: f.section,
        title: f.title,
        description: f.description ?? null,
        durationSec: f.durationSec ?? null,
        level: f.level ?? null,
        order: f.order ?? 0,
      },
    });
  }
  console.log(`  programs: ${data.coaches?.length ?? 0} coaches, ${programs} programs, ${lessons} lessons, ${featured.length} featured`);
}

async function seedExercises() {
  const data = load<any>('exercises.json', { muscleGroups: [] });
  let count = 0;
  for (const [gi, g] of (data.muscleGroups ?? []).entries()) {
    const group = await prisma.muscleGroup.create({
      data: { name: g.name, bodySide: g.bodySide ?? 'front', posX: g.posX ?? null, posY: g.posY ?? null, order: gi },
    });
    for (const [ei, ex] of (g.exercises ?? []).entries()) {
      await prisma.exercise.create({
        data: {
          muscleGroupId: group.id,
          name: ex.name,
          description: ex.description ?? null,
          instructions: S(ex.instructions),
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          equipment: S(ex.equipment),
          level: ex.level ?? null,
          order: ei,
        },
      });
      count++;
    }
  }
  console.log(`  exercises: ${data.muscleGroups?.length ?? 0} muscle groups, ${count} exercises`);
}

async function seedRecipes() {
  const data = load<any>('recipes.json', { categories: [] });
  let count = 0;
  for (const [ci, cat] of (data.categories ?? []).entries()) {
    const category = await prisma.category.create({ data: { kind: 'recipe', title: cat.title, order: ci } });
    for (const [ri, r] of (cat.recipes ?? []).entries()) {
      await prisma.recipe.create({
        data: {
          categoryId: category.id,
          title: r.title,
          about: r.about ?? '',
          ingredients: S(r.ingredients),
          steps: S(r.steps),
          prepTimeMin: r.prepTimeMin ?? null,
          cookTimeMin: r.cookTimeMin ?? null,
          servings: r.servings ?? null,
          calories: r.calories ?? null,
          difficulty: r.difficulty ?? null,
          tags: S(r.tags),
          order: ri,
        },
      });
      count++;
    }
  }
  console.log(`  recipes: ${data.categories?.length ?? 0} categories, ${count} recipes`);
}

async function seedArticles(file: string, kind: string) {
  const data = load<any>(file, { categories: [] });
  let count = 0;
  for (const [ci, cat] of (data.categories ?? []).entries()) {
    const category = await prisma.category.create({ data: { kind, title: cat.title, order: ci } });
    for (const [ai, a] of (cat.articles ?? []).entries()) {
      await prisma.article.create({
        data: {
          categoryId: category.id,
          title: a.title,
          excerpt: a.excerpt ?? null,
          body: a.body ?? '',
          readTimeMin: a.readTimeMin ?? null,
          tags: S(a.tags),
          order: ai,
        },
      });
      count++;
    }
  }
  console.log(`  ${kind}: ${data.categories?.length ?? 0} categories, ${count} articles`);
}

async function seedBadges() {
  const badges = [
    { code: 'first_workout', title: 'First Steps', description: 'Completed your first lesson', icon: '🎯' },
    { code: 'ten_workouts', title: 'Getting Stronger', description: 'Completed 10 lessons', icon: '💪' },
    { code: 'fifty_workouts', title: 'Committed', description: 'Completed 50 lessons', icon: '🏆' },
    { code: 'week_streak', title: '7-Day Streak', description: 'Active 7 days in a row', icon: '🔥' },
    { code: 'month_streak', title: '30-Day Streak', description: 'Active 30 days in a row', icon: '⭐' },
  ];
  for (const b of badges) await prisma.badge.create({ data: b });
  console.log(`  ${badges.length} badges`);
}

async function seedChallenges() {
  const start = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const challenges = [
    { title: '30-Day Movement Challenge', description: 'Complete 20 workouts this month', goalType: 'lessons', goalValue: 20 },
    { title: 'Consistency Streak', description: 'Stay active 14 days in a row', goalType: 'streak', goalValue: 14 },
  ];
  for (const c of challenges) await prisma.challenge.create({ data: { ...c, startsOn: start, endsOn: end } });
  console.log(`  ${challenges.length} challenges`);
}

async function main() {
  console.log('Seeding FIT IT...');
  await reset();
  await seedAdmin();
  await seedPlans();
  await seedPrograms();
  await seedExercises();
  await seedRecipes();
  await seedArticles('articles.json', 'article');
  await seedArticles('initiatives.json', 'initiative');
  await seedBadges();
  await seedChallenges();
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
