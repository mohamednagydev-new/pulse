/** Badge + challenge content pack (EN + Egyptian Arabic). Idempotent — skips existing.
 *  Badge codes match the award logic in apps/api/src/lib/gamify.ts checkBadges().
 *  Run: npx tsx prisma/seed-engagement.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BADGES = [
  { code: 'hundred_workouts', title: 'Century Club', titleAr: 'نادي المية', description: 'Complete 100 workouts', icon: '💯' },
  { code: 'quarter_streak', title: 'Unstoppable', titleAr: 'مبيتوقفش', description: '90-day streak', icon: '🚀' },
  { code: 'level_5', title: 'Rising Star', titleAr: 'موهبة صاعدة', description: 'Reach level 5', icon: '⭐' },
  { code: 'level_10', title: 'Elite', titleAr: 'من الكبار', description: 'Reach level 10', icon: '👑' },
  { code: 'first_lift', title: 'First Lift', titleAr: 'أول رفعة', description: 'Log your first set', icon: '🏋️' },
  { code: 'lifter_25', title: 'Iron Addict', titleAr: 'قلبك حديد', description: 'Log 25 sets', icon: '⚒️' },
  { code: 'first_buddy', title: 'Better Together', titleAr: 'أحلى مع صاحبك', description: 'Connect with your first buddy', icon: '🤝' },
  { code: 'social_5', title: 'Squad Leader', titleAr: 'روح الشلة', description: 'Connect with 5 buddies', icon: '👥' },
  { code: 'first_reel', title: 'On Camera', titleAr: 'على الكاميرا', description: 'Post your first reel', icon: '🎬' },
  { code: 'nutrition_10', title: 'Food Logger', titleAr: 'يوميات الأكل', description: 'Log 10 foods', icon: '🥗' },
  { code: 'nutrition_50', title: 'Nutrition Pro', titleAr: 'أسطورة التغذية', description: 'Log 50 foods', icon: '🍎' },
  { code: 'challenger', title: 'Challenger', titleAr: 'روح التحدي', description: 'Join your first challenge', icon: '🎯' },
  { code: 'first_referral', title: 'Spread the Pulse', titleAr: 'وصّل الطاقة', description: 'Invite your first friend', icon: '📣' },
  { code: 'recruiter_5', title: 'Community Builder', titleAr: 'باني المجتمع', description: 'Invite 5 friends', icon: '🏗️' },
];

function dstr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const CHALLENGES = [
  { title: 'New Week, New You', titleAr: 'أسبوع جديد، إنت الجديد', description: 'Complete 5 workouts this week.', goalType: 'lessons', goalValue: 5, startsOn: dstr(0), endsOn: dstr(7) },
  { title: '14-Day Fire Streak', titleAr: 'حماس 14 يوم', description: 'Stay active 14 days in a row.', goalType: 'streak', goalValue: 14, startsOn: dstr(0), endsOn: dstr(21) },
  { title: 'Clean Fuel Week', titleAr: 'أسبوع الأكل النضيف', description: 'Log your meals for 7 days — 10,000 kcal tracked.', goalType: 'calories', goalValue: 10000, startsOn: dstr(0), endsOn: dstr(10) },
  { title: '20 Sessions in 30 Days', titleAr: '20 تمرينة في 30 يوم', description: 'Twenty workouts inside one month. Legends only.', goalType: 'lessons', goalValue: 20, startsOn: dstr(0), endsOn: dstr(30) },
  { title: 'Weekend Warrior', titleAr: 'طاقة الويك إند', description: 'Two workouts before Monday.', goalType: 'lessons', goalValue: 2, startsOn: dstr(0), endsOn: dstr(4) },
  { title: '30-Day Consistency Crown', titleAr: 'تاج المداومة 30 يوم', description: 'A full month streak. Take the crown.', goalType: 'streak', goalValue: 30, startsOn: dstr(0), endsOn: dstr(40) },
  { title: 'Macro Master', titleAr: 'أسطورة الماكروز', description: 'Track 25,000 kcal of clean eating.', goalType: 'calories', goalValue: 25000, startsOn: dstr(0), endsOn: dstr(21) },
  { title: 'Fresh Start 10', titleAr: 'بداية جديدة 10', description: 'Ten workouts — your comeback starts now.', goalType: 'lessons', goalValue: 10, startsOn: dstr(0), endsOn: dstr(21) },
];

async function run() {
  let b = 0, c = 0;
  for (const badge of BADGES) {
    const exists = await prisma.badge.findUnique({ where: { code: badge.code } });
    if (!exists) { await prisma.badge.create({ data: badge }); b++; }
  }
  for (const ch of CHALLENGES) {
    const exists = await prisma.challenge.findFirst({ where: { title: ch.title } });
    if (!exists) { await prisma.challenge.create({ data: ch }); c++; }
  }
  console.log(`engagement pack: +${b} badges, +${c} challenges`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
