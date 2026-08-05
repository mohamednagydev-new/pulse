/**
 * Pre-launch demo-data cleanup. Idempotent — every step is a deleteMany / guarded
 * update, so re-running (locally or on prod) is safe and simply reports zeros.
 *
 * What it does:
 *   1. Deletes the seeded demo users by EXACT email list (never by pattern), plus
 *      test@fitit.app. admin@fitit.app and every email not in the list are untouched.
 *      FK cascades remove their posts, follows, logs, participations, etc.; tables
 *      that reference users without a real FK (notifications, RSVPs, coach-community
 *      rows, DM threads, …) are swept explicitly so no orphans remain.
 *   2. Rebrands the two kept accounts into official PULSE accounts:
 *        alex@pulse.app -> team@pulse.geddo.online  ("PULSE Team")
 *        omar@pulse.app -> coach@pulse.geddo.online ("Coach PULSE", verified coach)
 *      Their seeded fake posts / XP events / sessions are wiped, their fake stats
 *      reset, and each gets a fresh random password (printed ONCE — store it).
 *   3. Deletes every Partner whose name ends in " (Demo)" — products, deals, lead
 *      forms and leads go with them via cascade.
 *   4. Deletes the seed-board demo events by exact title list (+ their RSVPs).
 *   5. Deletes the home_sponsor banner only. The 4 onboarding banners stay.
 *
 * Deliberately NOT touched: Coach content rows (Cole Chance & co.), challenges,
 * badges, programs, recipes, onboarding banners, and any user not listed below.
 *
 * Run: node node_modules/tsx/dist/cli.mjs prisma/clean-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

/** Demo accounts to DELETE — exact emails only, nothing else is ever matched.
 *  Sources: prisma/seed-users.ts (@pulse.app), prisma/seed.ts (test@fitit.app),
 *  apps/api/src/scripts/seed-coaches.ts (@demo.pulse). */
const DELETE_EMAILS = [
  // seed-users.ts — the three not kept
  'maya@pulse.app',
  'sara@pulse.app',
  'liam@pulse.app',
  // seed.ts test account
  'test@fitit.app',
  // seed-coaches.ts demo marketplace coaches + demo clients
  'layla@demo.pulse',
  'marcus@demo.pulse',
  'nadia@demo.pulse',
  'diego@demo.pulse',
  'sara@demo.pulse',
  'client.omar@demo.pulse',
  'client.mona@demo.pulse',
  'client.youssef@demo.pulse',
];

/** The two kept accounts, rebranded as official PULSE accounts. */
const REBRANDS = [
  {
    oldEmail: 'alex@pulse.app',
    newEmail: 'team@pulse.geddo.online',
    firstName: 'PULSE',
    lastName: 'Team',
    isCoach: false,
    bio: 'The official PULSE account. Tips, challenges and app news. الحساب الرسمي لتطبيق PULSE — نصايح وتحديات وأخبار التطبيق.',
    coach: null as null | { headline: string },
  },
  {
    oldEmail: 'omar@pulse.app',
    newEmail: 'coach@pulse.geddo.online',
    firstName: 'Coach',
    lastName: 'PULSE',
    isCoach: true,
    bio: 'Official PULSE coaching account — form checks, programs and training Q&A. حساب التدريب الرسمي لـ PULSE — تصحيح الأداء والبرامج وأسئلة التمرين.',
    coach: { headline: 'Official PULSE coaching account' },
  },
];

/** Titles seeded by prisma/seed-board.ts — deleted by exact title. */
const DEMO_EVENT_TITLES = [
  'Sunrise Bootcamp — Al Azhar Park',
  'Women-only strength class',
  'PULSE 5K Community Run',
  'Meal prep workshop: a week in two hours',
  'Alexandria beach workout day',
  'Sunset yoga on the roof',
];

/** Rows that reference users WITHOUT a real FK (plain id columns) — swept
 *  explicitly so deleting the users leaves no orphans behind. */
