import { prisma } from './prisma';
import { env } from '../env';
import { notifyUser } from '../routes/push';
import { sendMail } from './mailer';

/**
 * New-user activation drip — the first 72 hours own retention, and until now
 * they were silent: the generic reminders only reach push-granted users, and
 * the win-back digest first fires up to 6 days after signup.
 *
 * One message per day, each tied to ONE concrete action, and each skipped the
 * moment the user has already done that action:
 *   D1 — hasn't completed any lesson  → "your first session is ~10 minutes"
 *   D2 — hasn't logged any food       → "log one meal, see your calories"
 *   D3 — hasn't opened the app in 24h → "day 3: your first badge is one workout away"
 *
 * Delivery: notifyUser always (persists in-app + push when granted). Users with
 * NO push subscription get the same message by email too — otherwise they are
 * unreachable until they happen to come back on their own.
 */

type Msg = { title: string; titleAr: string; body: string; bodyAr: string; url: string };

const D1: Msg = {
  title: 'Your first session is ~10 minutes 💪',
  titleAr: 'أول تمرينة ليك — ١٠ دقايق بس 💪',
  body: 'Your plan is ready and waiting. One short session today is all it takes to start.',
  bodyAr: 'خطتك جاهزة ومستنياك. تمرينة واحدة قصيرة النهارده وتكون بدأت فعلاً.',
  url: '/',
};
const D2: Msg = {
  title: 'Log one meal — see your calories 🥗',
  titleAr: 'سجّل وجبة واحدة وشوف سعراتك 🥗',
  body: 'Snap or type what you ate and the app counts the calories for you. Takes 20 seconds.',
  bodyAr: 'صوّر أو اكتب اللي أكلته والتطبيق يحسبلك السعرات. ٢٠ ثانية بالظبط.',
  url: '/tracker',
};
const D3: Msg = {
  title: 'Day 3: your first badge is one workout away 🔥',
  titleAr: 'يوم ٣: أول بادج على بُعد تمرينة واحدة 🔥',
  body: 'Train today and your streak starts counting. Small steps, every day — that is the whole secret.',
  bodyAr: 'اتمرن النهارده والسلسلة تبدأ تعدّ. خطوات صغيرة كل يوم — ده السر كله.',
  url: '/',
};

async function sendDrip(user: { id: string; email: string; emailOptOut: boolean }, msg: Msg): Promise<boolean> {
  await notifyUser(user.id, {
    title: msg.title,
    titleAr: msg.titleAr,
    body: msg.body,
    bodyAr: msg.bodyAr,
    url: msg.url,
    type: 'general',
  }).catch(() => {});
  const subs = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (subs === 0 && !user.emailOptOut) {
    const link = `${env.WEB_ORIGIN}${msg.url}`;
    await sendMail({
      to: user.email,
      subject: msg.title,
      text: `${msg.body}\n\n${link}`,
      html: `<p>${msg.body}</p><p><a href="${link}">${link}</a></p>`,
      appLinks: true,
    }).catch(() => ({ ok: false as const, reason: 'threw' }));
    return true; // emailed
  }
  return false;
}

/** Signed up between N and N+1 days ago, not banned. */
function cohortWhere(daysAgo: number) {
  const now = Date.now();
  return {
    bannedAt: null,
    createdAt: { lt: new Date(now - daysAgo * 86_400_000), gte: new Date(now - (daysAgo + 1) * 86_400_000) },
  };
}

const COHORT_SELECT = { id: true, email: true, emailOptOut: true, lastSeenAt: true } as const;

export async function runNewUserDrip(): Promise<string> {
  let d1 = 0, d2 = 0, d3 = 0, emails = 0;

  // D1: no lesson completed yet.
  const day1 = await prisma.user.findMany({ where: cohortWhere(1), select: COHORT_SELECT, take: 500 });
  for (const u of day1) {
    const done = await prisma.lessonCompletion.count({ where: { userId: u.id } });
    if (done > 0) continue;
    if (await sendDrip(u, D1)) emails++;
    d1++;
  }

  // D2: no food logged yet.
  const day2 = await prisma.user.findMany({ where: cohortWhere(2), select: COHORT_SELECT, take: 500 });
  for (const u of day2) {
    const logged = await prisma.calorieEntry.count({ where: { userId: u.id } });
    if (logged > 0) continue;
    if (await sendDrip(u, D2)) emails++;
    d2++;
  }

  // D3: quiet for 24h+ (whatever they did before, today they're drifting).
  const day3 = await prisma.user.findMany({ where: cohortWhere(3), select: COHORT_SELECT, take: 500 });
  for (const u of day3) {
    if (u.lastSeenAt && Date.now() - u.lastSeenAt.getTime() < 86_400_000) continue;
    if (await sendDrip(u, D3)) emails++;
    d3++;
  }

  return `d1:${d1} d2:${d2} d3:${d3} emails:${emails}`;
}

/**
 * Week-1 connection nudge: a user with even one buddy or a joined group session
 * has someone expecting them. Day 4-6 users with neither get one (and only one)
 * invite to connect — deduped forever via a per-user JobRun claim.
 */
export async function runConnectionNudge(): Promise<string> {
  const now = Date.now();
  const candidates = await prisma.user.findMany({
    where: {
      bannedAt: null,
      createdAt: { lt: new Date(now - 4 * 86_400_000), gte: new Date(now - 7 * 86_400_000) },
    },
    select: { id: true },
    take: 500,
  });
  let sent = 0;
  for (const u of candidates) {
    const [conn, joined] = await Promise.all([
      prisma.connection.count({ where: { status: 'accepted', OR: [{ requesterId: u.id }, { addresseeId: u.id }] } }),
      prisma.groupParticipant.count({ where: { userId: u.id } }),
    ]);
    if (conn > 0 || joined > 0) continue;
    // Once per user, ever — the JobRun unique key referees restarts too.
    try {
      await prisma.jobRun.create({ data: { key: `connectnudge:${u.id}` } });
    } catch {
      continue; // already nudged
    }
    await notifyUser(u.id, {
      title: 'Training together sticks 👯',
      titleAr: 'التمرين مع حد بيكمّل 👯',
      body: 'Invite a friend as your workout buddy, or join this week’s live group session — people who train together keep going.',
      bodyAr: 'اعزم صاحبك يبقى زميلك في التمرين، أو انضم لجلسة الجروب اللايف الأسبوع ده — اللي بيتمرنوا مع بعض بيكمّلوا.',
      url: '/buddies',
      type: 'general',
    }).catch(() => {});
    sent++;
  }
  return `nudged:${sent} of ${candidates.length} in window`;
}
