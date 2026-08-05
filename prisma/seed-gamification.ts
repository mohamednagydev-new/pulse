/** Badges + challenge pack for the engagement layer.
 *  Idempotent — badges upsert on `code`, challenges match on title.
 *  Run: npx tsx prisma/seed-gamification.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** Codes here must match the rules in apps/api/src/lib/gamify.ts checkBadges(). */
const BADGES = [
  { code: 'workouts_250', title: '250 Workouts 🦾', titleAr: '٢٥٠ تمرينة 🦾', description: 'Two hundred and fifty sessions done.', descriptionAr: 'مئتين وخمسين تمرينة خلصت.', icon: '🦾' },
  { code: 'half_year_streak', title: 'Half-Year Streak 🗓️', titleAr: 'نص سنة متواصلة 🗓️', description: '180 days without breaking the chain.', descriptionAr: '١٨٠ يوم من غير ما تقطع.', icon: '🗓️' },
  { code: 'level_20', title: 'Level 20 ⚡', titleAr: 'لِفِل ٢٠ ⚡', description: 'Reach level 20.', descriptionAr: 'وصلت لِفِل ٢٠.', icon: '⚡' },
  { code: 'level_40', title: 'Level 40 🌟', titleAr: 'لِفِل ٤٠ 🌟', description: 'Reach level 40.', descriptionAr: 'وصلت لِفِل ٤٠.', icon: '🌟' },
  { code: 'lifter_100', title: 'Hundred Sets 🏋️', titleAr: 'مية مجموعة 🏋️', description: 'Log 100 sets in the lift tracker.', descriptionAr: 'سجّل ١٠٠ مجموعة في متابعة الحديد.', icon: '🏋️' },
  { code: 'challenge_winner', title: 'Challenge Winner 🎯', titleAr: 'كسبت تحدي 🎯', description: 'Finish your first challenge.', descriptionAr: 'خلّص أول تحدي ليك.', icon: '🎯' },
  { code: 'challenge_master', title: 'Challenge Master 🏆', titleAr: 'أسطورة التحديات 🏆', description: 'Finish five challenges.', descriptionAr: 'خلّص خمس تحديات.', icon: '🏆' },
  { code: 'hydrated_week', title: 'Hydrated Week 💧', titleAr: 'أسبوع مية 💧', description: 'Hit your water goal on seven days.', descriptionAr: 'وصلت هدف المية في ٧ أيام.', icon: '💧' },
  { code: 'hydrated_month', title: 'Hydration Habit 🌊', titleAr: 'عادة المية 🌊', description: 'Hit your water goal on thirty days.', descriptionAr: 'وصلت هدف المية في ٣٠ يوم.', icon: '🌊' },
  { code: 'duel_winner', title: 'First Duel Won ⚔️', titleAr: 'أول تحدي واحد لواحد ⚔️', description: 'Beat a friend in a 1v1 duel.', descriptionAr: 'كسبت صاحبك في تحدي واحد لواحد.', icon: '⚔️' },
  { code: 'duel_champion', title: 'Duel Champion 🛡️', titleAr: 'بطل المبارزات 🛡️', description: 'Win ten duels.', descriptionAr: 'اكسب عشر مبارزات.', icon: '🛡️' },
  { code: 'lucky_streak', title: 'Wheel Regular 🎰', titleAr: 'زبون العجلة 🎰', description: 'Spin the daily wheel thirty times.', descriptionAr: 'لُف عجلة اليوم ٣٠ مرة.', icon: '🎰' },
  { code: 'gold_league', title: 'Gold League 🥇', titleAr: 'الدوري الذهبي 🥇', description: 'Climb to the Gold league.', descriptionAr: 'اطلع للدوري الذهبي.', icon: '🥇' },
  { code: 'legend_league', title: 'Legend League 👑', titleAr: 'دوري الأساطير 👑', description: 'Reach the Legend league.', descriptionAr: 'وصلت لدوري الأساطير.', icon: '👑' },
  // Secret — never advertised, they just appear.
  { code: 'early_bird', title: 'Early Bird 🌅', titleAr: 'صحصح بدري 🌅', description: 'Five workouts finished before 7 AM.', descriptionAr: 'خمس تمرينات خلصت قبل ٧ الصبح.', icon: '🌅' },
  { code: 'night_owl', title: 'Night Owl 🌙', titleAr: 'بومة الليل 🌙', description: 'Five workouts finished after 10 PM.', descriptionAr: 'خمس تمرينات خلصت بعد ١٠ بالليل.', icon: '🌙' },
];