async function sweepUserRows(ids: string[]) {
  if (!ids.length) return {};
  const inIds = { in: ids };
  return {
    notifications: (await prisma.notification.deleteMany({ where: { userId: inIds } })).count,
    connections: (await prisma.connection.deleteMany({ where: { OR: [{ requesterId: inIds }, { addresseeId: inIds }] } })).count,
    eventRsvps: (await prisma.eventRsvp.deleteMany({ where: { userId: inIds } })).count,
    reelFavorites: (await prisma.reelFavorite.deleteMany({ where: { userId: inIds } })).count,
    reelWatches: (await prisma.reelWatch.deleteMany({ where: { userId: inIds } })).count,
    spinClaims: (await prisma.spinClaim.deleteMany({ where: { userId: inIds } })).count,
    questClaims: (await prisma.questClaim.deleteMany({ where: { userId: inIds } })).count,
    waterLogs: (await prisma.waterLog.deleteMany({ where: { userId: inIds } })).count,
    bodyLogs: (await prisma.bodyLog.deleteMany({ where: { userId: inIds } })).count,
    liftLogs: (await prisma.liftLog.deleteMany({ where: { userId: inIds } })).count,
    postReactions: (await prisma.postReaction.deleteMany({ where: { userId: inIds } })).count,
    passwordResets: (await prisma.passwordResetToken.deleteMany({ where: { userId: inIds } })).count,
    groupParticipants: (await prisma.groupParticipant.deleteMany({ where: { userId: inIds } })).count,
    groupSessions: (await prisma.groupSession.deleteMany({ where: { coachUserId: inIds } })).count,
    coachRatings: (await prisma.coachRating.deleteMany({ where: { OR: [{ coachUserId: inIds }, { clientId: inIds }] } })).count,
    coachRequests: (await prisma.coachRequest.deleteMany({ where: { OR: [{ coachUserId: inIds }, { clientId: inIds }] } })).count,
    coachWorkouts: (await prisma.coachWorkout.deleteMany({ where: { coachUserId: inIds } })).count,
    coachPrograms: (await prisma.coachProgram.deleteMany({ where: { coachUserId: inIds } })).count,
    dmThreads: (await prisma.dMThread.deleteMany({ where: { OR: [{ userAId: inIds }, { userBId: inIds }] } })).count,
    dmMessages: (await prisma.dMMessage.deleteMany({ where: { senderId: inIds } })).count,
  } as Record<string, number>;
}

