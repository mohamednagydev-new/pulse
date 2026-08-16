import { prisma } from './prisma';
import { env } from '../env';
import { notifyUser, pushEnabled } from '../routes/push';
import { ensureCurrentSeason } from './seasons';
import { ensureWeeklyChallenge, postDailyChallengePrompts } from './weekly';
import { settleStaleRooms, promotionCliffhangers } from './leagues';
import { nextCheckDate } from './coach';
import { dayString, daysAgoStr, localHour, localDow, startOfDayTz } from './time';

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

  // Weekly challenge rotation (Saturdays, self-healing any day) + last week's podium.
  await ensureWeeklyChallenge().catch((e) => console.warn('[weekly]', e?.message));

  // Daily 10:00 — a coach conversation-starter in every open official challenge
  // room, so the shared spaces never read as abandoned.
  if (hour === 10 && (await claimJob(`chalprompt:${day}`))) {
    await postDailyChallengePrompts().catch((e) => console.warn('[weekly-prompt]', e?.message));
  }

  // Live-session reminders: joining a Thursday-7pm session used to produce
  // total silence until (and including) Thursday 7pm. One ping in the hour
  // before the start, per participant, claimed per session.
  try {
    const soon = await prisma.groupSession.findMany({
      where: { scheduledAt: { gte: now, lte: new Date(now.getTime() + 60 * 60 * 1000) } },
      select: { id: true, title: true, scheduledAt: true },
    });
    for (const s of soon) {
      if (!(await claimJob(`groupremind:${s.id}`))) continue;
      const parts = await prisma.groupParticipant.findMany({ where: { sessionId: s.id }, select: { userId: true } });
      const mins = Math.max(1, Math.round((s.scheduledAt.getTime() - now.getTime()) / 60000));
      for (const p of parts) {
        notifyUser(p.userId, {
          title: `Live session soon 🎥 (${mins}m)`,
          titleAr: `التمرين الجماعي قرّب 🎥 (بعد ${mins} دقيقة)`,
          body: `"${s.title}" starts soon — warm up!`,
          bodyAr: `"${s.title}" هيبدأ قريب — سخّن نفسك!`,
          url: `/group/${s.id}`,
          type: 'reminder',
        }).catch(() => {});
      }
    }
  } catch (e: any) {
    console.warn('[group-remind]', e?.message);
  }

  // Close out last week's league rooms so podium XP lands even for people who
  // haven't opened the app since.
  await settleStaleRooms().catch((e) => console.warn('[leagues]', e?.message));

  // Daily nudge — people who haven't trained today, at their preferred hour (default 19:00).
  // (When push isn't configured these still land in the in-app notifications center.)
  const nudgeSlot = await claimJob(`nudge:${day}:${hour}`);
  const candidates = nudgeSlot
    ? await prisma.user.findMany({
        where: { NOT: { lastActiveOn: day } }, // no pushSubs filter: in-app rows must reach EVERY user, not only push-subscribed ones
        select: { id: true, firstName: true, currentStreak: true, reminderHour: true, preferredLang: true },
      })
    : [];

  // Learned timing: users who never picked a reminder hour get nudged at the
  // hour they actually train (modal completion hour over 3 weeks, ≥3 sessions
  // of signal) instead of a one-size 19:00. Explicit settings always win.
  const learned = new Map<string, number>();
  const unset = candidates.filter((u) => u.reminderHour == null).map((u) => u.id);
  if (unset.length) {
    const rows = await prisma.lessonCompletion.findMany({
      where: { userId: { in: unset }, completedAt: { gte: new Date(Date.now() - 21 * 86_400_000) } },
      select: { userId: true, completedAt: true },
    });
    const tally = new Map<string, Map<number, number>>();
    for (const r of rows) {
      const h = localHour(r.completedAt);
      const m = tally.get(r.userId) ?? new Map<number, number>();
      m.set(h, (m.get(h) ?? 0) + 1);
      tally.set(r.userId, m);
    }
    for (const [uid, m] of tally) {
      let best = -1;
      let bestN = 0;
      let total = 0;
      for (const [h, n] of m) {
        total += n;
        if (n > bestN) { best = h; bestN = n; }
      }
      if (total >= 3 && best >= 0) learned.set(uid, best);
    }
  }

  for (const u of candidates) {
    if (hour !== (u.reminderHour ?? learned.get(u.id) ?? 19)) continue;
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

  // ---- Diet-journey nudges: the reminder engine was workout-only; a user on
  // an active cut/bulk now gets FOOD accountability too. Journey users opted
  // into this by starting a journey — no nagging for casual trackers. ----
  // 15:00 — nothing logged yet today → lunch nudge.
  if (hour === 15 && (await claimJob(`dietlog:${day}`))) {
    // Journey users AND active diet-program enrollees — both opted into food accountability.
    const enrolled = await prisma.dietEnrollment.findMany({ where: { finishedAt: null }, select: { userId: true } });
    const journeyers = await prisma.user.findMany({
      where: { OR: [{ dietStartedAt: { not: null } }, { id: { in: enrolled.map((e) => e.userId) } }] },
      select: { id: true, firstName: true },
    });
    for (const u of journeyers) {
      const logged = await prisma.calorieEntry.count({ where: { userId: u.id, date: day } });
      if (logged > 0) continue;
      notifyUser(u.id, {
        title: 'Log your food 🥗',
        titleAr: 'سجّل أكلك 🥗',
        body: `${u.firstName}, nothing logged today — 30 seconds keeps your diet honest.`,
        bodyAr: `${u.firstName}، لسه مسجلتش حاجة النهارده — نص دقيقة تخلي الدايت ماشي صح.`,
        url: '/tracker',
        type: 'reminder',
      }).catch(() => {});
    }
  }
  // Friday 09:00 — weekly weigh-in: the journey's progress needle only moves
  // when a weight lands.
  if (localDow(now) === 5 && hour === 9 && (await claimJob(`weighin:${day}`))) {
    const journeyers = await prisma.user.findMany({
      where: { dietStartedAt: { not: null } },
      select: { id: true, firstName: true },
    });
    for (const u of journeyers) {
      const recent = await prisma.weightLog.count({ where: { userId: u.id, date: { gte: daysAgoStr(2) } } });
      if (recent > 0) continue;
      notifyUser(u.id, {
        title: 'Weekly weigh-in ⚖️',
        titleAr: 'وزن الجمعة ⚖️',
        body: 'Same scale, same time — log it and watch the trend line move.',
        bodyAr: 'نفس الميزان ونفس المعاد — سجّله وشوف الخط بيتحرك.',
        url: '/progress',
        type: 'reminder',
      }).catch(() => {});
    }
  }

  // 10:00 daily — the PODIUM: prize challenges that ended yesterday get their
  // top-3 computed, winners notified with their prize, and a feed announcement
  // everyone sees. Per-challenge claim so each podium fires exactly once.
  if (hour === 10 && (await claimJob(`podiumscan:${day}`))) {
    const yesterday = daysAgoStr(1);
    const ended = await prisma.challenge.findMany({
      where: { kind: 'global', endsOn: yesterday, prizeText: { not: null } },
      include: { participants: { orderBy: { progress: 'desc' }, take: 3, where: { progress: { gt: 0 } } } },
    });
    for (const ch of ended) {
      if (!ch.participants.length) continue;
      if (!(await claimJob(`podium:${ch.id}`))) continue;
      const medals = ['🥇', '🥈', '🥉'];
      const medalsAr = ['الأول', 'التاني', 'التالت'];
      const podium = ch.prizeMode === 'raffle' ? [] : ch.participants;

      // Raffle: every COMPLETER is a ticket — finishing matters, not ranking.
      let raffleWinnerId: string | null = null;
      if (ch.prizeMode === 'raffle' || ch.prizeMode === 'both') {
        const completers = await prisma.challengeParticipant.findMany({
          where: { challengeId: ch.id, progress: { gte: ch.goalValue }, userId: { notIn: podium.map((p) => p.userId) } },
          select: { userId: true },
        });
        if (completers.length) raffleWinnerId = completers[Math.floor(Math.random() * completers.length)].userId;
        if (raffleWinnerId) await prisma.challenge.update({ where: { id: ch.id }, data: { raffleWinnerId } }).catch(() => {});
      }

      const winners = await prisma.user.findMany({
        where: { id: { in: [...podium.map((p) => p.userId), ...(raffleWinnerId ? [raffleWinnerId] : [])] } },
        select: { id: true, firstName: true },
      });
      const nameOf = new Map(winners.map((w) => [w.id, w.firstName]));
      podium.forEach((p, i) => {
        notifyUser(p.userId, {
          title: `You're on the podium! ${medals[i]}`,
          titleAr: `انت على المنصة! ${medals[i]}`,
          body: `${medals[i]} in "${ch.title}". Prizes: ${ch.prizeText}. We'll contact you to deliver yours.`,
          bodyAr: `جيت ${medalsAr[i]} في «${ch.titleAr ?? ch.title}». الجوايز: ${ch.prizeTextAr ?? ch.prizeText}. هنكلمك عشان جايزتك توصلك.`,
          url: `/challenge/${ch.id}`,
          type: 'milestone',
        }).catch(() => {});
      });
      if (raffleWinnerId) {
        notifyUser(raffleWinnerId, {
          title: 'You won the completion raffle! 🎁',
          titleAr: 'كسبت سحب المكمّلين! 🎁',
          body: `You finished "${ch.title}" and the draw picked YOU. Prizes: ${ch.prizeText}. We'll contact you.`,
          bodyAr: `خلّصت «${ch.titleAr ?? ch.title}» والسحب اختارك انت! الجوايز: ${ch.prizeTextAr ?? ch.prizeText}. هنكلمك.`,
          url: `/challenge/${ch.id}`,
          type: 'milestone',
        }).catch(() => {});
      }
      // Public announcement — the podium is also next challenge's marketing.
      const lines = [
        ...podium.map((p, i) => `${medals[i]} ${nameOf.get(p.userId) ?? '—'}`),
        ...(raffleWinnerId ? [`🎁 ${nameOf.get(raffleWinnerId) ?? '—'}`] : []),
      ].join('  ·  ');
      const { createFeedPost } = await import('./social');
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
      if (adminUser) {
        await createFeedPost(
          adminUser.id,
          'text',
          `🏆 Challenge "${ch.title}" results: ${lines} — prizes: ${ch.prizeText}. Congratulations!`,
          'challenge',
          ch.id,
          { textAr: `🏆 نتيجة تحدي «${ch.titleAr ?? ch.title}»: ${lines} — الجوايز: ${ch.prizeTextAr ?? ch.prizeText}. ألف مبروك للأبطال! 🎉` },
        ).catch(() => {});
      }
      console.log(`[podium] announced ${ch.title}: ${lines}`);
    }
  }

  // 11:00 daily — install/notifications email for users with no push channel.
  // Per-user-per-month claims inside; the daily key just gates the scan.
  if (hour === 11 && (await claimJob(`instmailscan:${day}`))) {
    const { sendInstallNudge } = await import('./digest');
    await sendInstallNudge(claimJob).catch((e) => console.warn('[instmail]', e?.message));
  }

  // Friday 17:00 — the weekly win-back email digest for lapsed users (the ONE
  // marketing email; everything else stays push/in-app by design).
  if (localDow(now) === 5 && hour === 17 && (await claimJob(`digest:${day}`))) {
    const { sendWeeklyDigest } = await import('./digest');
    await sendWeeklyDigest().catch((e) => console.warn('[digest]', e?.message));
  }

  // Saturday 12:00 — auto-post last week's league promotions to the Facebook
  // Page (the fixed weekly appointment from LAUNCH-CAMPAIGNS.md, on autopilot).
  // Requires FB_PAGE_ID/FB_PAGE_TOKEN in .env; silently skipped otherwise.
  if (localDow(now) === 6 && hour === 12 && (await claimJob(`fbleague:${day}`))) {
    await postLeaguePromotions().catch((e) => console.warn('[fb-league]', e?.message));
  }

  // Daily 09:00 — top up the recurring Coach PULSE group sessions for the next
  // 7 days, so the Groups tab always shows real joinable live rooms. A social
  // area with nothing scheduled reads as a dead app on day one. Also fires on
  // any hour where NOTHING upcoming exists (first boot after deploy) — the
  // function is idempotent, so the extra path cannot double-book.
  if (hour === 9 && (await claimJob(`groupsessions:${day}`))) {
    await ensureGroupSessions().catch((e) => console.warn('[groups]', e?.message));
  } else if ((await prisma.groupSession.count({ where: { scheduledAt: { gte: now } } })) === 0) {
    await ensureGroupSessions().catch((e) => console.warn('[groups]', e?.message));
  }

  // Streak rescue — 20:00: trained yesterday, nothing today, streak worth
  // saving. Streaks die silently at midnight; this is the save-point ping.
  if (hour === 20 && (await claimJob(`streaksave:${day}`))) {
    const atRisk = await prisma.user.findMany({
      where: {
        lastActiveOn: daysAgoStr(1),
        currentStreak: { gte: 3 },

      },
      select: { id: true, firstName: true, currentStreak: true, preferredLang: true },
    });
    for (const u of atRisk) {
      const ar = u.preferredLang === 'ar';
      notifyUser(u.id, {
        title: ar ? `سلسلة الـ${u.currentStreak} يوم في خطر 🔥` : `Your ${u.currentStreak}-day streak is in danger 🔥`,
        body: ar
          ? `${u.firstName}، تمرين واحد قبل ما اليوم يخلص ينقذها — حتى ١٥ دقيقة كفاية.`
          : `${u.firstName}, one workout before midnight saves it — even 15 minutes.`,
        url: '/workout',
        type: 'reminder',
      });
    }
    if (atRisk.length) console.log(`[streak] rescued-pinged ${atRisk.length} user(s)`);
  }

  // Lapsed re-engagement — no activity for 3+ days (once, at 18:00).
  if (hour === 18 && (await claimJob(`lapsed:${day}`))) {
    const threeAgo = daysAgoStr(3);
    const lapsed = await prisma.user.findMany({
      // lastActiveOn: null catches users who signed up but never came back —
      // the createdAt guard keeps brand-new signups (< 3 days) out of the sweep.
      where: {
        OR: [{ lastActiveOn: { lt: threeAgo } }, { lastActiveOn: null }],
        createdAt: { lt: new Date(Date.now() - 3 * 86_400_000) },

      },
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
 * Recurring PULSE-team live rooms: three weekly slots (Cairo clock), hosted by
 * the official Coach PULSE account. Idempotent — creates only slots missing in
 * the next 7 days; admins can delete/edit any single occurrence freely.
 */
const GROUP_SLOTS = [
  {
    dow: 6, // Saturday
    hour: 19,
    title: 'Full-Body Kickoff · تمرين الجسم كله',
    muscleFocus: 'Full body',
    description:
      'Open live session with Coach PULSE — all levels welcome. جلسة لايف مفتوحة مع كوتش PULSE، كل المستويات — انضم وشد حيلك مع الناس.',
  },
  {
    dow: 2, // Tuesday
    hour: 20,
    title: 'HIIT Express · حرق سريع',
    muscleFocus: 'Cardio',
    description:
      '25 minutes, maximum burn, shared timer. ٢٥ دقيقة حرق على الآخر، بتايمر مشترك — نبدأ مع بعض ونخلص مع بعض.',
  },
  {
    dow: 4, // Thursday
    hour: 20,
    title: 'Yoga Wind-Down · يوجا آخر الأسبوع',
    muscleFocus: 'Mobility',
    description:
      'Slow stretch & breathing to close the week. تمدد هادي وتنفس نقفل بيه الأسبوع — جسمك يستاهل.',
  },
];

async function ensureGroupSessions() {
  const coach = await prisma.user.findUnique({
    where: { email: 'coach@pulse.geddo.online' },
    select: { id: true },
  });
  if (!coach) return; // pre-launch DB without the official account — nothing to do
  let created = 0;
  for (let n = 0; n < 7; n++) {
    const dayStr = daysAgoStr(-n);
    for (const slot of GROUP_SLOTS) {
      const scheduledAt = new Date(startOfDayTz(dayStr).getTime() + slot.hour * 3_600_000);
      if (scheduledAt.getTime() < Date.now()) continue; // today's slot already passed
      if (localDow(scheduledAt) !== slot.dow) continue;
      const exists = await prisma.groupSession.findFirst({
        where: { coachUserId: coach.id, scheduledAt },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.groupSession.create({
        data: {
          coachUserId: coach.id,
          title: slot.title,
          description: slot.description,
          muscleFocus: slot.muscleFocus,
          scheduledAt,
        },
      });
      created += 1;
    }
  }
  if (created) console.log(`[groups] scheduled ${created} PULSE session(s)`);
}

/**
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
    `ادخل دوريك 👇\n${env.WEB_ORIGIN}/leagues`;

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, link: `${env.WEB_ORIGIN}/leagues`, access_token: token }),
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