/** Short, winnable challenges. The old set was all month-long — nothing to finish
 *  in your first week, which is exactly when people decide whether to stay. */
const CHALLENGES = [
  // --- Week-long sprints ---
  { title: '3 Workouts This Week', titleAr: '٣ تمرينات الأسبوع ده', description: 'Three sessions in seven days. The habit starts here.', descriptionAr: 'تلات تمرينات في سبع أيام. العادة بتبدأ من هنا.', goalType: 'lessons', goalValue: 3, days: 7, rewardXp: 100, difficulty: 'easy' },
  { title: 'Hydration Week', titleAr: 'أسبوع المية', description: 'Fifty-six glasses of water in seven days — eight a day.', descriptionAr: '٥٦ كوباية مية في سبع أيام — تمنية في اليوم.', goalType: 'water', goalValue: 56, days: 7, rewardXp: 120, difficulty: 'medium' },
  { title: '7-Day Streak Sprint', titleAr: 'سبع أيام ورا بعض', description: 'Stay active every day for a week. No gaps.', descriptionAr: 'اتحرك كل يوم لمدة أسبوع. من غير أي يوم فايت.', goalType: 'streak', goalValue: 7, days: 7, rewardXp: 150, difficulty: 'medium' },
  { title: 'Weekend Warrior', titleAr: 'محارب الويكاند', description: 'Two workouts before the weekend is over.', descriptionAr: 'تمرينتين قبل ما الويكاند يخلص.', goalType: 'lessons', goalValue: 2, days: 7, rewardXp: 80, difficulty: 'easy' },
  { title: '500 XP Week', titleAr: '٥٠٠ نقطة في أسبوع', description: 'Earn 500 XP in seven days, any way you like.', descriptionAr: 'اكسب ٥٠٠ نقطة في سبع أيام، بأي طريقة.', goalType: 'xp', goalValue: 500, days: 7, rewardXp: 150, difficulty: 'medium' },

  // --- Two weeks ---
  { title: '40 Sets in 14 Days', titleAr: '٤٠ مجموعة في ١٤ يوم', description: 'Log forty sets in the lift tracker. Track everything.', descriptionAr: 'سجّل ٤٠ مجموعة في متابعة الحديد. سجّل كل حاجة.', goalType: 'lifts', goalValue: 40, days: 14, rewardXp: 200, difficulty: 'medium' },
  { title: 'Learn From Reels', titleAr: 'اتعلم من الريلز', description: 'Watch thirty form and technique reels in two weeks.', descriptionAr: 'اتفرج على ٣٠ ريل عن الأداء الصح في أسبوعين.', goalType: 'reels', goalValue: 30, days: 14, rewardXp: 80, difficulty: 'easy' },
  { title: 'Consistency Fortnight', titleAr: 'أسبوعين ثبات', description: 'Six workouts across fourteen days. Show up.', descriptionAr: 'ست تمرينات في ١٤ يوم. المهم تيجي.', goalType: 'lessons', goalValue: 6, days: 14, rewardXp: 220, difficulty: 'medium' },

  // --- Month ---
  { title: '12 Workouts in 30 Days', titleAr: '١٢ تمرينة في ٣٠ يوم', description: 'Three a week for a month. This is what progress looks like.', descriptionAr: 'تلاتة في الأسبوع لمدة شهر. كده بالظبط شكل التقدم.', goalType: 'lessons', goalValue: 12, days: 30, rewardXp: 400, difficulty: 'medium' },
  { title: '30-Day Streak', titleAr: 'شهر متواصل', description: 'A full month without breaking the chain.', descriptionAr: 'شهر كامل من غير ما تقطع السلسلة.', goalType: 'streak', goalValue: 30, days: 30, rewardXp: 600, difficulty: 'hard' },
  { title: '2000 XP Month', titleAr: '٢٠٠٠ نقطة في شهر', description: 'Two thousand XP in thirty days. Serious territory.', descriptionAr: 'ألفين نقطة في ٣٠ يوم. المستوى ده جد.', goalType: 'xp', goalValue: 2000, days: 30, rewardXp: 500, difficulty: 'hard' },
  { title: 'Iron Month', titleAr: 'شهر الحديد', description: 'One hundred logged sets in thirty days.', descriptionAr: 'مية مجموعة مسجلة في ٣٠ يوم.', goalType: 'lifts', goalValue: 100, days: 30, rewardXp: 500, difficulty: 'hard' },
  { title: 'Hydration Month', titleAr: 'شهر المية', description: 'Two hundred and forty glasses in thirty days.', descriptionAr: '٢٤٠ كوباية في ٣٠ يوم.', goalType: 'water', goalValue: 240, days: 30, rewardXp: 400, difficulty: 'medium' },

  // --- Long haul ---
  { title: '90-Day Transformation', titleAr: 'تحول ٩٠ يوم', description: 'Thirty-six workouts in ninety days. The one that actually changes things.', descriptionAr: '٣٦ تمرينة في ٩٠ يوم. ده اللي بيغيّر فعلاً.', goalType: 'lessons', goalValue: 36, days: 90, rewardXp: 1200, difficulty: 'hard' },
  { title: '100-Day Streak', titleAr: 'مية يوم متواصلة', description: 'One hundred days in a row. Very few get here.', descriptionAr: 'مية يوم ورا بعض. ناس قليلة جداً بتوصل هنا.', goalType: 'streak', goalValue: 100, days: 120, rewardXp: 2000, difficulty: 'hard' },
];