async function deleteDemoUsers() {
  const users = await prisma.user.findMany({
    where: { email: { in: DELETE_EMAILS } },
    select: { id: true, email: true },
  });
  const ids = users.map((u) => u.id);

  const swept = await sweepUserRows(ids);
  const deleted = ids.length ? (await prisma.user.deleteMany({ where: { id: { in: ids } } })).count : 0;

  console.log(`Demo users deleted: ${deleted}${deleted ? ` (${users.map((u) => u.email).join(', ')})` : ''}`);
  const sweptTotal = Object.values(swept).reduce((a, b) => a + b, 0);
  if (sweptTotal) {
    const parts = Object.entries(swept).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`);
    console.log(`  non-FK rows swept: ${parts.join(', ')}`);
  }
  return deleted;
}

async function rebrandKeptAccounts() {
  let rebranded = 0;
  for (const r of REBRANDS) {
    const old = await prisma.user.findUnique({ where: { email: r.oldEmail } });
    const already = await prisma.user.findUnique({ where: { email: r.newEmail } });

    if (!old && !already) {
      console.log(`Rebrand: neither ${r.oldEmail} nor ${r.newEmail} exists — skipped.`);
      continue;
    }
    if (old && already) {
      console.log(`Rebrand WARNING: both ${r.oldEmail} and ${r.newEmail} exist — left untouched, resolve manually.`);
      continue;
    }

    const target = old ?? already!;
    const firstTimeRebrand = Boolean(old);

    // Seeded fake content goes too — but ONLY on the first-time rebrand
    // (old -> new). Once the account is already in place, its posts, XP,
    // sessions and stats are REAL and must survive a re-run.
    let posts = 0;
    let xp = 0;
    if (firstTimeRebrand) {
      posts = (await prisma.feedPost.deleteMany({ where: { userId: target.id } })).count;
      xp = (await prisma.xpEvent.deleteMany({ where: { userId: target.id } })).count;
      await prisma.refreshToken.deleteMany({ where: { userId: target.id } }); // kill old sessions
    }

    const data: Record<string, unknown> = {
      email: r.newEmail,
      firstName: r.firstName,
      lastName: r.lastName,
      bio: r.bio,
      isCoach: r.isCoach,
      onboarded: true,
    };
    if (firstTimeRebrand) {
      // fake seeded stats -> honest zeros (first rebrand only)
      data.xp = 0;
      data.level = 1;
      data.currentStreak = 0;
      data.longestStreak = 0;
    }
    if (r.coach) {
      data.coachHeadline = r.coach.headline;
      data.coachBio = r.bio;
      data.coachVerified = true;
      data.coachFeatured = true;
    } else {
      data.coachHeadline = null;
      data.coachBio = null;
      data.coachVerified = false;
      data.coachFeatured = false;
    }

    // Only when the account still carries the old identity do we rotate the
    // password (the seeded one is public knowledge: test1234).
    if (old) {
      const pw = crypto.randomBytes(9).toString('base64url');
      data.passwordHash = await bcrypt.hash(pw, 10);
      console.log(`Rebranded ${r.oldEmail} -> ${r.newEmail} (${r.firstName} ${r.lastName}) — NEW PASSWORD (shown once): ${pw}`);
    } else {
      console.log(`Rebrand: ${r.newEmail} already in place — profile refreshed, password unchanged.`);
    }
    if (posts || xp) console.log(`  wiped ${posts} seeded posts, ${xp} seeded XP events`);

    await prisma.user.update({ where: { id: target.id }, data });
    rebranded++;
  }
  return rebranded;
}

async function deleteDemoPartners() {
  const partners = await prisma.partner.findMany({
    where: { name: { endsWith: ' (Demo)' } },
    select: { id: true, name: true },
  });
  const ids = partners.map((p) => p.id);
  if (!ids.length) {
    console.log('Demo partners deleted: 0');
    return { partners: 0, products: 0, deals: 0, forms: 0, leads: 0 };
  }

  // Counted before the cascade wipes them, so the summary is honest.
  const products = await prisma.partnerProduct.count({ where: { partnerId: { in: ids } } });
  const deals = await prisma.partnerDeal.count({ where: { partnerId: { in: ids } } });
  const forms = await prisma.partnerLeadForm.findMany({ where: { partnerId: { in: ids } }, select: { id: true } });
  const leads = forms.length ? await prisma.lead.count({ where: { formId: { in: forms.map((f) => f.id) } } }) : 0;

  const deleted = (await prisma.partner.deleteMany({ where: { id: { in: ids } } })).count;
  console.log(`Demo partners deleted: ${deleted} (${partners.map((p) => p.name).join(', ')})`);
  console.log(`  cascaded: ${products} products, ${deals} deals, ${forms.length} lead forms, ${leads} leads`);
  return { partners: deleted, products, deals, forms: forms.length, leads };
}

async function deleteDemoEvents() {
  const events = await prisma.fitEvent.findMany({
    where: { title: { in: DEMO_EVENT_TITLES } },
    select: { id: true, title: true },
  });
  const ids = events.map((e) => e.id);
  const rsvps = ids.length ? await prisma.eventRsvp.count({ where: { eventId: { in: ids } } }) : 0;
  const deleted = ids.length ? (await prisma.fitEvent.deleteMany({ where: { id: { in: ids } } })).count : 0;
  console.log(`Demo events deleted: ${deleted} (+${rsvps} RSVPs cascaded)`);
  return deleted;
}

async function deleteSponsorBanner() {
  // Only the known fake seeded banner — an admin-created home_sponsor banner
  // with any other title survives a re-run.
  const deleted = (await prisma.banner.deleteMany({
    where: { section: 'home_sponsor', title: 'Exclusive Fit It Offers' },
  })).count;
  console.log(`home_sponsor banners deleted: ${deleted} (onboarding + admin banners untouched)`);
  return deleted;
}

async function main() {
  console.log('PULSE pre-launch demo cleanup\n------------------------------');
  const users = await deleteDemoUsers();
  const rebrands = await rebrandKeptAccounts();
  const partners = await deleteDemoPartners();
  const events = await deleteDemoEvents();
  const banners = await deleteSponsorBanner();

  console.log('------------------------------');
  console.log(
    `Summary: ${users} demo users deleted, ${rebrands} accounts rebranded, ` +
    `${partners.partners} demo partners (+${partners.products} products, +${partners.deals} deals, ` +
    `+${partners.forms} lead forms, +${partners.leads} leads), ${events} demo events, ${banners} sponsor banner(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
