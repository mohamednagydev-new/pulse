import { prisma } from './prisma';
import { notifyUser, pushEnabled } from '../routes/push';
import { ensureCurrentSeason } from './seasons';
import { settleStaleRooms, promotionCliffhangers } from './leagues';
import { nextCheckDate } from './coach';
import { dayString, daysAgoStr, localHour, localDow } from './time';

/** Hourly reminder engine. In-app notifications always persist (via notifyUser);
 *  push delivery additionally requires VAPID. */
export function startReminderScheduler() {
  setInterval(runCheck, 60 * 60 * 1000); // hourly
  runCheck();
}

/**
 * Claim a one-shot job key (e.g. "nudge:2026-08-05:19"). runCheck fires on every
 * boot as well as hourly, so a restart inside the trigger hour would otherwise
 * send the same notifications twice. The unique constraint makes the claim
 * atomic across restarts (and across instances, should there ever be two).
 */
async function claimJob(key: string): Promise<boolean> {
  try {
    await prisma.jobRun.create({ data: { key } });
    return true;
  } catch {
    return false; // unique violation — this slot already ran
  }
}

// Rotating motivational copy — personalized, gender-neutral, warm.
// {name} and {streak} are substituted; language follows the user's preferredLang.
const DAILY_EN = [
  { title: 'Keep your streak alive 🔥', body: "{name}, you're on a {streak}-day streak — one workout keeps it burning!" },
  { title: "Your body will thank you 💪", body: '{name}, 20 minutes today beats zero. Ready?' },
  { title: 'Day {streak} + 1? 🚀', body: "Don't stop now {name} — today makes it {next} in a row." },
  { title: 'Small step, big win ⭐', body: 'One session today, {name}. Future you is watching.' },
];
const DAILY_EN_NO_STREAK = [
  { title: 'Time to move 💪', body: '{name}, your daily workout is waiting.' },
  { title: 'Fresh start today ⚡', body: 'Day 1 starts whenever you do, {name}. Make it now.' },
  { title: 'You showed up before 🏆', body: 'Do it again today, {name} — 15 minutes is enough.' },
];
const DAILY_AR = [
  { title: 'كمّل السلسلة 🔥', body: '{name}، إنت في يوم {streak} على التوالي — تمرينة واحدة النهارده تكمّلها!' },
  { title: 'جسمك هيشكرك 💪', body: '{name}، 20 دقيقة النهارده أحسن من ولا حاجة. يلا؟' },
  { title: 'يوم {next} على الطريق 🚀', body: 'متوقفش دلوقتي يا {name} — النهارده بيكمل السلسلة.' },
  { title: 'خطوة صغيرة، مكسب كبير ⭐', body: 'حصة واحدة النهارده يا {name}. نفسك في المستقبل بيشجعك.' },
];
const DAILY_AR_NO_STREAK = [
  { title: 'وقت الحركة 💪', body: '{name}، تمرينك اليومي مستنيك.' },
  { title: 'بداية جديدة النهارده ⚡', body: 'اليوم الأول بيبدأ لما تقرر يا {name}. خليها دلوقتي.' },
  { title: 'عملتها قبل كده 🏆', body: 'اعملها تاني النهارده يا {name} — ربع ساعة كفاية.' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function fill(t: { title: string; body: string }, name: string, streak: number) {
  const sub = (s: string) =>
    s.replaceAll('{name}', name).replaceAll('{streak}', String(streak)).replaceAll('{next}', String(streak + 1));
  return { title: sub(t.title), body: sub(t.body) };
}

async function runCheck() {
  const now = new Date();
  const hour = localHour(now); // app timezone — reminder hours mean the user's clock
  const day = dayString(now);

  // Monthly season rotation — idempotent, cheap (one indexed query when already created).
  await ensureCurrentSeason().catch((e) => console.warn('[seasons]', e?.message));

  // Close out last week's league rooms so podium XP lands even for people who
  // haven't opened the app since.
  await settleStaleRooms().catch((e) => console.warn('[leagues]', e?.message));

  // Daily nudge — people who haven't trained today, at their preferred hour (default 19:00).
  // (When push isn't configured these still land in the in-app notifications center.)
  const nudgeSlot = await claimJob(`nudge:${day}:${hour}`);
  const candidates = nudgeSlot
    ? await prisma.user.findMany({
        where: { NOT: { lastActiveOn: day }, ...(pushEnabled() ? { pushSubs: { some: {} } } : {}) },
        select: { id: true, firstName: true, currentStreak: true, reminderHour: true, preferredLang: true },
      })
    : [];
  for (const u of candidates) {
    if (hour !== (u.reminderHour ?? 19)) continue;
    const ar = u.preferredLang === 'ar';

    // If they're partway through a program, name the actual session waiting for
    // them. "Day 3: Back & Biceps" is a far better nudge than "time to move".
    const nudge = await pathNudge(u.id, ar);
    if (nudge) {
      notifyUser(u.id, { ...nudge, type: 'reminder' });
      continue;
    }

    const pool = u.currentStreak > 0 ? (ar ? DAILY_AR : DAILY_EN) : (ar ? DAILY_AR_NO_STREAK : DAILY_EN_NO_STREAK);
    const msg = fill(pick(pool), u.firstName, u.currentStreak);
    notifyUser(u.id, { ...msg, url: u.currentStreak > 0 ? '/' : '/workout', type: 'reminder' });
  }

  // Plan re-check — once, at 11:00, when the four weeks are up. Waiting on the plan
  // screen to be discovered means most people never re-check at all.
  if (hour === 11) {
    const due = await prisma.assessment.findMany({
      where: { nextCheckOn: { lte: day } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, nextCheckOn: true },
    });
    const seen = new Set<string>();
    for (const a of due) {
      if (seen.has(a.userId)) continue; // newest per user only
      seen.add(a.userId);
      notifyUser(a.userId, {
        title: 'Time to re-check your plan',
        titleAr: 'وقت تراجع خطتك',
        body: "It's been four weeks. Two minutes to make sure it still fits.",
        bodyAr: 'عدت أربع أسابيع. دقيقتين تتأكد إنها لسه مناسبة.',
        url: '/my-plan',
        type: 'reminder',
      });
      // Push the date out so a user who ignores it isn't nagged daily.
      await prisma.assessment.update({
        where: { id: a.id },
        data: { nextCheckOn: nextCheckDate(day) },
      }).catch(() => {});
    }
    if (seen.size) console.log(`[coach] invited ${seen.size} user(s) to re-check`);
  }

  // Weekly recap — Friday 10:00 (start of the Egyptian weekend): your week in numbers.
  if (localDow(now) === 5 && hour === 10 && (await claimJob(`recap:${day}`))) {
    await sendWeeklyRecaps();
  }

  // League cliffhanger — Friday 17:00, hours before Saturday settlement: people
  // within one good session of the promotion line get told exactly how far.
  if (localDow(now) === 5 && hour === 17 && (await claimJob(`cliffhanger:${day}`))) {
    const near = await promotionCliffhangers().catch(() => [] as { userId: string; gap: number }[]);
    for (const n of near) {
      notifyUser(n.userId, {
        title: 'One session from promotion 🏆',
        titleAr: 'حصة واحدة وتصعد 🏆',
        body: `You're ${n.gap} XP from the promotion line — the league settles tonight. One workout does it.`,
        bodyAr: `فاضلك ${n.gap} نقطة على خط الصعود — الدوري بيتقفل الليلة. تمرينة واحدة تكفي.`,
        url: '/leagues',
        type: 'reminder',
      });
    }
    if (near.length) console.log(`[league] nudged ${near.length} cliffhanger(s)`);
  }

  // Nightly data retention (04:00) — keep the hot tables bounded.
  if (hour === 4) {
    const cut = (days: number) => new Date(Date.now() - days * 86400000);
    await Promise.all([
      prisma.event.deleteMany({ where: { createdAt: { lt: cut(90) } } }),
      prisma.notification.deleteMany({ where: { createdAt: { lt: cut(60) } } }),
      prisma.reelWatch.deleteMany({ where: { createdAt: { lt: cut(45) } } }),
      prisma.jobRun.deleteMany({ where: { ranAt: { lt: cut(14) } } }),
    ]).catch((e) => console.warn('[retention]', e?.message));
    if (await claimJob(`backup:${day}`)) await backupDatabase(day);
  }

  // Saturday 12:00 — auto-post last week's league promotions to the Facebook
  // Page (the fixed weekly appointment from LAUNCH-CAMPAIGNS.md, on autopilot).
  // Requires FB_PAGE_ID/FB_PAGE_TOKEN in .env; silently skipped otherwise.
  if (localDow(now) === 6 && hour === 12 && (await claimJob(`fbleague:${day}`))) {
    await postLeaguePromotions().catch((e) => console.warn('[fb-league]', e?.message));
  }

  // Lapsed re-engagement — no activity for 3+ days (once, at 18:00).
  if (hour === 18 && (await claimJob(`lapsed:${day}`))) {
    const threeAgo = daysAgoStr(3);
    const lapsed = await prisma.user.findMany({
      where: { ...(pushEnabled() ? { pushSubs: { some: {} } } : {}), lastActiveOn: { lt: threeAgo } },
      select: { id: true, firstName: true, preferredLang: true },
    });
    for (const u of lapsed) {
      const ar = u.preferredLang === 'ar';
      notifyUser(u.id, {
        title: ar ? 'واحشنا في PULSE 👋' : 'We miss you at PULSE 👋',
        body: ar ? `${u.firstName}، ارجع وابدأ سلسلتك من جديد النهارده.` : `${u.firstName}, come back and restart your streak today.`,
        url: '/',
        type: 'reminder',
      });
    }
  }
}

/**
 * Nightly SQLite backup via VACUUM INTO — a consistent point-in-time copy that
 * works while the app is live (plain file copy of a WAL database is not safe).
 * Lands in BACKUP_DIR (default <repo>/backups); keeps the newest 14. Point
 * BACKUP_DIR at a mounted/synced drive to make it off-site.
 */
async function backupDatabase(day: string) {
  const fs = await import('fs');
  const path = await import('path');
  try {
    const dir = process.env.BACKUP_DIR
      ? path.resolve(process.env.BACKUP_DIR)
      : path.resolve(__dirname, '../../../../backups');
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, `pulse-${day}.db`);
    if (fs.existsSync(target)) fs.unlinkSync(target); // VACUUM INTO refuses to overwrite
    // Forward slashes: SQLite treats backslashes in the quoted path literally.
    await prisma.$queryRawUnsafe(`VACUUM INTO '${target.replace(/\\/g, '/').replace(/'/g, "''")}'`);
    const keep = 14;
    const old = fs.readdirSync(dir).filter((f) => /^pulse-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -keep);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
    console.log(`[backup] wrote ${target}`);
  } catch (e) {
    console.error('[backup] FAILED — the database has no fresh copy tonight:', (e as Error)?.message);
  }
}

/**
 * Compose and publish the weekly league-promotions post to the Facebook Page.
 * First names only (never full identity), top 6, plus totals — recognition
 * content that users screenshot and reshare themselves.
 */
async function postLeaguePromotions() {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!pageId || !token) return;

  const { weekKey } = await import('./time');
  const lastWeek = weekKey(new Date(Date.now() - 7 * 86_400_000));
  const promoted = await prisma.leagueMember.findMany({
    where: { weekKey: lastWeek, result: 'promoted' },
    include: { user: { select: { firstName: true } } },
    take: 200,
  });
  if (promoted.length === 0) return; // quiet week — no post beats an empty post

  const names = promoted.slice(0, 6).map((p) => p.user.firstName).filter(Boolean);
  const more = promoted.length - names.length;
  const message =
    `🏆 نتايج الدوري الأسبوعي!\n\n` +
    `${promoted.length} متدرب طلعوا لدوري أعلى الأسبوع ده 🔼\n` +
    `مبروك لـ ${names.join('، ')}${more > 0 ? ` و${more} كمان` : ''} 🥇\n\n` +
    `الأسبوع الجديد بدأ من دلوقتي — كل نقطة بتتحسب.\n` +
    `ادخل دوريك 👇\nhttps://pulse.geddo.online/leagues`;

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, link: 'https://pulse.geddo.online/leagues', access_token: token }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (json.id) console.log(`[fb-league] posted ${json.id} (${promoted.length} promotions)`);
  else console.warn('[fb-league] post failed:', JSON.stringify(json.error ?? json));
}