/** The Saturday that opens the current week — must match lib/time.ts weekStart(). */
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d.toISOString().slice(0, 10);
};

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function run() {
  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { code: b.code }, create: b, update: b });
  }

  const startsOn = new Date().toISOString().slice(0, 10);
  let created = 0;
  let updated = 0;
  for (const { days, ...c } of CHALLENGES) {
    const data = { ...c, kind: 'global', startsOn, endsOn: addDays(days) };
    const existing = await prisma.challenge.findFirst({ where: { title: c.title } });
    if (existing) {
      // Keep dates rolling forward but never move a challenge people already joined
      // out from under them — only the reward and copy are refreshed.
      await prisma.challenge.update({
        where: { id: existing.id },
        data: { titleAr: c.titleAr, description: c.description, descriptionAr: c.descriptionAr, rewardXp: c.rewardXp, difficulty: c.difficulty },
      });
      updated++;
    } else {
      await prisma.challenge.create({ data });
      created++;
    }
  }

  // Older challenges predate rewardXp and would otherwise pay nothing on completion.
  // Scale the reward to the commitment, rounded to a number that reads well.
  const unrewarded = await prisma.challenge.findMany({
    where: { rewardXp: 0 },
    select: { id: true, startsOn: true, endsOn: true },
  });
  for (const c of unrewarded) {
    const days = Math.max(1, Math.round((Date.parse(c.endsOn) - Date.parse(c.startsOn)) / 86400000));
    const xp = Math.min(1500, Math.max(75, Math.round((days * 12) / 25) * 25));
    await prisma.challenge.update({
      where: { id: c.id },
      data: { rewardXp: xp, difficulty: days >= 60 ? 'hard' : days >= 21 ? 'medium' : 'easy' },
    });
  }

  // Seed this week's league rooms so a fresh install shows a populated ladder
  // instead of a room of one. Real users join lazily on their first request.
  const week = weekStart();
  const users = await prisma.user.findMany({ where: { xp: { gt: 0 } }, orderBy: { xp: 'desc' }, select: { id: true, xp: true } });
  let enrolled = 0;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    // Spread the seeded users across tiers by lifetime XP so every tier has faces.
    const tier = u.xp >= 4000 ? 3 : u.xp >= 2000 ? 2 : u.xp >= 700 ? 1 : 0;
    const existing = await prisma.leagueMember.findUnique({ where: { userId_weekKey: { userId: u.id, weekKey: week } } });
    if (existing) continue;
    await prisma.leagueMember.create({ data: { userId: u.id, weekKey: week, tier, room: 0 } });
    enrolled++;
  }

  console.log(
    `Badges: ${BADGES.length} upserted. Challenges: ${created} created, ${updated} refreshed, ` +
    `${unrewarded.length} back-filled with rewards. League: ${enrolled} enrolled for ${week}.`,
  );
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
