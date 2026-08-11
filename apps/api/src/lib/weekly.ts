import { prisma } from './prisma';
import { weekKey, dayString } from './time';
import { notifyUser } from '../routes/push';
import { createFeedPost } from './social';

/**
 * The always-on weekly challenge: auto-created every Saturday (app timezone),
 * announced to everyone, and the previous week's podium is celebrated — feed
 * post for each winner + a coach message in the closed room. Runs daily from
 * the reminder scheduler; the seasonKey `week:<saturday>` makes it idempotent.
 * Nobody has to remember to create it — the app always has a live shared goal.
 */

type WeeklyTheme = {
  emoji: string;
  title: string;
  titleAr: string;
  desc: string;
  descAr: string;
  goalType: string;
  goalValue: number;
  rewardXp: number;
  difficulty: string;
};

// Rotation order = week index mod pool. Goal types all advance automatically
// via bumpChallenges, so progress needs zero extra plumbing.
const WEEKLY: WeeklyTheme[] = [
  { emoji: '🏋️', title: 'Week of 3', titleAr: 'أسبوع الـ٣', goalType: 'lessons', goalValue: 3, rewardXp: 150, difficulty: 'easy',
    desc: 'Three workouts before Friday night. Start today, thank yourself Friday.', descAr: '٣ تمرينات قبل ليلة الجمعة. ابدأ النهارده وهتشكر نفسك الجمعة.' },
  { emoji: '🔥', title: '5-Day Fire Streak', titleAr: 'سلسلة النار: ٥ أيام', goalType: 'streak', goalValue: 5, rewardXp: 200, difficulty: 'medium',
    desc: 'Stay active five days in a row this week — any movement counts.', descAr: 'اتحرك ٥ أيام ورا بعض الأسبوع ده — أي حركة بتتحسب.' },
  { emoji: '💧', title: 'Hydration Week', titleAr: 'أسبوع المية', goalType: 'water', goalValue: 40, rewardXp: 120, difficulty: 'easy',
    desc: 'Log 40 glasses of water this week. Your body will feel the difference.', descAr: 'سجّل ٤٠ كوباية مية الأسبوع ده. جسمك هيحس بالفرق.' },
  { emoji: '💪', title: 'Iron Week', titleAr: 'أسبوع الحديد', goalType: 'lifts', goalValue: 15, rewardXp: 200, difficulty: 'medium',
    desc: 'Log 15 sets in the lift tracker this week — progressive overload starts with writing it down.', descAr: 'سجّل ١٥ مجموعة في متتبع الأوزان الأسبوع ده — التقدم بيبدأ من التسجيل.' },
  { emoji: '⚡', title: 'Power Week of 5', titleAr: 'أسبوع القوة: ٥ تمرينات', goalType: 'lessons', goalValue: 5, rewardXp: 250, difficulty: 'hard',
    desc: 'Five workouts in seven days. For the ones who want it more.', descAr: '٥ تمرينات في ٧ أيام. للي عايزها بجد.' },
  { emoji: '🎯', title: 'XP Hunt: 300', titleAr: 'صيد النقاط: ٣٠٠', goalType: 'xp', goalValue: 300, rewardXp: 150, difficulty: 'medium',
    desc: 'Collect 300 XP this week — workouts, meals, challenges, everything counts.', descAr: 'اجمع ٣٠٠ نقطة الأسبوع ده — تمرين، أكل، تحديات، كله بيتحسب.' },
];

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

export async function ensureWeeklyChallenge() {
  const start = weekKey(); // this week's Saturday
  const key = `week:${start}`;
  const exists = await prisma.challenge.findFirst({ where: { seasonKey: key } });
  if (exists) return;

  const idx = Math.floor(Date.parse(`${start}T00:00:00Z`) / (7 * 86400000)) % WEEKLY.length;
  const t = WEEKLY[idx];
  const challenge = await prisma.challenge.create({
    data: {
      title: `Weekly: ${t.title} ${t.emoji}`,
      titleAr: `تحدي الأسبوع: ${t.titleAr} ${t.emoji}`,
      description: t.desc,
      descriptionAr: t.descAr,
      goalType: t.goalType,
      goalValue: t.goalValue,
      rewardXp: t.rewardXp,
      difficulty: t.difficulty,
      startsOn: start,
      endsOn: addDays(start, 6),
      seasonKey: key,
      kind: 'global',
    },
  });
  console.log(`[weekly] created "${t.title}" (${start})`);

  await announceWinners(addDays(start, -7)).catch((e) => console.warn('[weekly] winners:', e?.message));

  // Tell the LIVING audience there's a fresh shared goal — accounts dead for
  // 30+ days get the lapsed-user flow instead of a weekly ping forever.
  const users = await prisma.user.findMany({
    where: { lastActiveOn: { gte: addDays(start, -30) } },
    select: { id: true },
  });
  void (async () => {
    for (const u of users) {
      await notifyUser(u.id, {
        title: `New weekly challenge ${t.emoji}`,
        titleAr: `تحدي الأسبوع وصل ${t.emoji}`,
        body: `${t.title} — join now, the whole app is in.`,
        bodyAr: `${t.titleAr} — ادخل دلوقتي، كل الناس بتلعب.`,
        url: `/challenge/${challenge.id}`,
        type: 'general',
      }).catch(() => {});
    }
    console.log(`[weekly] announced to ${users.length} user(s)`);
  })();
}