/** "Your week: 4 workouts, 2 PRs, streak 12 🔥" — sent to everyone active in the last 14 days. */
async function sendWeeklyRecaps() {
  const since = new Date(Date.now() - 7 * 86400000);
  const activeSince = daysAgoStr(14);
  const users = await prisma.user.findMany({
    where: { lastActiveOn: { gte: activeSince } },
    select: { id: true, firstName: true, currentStreak: true, preferredLang: true },
  });

  for (const u of users) {
    const [workouts, weekLifts, xp] = await Promise.all([
      prisma.lessonCompletion.count({ where: { userId: u.id, completedAt: { gte: since } } }).catch(() => 0),
      prisma.liftLog.findMany({ where: { userId: u.id, createdAt: { gte: since } }, select: { exercise: true, weightKg: true } }),
      prisma.xpEvent.aggregate({ where: { userId: u.id, createdAt: { gte: since } }, _sum: { amount: true } }),
    ]);
    // PRs this week: lifts that beat everything logged before this week.
    let prs = 0;
    if (weekLifts.length) {
      const exercises = [...new Set(weekLifts.map((l) => l.exercise))];
      for (const ex of exercises) {
        const before = await prisma.liftLog.findFirst({
          where: { userId: u.id, exercise: ex, createdAt: { lt: since } },
          orderBy: { weightKg: 'desc' },
        });
        const weekBest = Math.max(...weekLifts.filter((l) => l.exercise === ex).map((l) => l.weightKg));
        if (!before || weekBest > before.weightKg) prs++;
      }
    }
    const weeklyXp = xp._sum.amount ?? 0;
    if (workouts === 0 && prs === 0 && weeklyXp === 0) continue; // nothing to celebrate — skip

    const ar = u.preferredLang === 'ar';
    const title = ar ? 'أسبوعك في PULSE 📊' : 'Your week on PULSE 📊';
    const body = ar
      ? `${u.firstName}: ${workouts} تمرينة · ${prs} رقم قياسي · سلسلة ${u.currentStreak} يوم 🔥 · ${weeklyXp} XP — تقدر تكسرها الأسبوع الجاي؟`
      : `${u.firstName}: ${workouts} workouts · ${prs} PRs · ${u.currentStreak}-day streak 🔥 · ${weeklyXp} XP — beat it next week?`;
    notifyUser(u.id, { title, body, url: '/progress', type: 'reminder' });
  }
}

