/**
 * Seeds test accounts + a lively community (follows, posts, XP, streaks) so the
 * social features have data to show. Idempotent — safe to re-run, never wipes.
 *   npx tsx prisma/seed-users.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { email: 'alex@pulse.app', firstName: 'Alex', lastName: 'Rivera', xp: 1240, streak: 9, bio: 'Chasing PRs, one rep at a time.' },
  { email: 'maya@pulse.app', firstName: 'Maya', lastName: 'Chen', xp: 980, streak: 14, bio: 'Yoga + strength. Balance is everything.' },
  { email: 'omar@pulse.app', firstName: 'Omar', lastName: 'Hassan', xp: 1710, streak: 21, bio: 'Coach in training. Let’s move.' },
  { email: 'sara@pulse.app', firstName: 'Sara', lastName: 'Ali', xp: 640, streak: 5, bio: 'Meal prep queen 🥗' },
  { email: 'liam@pulse.app', firstName: 'Liam', lastName: 'Brooks', xp: 420, streak: 3, bio: 'New here — day 3 and loving it.' },
];

const POSTS: Record<string, { kind: string; text: string }[]> = {
  'alex@pulse.app': [
    { kind: 'completion', text: 'Completed "Leg Day — First Program" 🔥 legs are jelly' },
    { kind: 'text', text: 'Who’s joining the 30-Day Movement Challenge? Let’s go 💪' },
  ],
  'maya@pulse.app': [
    { kind: 'badge', text: 'Earned the "7-Day Streak" badge 🔥' },
    { kind: 'text', text: 'Morning yoga flow done before sunrise. Best way to start the day 🧘' },
  ],
  'omar@pulse.app': [
    { kind: 'levelup', text: 'Reached level 4! 🎉' },
    { kind: 'completion', text: 'Chest & Triceps in the books ✅' },
  ],
  'sara@pulse.app': [{ kind: 'text', text: 'Grilled shrimp cocktail for dinner — 180 kcal and delicious 🍤' }],
  'liam@pulse.app': [{ kind: 'text', text: 'First week complete. Small steps, big momentum.' }],
};

function levelForXp(xp: number) {
  return 1 + Math.floor(xp / 500);
}

async function main() {
  console.log('Seeding test users + community...');
  const hash = await bcrypt.hash('test1234', 10);
  const ids: Record<string, string> = {};

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { xp: u.xp, level: levelForXp(u.xp), currentStreak: u.streak, longestStreak: u.streak, bio: u.bio },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: hash,
        xp: u.xp,
        level: levelForXp(u.xp),
        currentStreak: u.streak,
        longestStreak: u.streak,
        bio: u.bio,
      },
    });
    ids[u.email] = user.id;
  }
  console.log(`  ${USERS.length} users (password: test1234)`);

  // Everyone follows everyone else (small friendly network)
  let follows = 0;
  for (const a of USERS) {
    for (const b of USERS) {
      if (a.email === b.email) continue;
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: ids[a.email], followingId: ids[b.email] } },
        create: { followerId: ids[a.email], followingId: ids[b.email] },
        update: {},
      });
      follows++;
    }
  }

  // Feed posts (only if the user has none, to stay idempotent) + recent XP events
  let posts = 0;
  for (const u of USERS) {
    const existing = await prisma.feedPost.count({ where: { userId: ids[u.email] } });
    if (existing === 0) {
      for (const p of POSTS[u.email] ?? []) {
        await prisma.feedPost.create({ data: { userId: ids[u.email], kind: p.kind, text: p.text } });
        posts++;
      }
    }
    // Recent XP so the weekly leaderboard shows numbers
    const xpThisWeek = await prisma.xpEvent.count({ where: { userId: ids[u.email] } });
    if (xpThisWeek === 0) {
      await prisma.xpEvent.create({ data: { userId: ids[u.email], amount: Math.round(u.xp / 3), reason: 'seed' } });
    }
  }

  // Make the admin follow everyone so the admin's feed is populated too
  const admin = await prisma.user.findUnique({ where: { email: 'admin@fitit.app' } });
  if (admin) {
    for (const u of USERS) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: admin.id, followingId: ids[u.email] } },
        create: { followerId: admin.id, followingId: ids[u.email] },
        update: {},
      });
    }
  }

  console.log(`  ${follows} follows, ${posts} posts`);
  console.log('Done. Test logins:');
  USERS.forEach((u) => console.log(`  ${u.email} / test1234`));
  console.log('  admin@fitit.app / admin123 (admin)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