/** Podium for the week that just closed: feed post per winner + coach message in the room. */
async function announceWinners(prevStart: string) {
  const prev = await prisma.challenge.findFirst({ where: { seasonKey: `week:${prevStart}` } });
  if (!prev) return;

  const top = await prisma.challengeParticipant.findMany({
    where: { challengeId: prev.id, progress: { gt: 0 } },
    orderBy: [{ progress: 'desc' }, { completedAt: 'asc' }, { joinedAt: 'asc' }],
    take: 3,
    include: { user: { select: { id: true, firstName: true } } },
  });
  if (!top.length) return;

  const medals = ['🥇', '🥈', '🥉'];
  const ranksAr = ['الأول', 'التاني', 'التالت'];
  const ranksEn = ['1st', '2nd', '3rd'];

  for (let i = 0; i < top.length; i++) {
    const w = top[i];
    await createFeedPost(w.userId, 'challenge', `Finished ${ranksEn[i]} in "${prev.title}" ${medals[i]}`, 'challenge', prev.id, {
      textAr: `جاب المركز ${ranksAr[i]} في "${prev.titleAr ?? prev.title}" ${medals[i]}`,
    }).catch(() => {});
    await notifyUser(w.userId, {
      title: `You finished ${ranksEn[i]} ${medals[i]}`,
      titleAr: `جبت المركز ${ranksAr[i]} ${medals[i]}`,
      body: `"${prev.title}" is done — everyone saw your name on the podium.`,
      bodyAr: `"${prev.titleAr ?? prev.title}" خلص — اسمك اتكتب في البوديوم قدام الكل.`,
      url: '/community',
      type: 'general',
    }).catch(() => {});
  }

  const line = top.map((w, i) => `${medals[i]} ${w.user.firstName} (${w.progress})`).join(' · ');
  await prisma.challengeMessage.create({
    data: { challengeId: prev.id, isCoach: true, text: `🏁 النتيجة النهائية: ${line} — شكراً لكل اللي شارك، التحدي الجديد بدأ خلاص! 💪` },
  }).catch(() => {});
  console.log(`[weekly] podium for "${prev.title}": ${line}`);
}

// Egyptian-Arabic coach prompts — one lands in every open global challenge room
// each day, so official rooms always have a fresh conversation starter.
const COACH_PROMPTS = [
  'صباح الطاقة يا أبطال ☀️ مين اتمرن النهارده؟ قولولنا إيه اللي عملتوه 👇',
  'سؤال النهارده: إيه أكتر تمرين بتحبه وإيه أكتر واحد بتكرهه؟ 😅',
  'نصيحة اليوم: النوم كويس نص التمرين. مين نام ٧ ساعات امبارح؟ 😴',
  'ورونا تقدمكم! مين وصل لنص التحدي؟ 🔥',
  'اللي لسه مبدأش: أول خطوة أصعب خطوة. ابدأ بتمرين واحد بس النهارده 💪',
  'إيه أكلتكم المفضلة بعد التمرين؟ شير وصفتك مع الجروب 🍗',
  'تحفيز اليوم: مفيش حد ندم إنه اتمرن. في حد ندم إنه معملش 😉',
  'مين محتاج شريك يشجعه؟ اعمل منشن لصاحبك يدخل معانا 👊',
  'سؤال: بتتمرن الصبح ولا بليل؟ وليه؟ ⏰',
  'افتكروا: المية قبل الأكل بتفرق. اشربوا كوبايتين دلوقتي ونرجع نكمل 💧',
  'اللي خلص تمرين النهارده يحط 🔥 في الكومنتات — عايزين نشوف نار',
  'نصيحة: متقارنش نفسك بحد غير نفسك الأسبوع اللي فات 📈',
  'مين جرب وصفة من وصفات التطبيق؟ إيه رأيكم؟ 🍽️',
  'الراحة مش كسل — العضلات بتكبر وانت بترتاح. خدوا يوم راحة من غير ذنب 😌',
  'آخر كام يوم في التحدي! شد حيلك، البوديوم مستنيك 🏁',
];

/** Post today's coach prompt into every open official challenge room. */
export async function postDailyChallengePrompts() {
  const today = dayString();
  const open = await prisma.challenge.findMany({
    where: { kind: 'global', startsOn: { lte: today }, endsOn: { gte: today } },
    select: { id: true, title: true },
  });
  if (!open.length) return;
  const dayIdx = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000);
  for (let i = 0; i < open.length; i++) {
    const text = COACH_PROMPTS[(dayIdx + i) % COACH_PROMPTS.length];
    await prisma.challengeMessage.create({ data: { challengeId: open[i].id, isCoach: true, text } }).catch(() => {});
  }
  console.log(`[weekly] coach prompt posted to ${open.length} room(s)`);
}