/**
 * The next unfinished lesson of whatever program the user is on, phrased as a
 * reminder. Returns null when they aren't on a path, so the generic pool still
 * covers everyone else.
 */
async function pathNudge(
  userId: string,
  ar: boolean,
): Promise<{ title: string; titleAr?: string; body: string; bodyAr?: string; url: string } | null> {
  const active = await prisma.programEnrollment
    .findFirst({
      where: { userId, status: 'active' },
      orderBy: { startedAt: 'desc' },
      include: { program: { select: { id: true, title: true, titleAr: true } } },
    })
    .catch(() => null);
  if (!active) return null;

  const lessons = await prisma.lesson.findMany({
    where: { programId: active.programId },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, titleAr: true },
  });
  if (lessons.length === 0) return null;

  const done = await prisma.lessonCompletion.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const doneSet = new Set(done.map((d) => d.lessonId));
  const idx = lessons.findIndex((l) => !doneSet.has(l.id));
  if (idx === -1) return null; // finished — the completion flow handles that

  const lesson = lessons[idx];
  const dayNo = idx + 1;
  const name = (ar && lesson.titleAr) || lesson.title;
  const prog = (ar && active.program.titleAr) || active.program.title;

  return {
    title: ar ? `اليوم ${dayNo}: ${name}` : `Day ${dayNo}: ${name}`,
    titleAr: `اليوم ${dayNo}: ${(lesson.titleAr || lesson.title)}`,
    body: ar ? `${prog} — تمرينة النهاردة مستنياك.` : `${prog} — today's session is waiting.`,
    bodyAr: `${(active.program.titleAr || active.program.title)} — تمرينة النهاردة مستنياك.`,
    url: `/lesson/${lesson.id}`,
  };
}
