import { prisma } from './prisma';
import { dayString, weekStart, startOfDayTz, endOfDayTz } from './time';
import { awardXp } from './social';
import { notifyUser } from '../routes/push';

const WIN_XP = 100;

/** day + n days, staying in YYYY-MM-DD. */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function memberIdsOf(squadId: string): Promise<string[]> {
  const rows = await prisma.squadMember.findMany({ where: { squadId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

/**
 * Saturday job — the squad-battle week turns over:
 *  1) Close every active battle whose window has ended: count each side's
 *     workouts (LessonCompletions) over [startsOn, endsOn], set winnerId
 *     (null on a draw), mark it done, pay every member of the winning squad
 *     +100 XP ('squad-battle-win') and notify both squads with the score.
 *  2) Pair all squads with ≥2 members that are not already mid-battle,
 *     randomly, for the new Saturday→Friday week. An odd squad sits out.
 */
export async function pairSquadBattles(): Promise<string> {
  const today = dayString();

  // ---- 1) settle finished battles ----
  const ended = await prisma.squadBattle.findMany({ where: { status: 'active', endsOn: { lt: today } } });
  let closed = 0;
  for (const b of ended) {
    const from = startOfDayTz(b.startsOn);
    const to = endOfDayTz(b.endsOn);
    const [aSquad, bSquad, aMembers, bMembers] = await Promise.all([
      prisma.squad.findUnique({ where: { id: b.aId }, select: { name: true } }),
      prisma.squad.findUnique({ where: { id: b.bId }, select: { name: true } }),
      memberIdsOf(b.aId),
      memberIdsOf(b.bId),
    ]);
    const [aCount, bCount] = await Promise.all([
      aMembers.length
        ? prisma.lessonCompletion.count({ where: { userId: { in: aMembers }, completedAt: { gte: from, lte: to } } })
        : Promise.resolve(0),
      bMembers.length
        ? prisma.lessonCompletion.count({ where: { userId: { in: bMembers }, completedAt: { gte: from, lte: to } } })
        : Promise.resolve(0),
    ]);
    const winnerId = aCount > bCount ? b.aId : bCount > aCount ? b.bId : null;
    await prisma.squadBattle.update({ where: { id: b.id }, data: { status: 'done', winnerId } });
    closed += 1;

    const aName = aSquad?.name ?? 'Squad A';
    const bName = bSquad?.name ?? 'Squad B';
    const score = `${aName} ${aCount} — ${bCount} ${bName}`;

    if (winnerId) {
      const winners = winnerId === b.aId ? aMembers : bMembers;
      const losers = winnerId === b.aId ? bMembers : aMembers;
      const winName = winnerId === b.aId ? aName : bName;
      for (const uid of winners) {
        await awardXp(uid, WIN_XP, 'squad-battle-win');
        notifyUser(uid, {
          title: 'Your squad WON the battle! 🏆',
          titleAr: 'السكواد بتاعك كسب المعركة! 🏆',
          body: `${score} — +${WIN_XP} XP for every member of ${winName}. New battle starts today!`,
          bodyAr: `${score} — كل واحد في ${winName} خد +${WIN_XP} XP. معركة جديدة بتبدأ النهارده!`,
          url: '/squads',
          type: 'milestone',
        }).catch(() => {});
      }
      for (const uid of losers) {
        notifyUser(uid, {
          title: 'Squad battle lost 😤',
          titleAr: 'خسرتوا معركة السكواد 😤',
          body: `${score}. A fresh battle starts today — take the revenge!`,
          bodyAr: `${score}. معركة جديدة بتبدأ النهارده — خدوا بتاركم!`,
          url: '/squads',
          type: 'general',
        }).catch(() => {});
      }
    } else {
      for (const uid of [...aMembers, ...bMembers]) {
        notifyUser(uid, {
          title: "Squad battle: it's a draw 🤝",
          titleAr: 'معركة السكواد: تعادل 🤝',
          body: `${score}. Nobody blinked — settle it this week!`,
          bodyAr: `${score}. محدش غلب — احسموها الأسبوع ده!`,
          url: '/squads',
          type: 'general',
        }).catch(() => {});
      }
    }
  }

  // ---- 2) pair the new week ----
  const stillActive = await prisma.squadBattle.findMany({
    where: { status: 'active' },
    select: { aId: true, bId: true },
  });
  const busy = new Set(stillActive.flatMap((x) => [x.aId, x.bId]));

  const squads = await prisma.squad.findMany({
    include: { members: { select: { userId: true } } },
  });
  const pool = shuffle(squads.filter((s) => s.members.length >= 2 && !busy.has(s.id)));

  const startsOn = weekStart(); // this week's Saturday
  const endsOn = addDays(startsOn, 6); // Friday
  let paired = 0;
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const a = pool[i];
    const b = pool[i + 1];
    await prisma.squadBattle.create({ data: { aId: a.id, bId: b.id, startsOn, endsOn } });
    paired += 1;
    for (const m of a.members) {
      notifyUser(m.userId, {
        title: 'New squad battle! ⚔️',
        titleAr: 'معركة سكواد جديدة! ⚔️',
        body: `This week: ${a.name} vs ${b.name}. Every workout counts — go!`,
        bodyAr: `الأسبوع ده: ${a.name} ضد ${b.name}. كل تمرينة بتتحسب — يلا!`,
        url: '/squads',
        type: 'general',
      }).catch(() => {});
    }
    for (const m of b.members) {
      notifyUser(m.userId, {
        title: 'New squad battle! ⚔️',
        titleAr: 'معركة سكواد جديدة! ⚔️',
        body: `This week: ${b.name} vs ${a.name}. Every workout counts — go!`,
        bodyAr: `الأسبوع ده: ${b.name} ضد ${a.name}. كل تمرينة بتتحسب — يلا!`,
        url: '/squads',
        type: 'general',
      }).catch(() => {});
    }
  }

  return `closed ${closed}, paired ${paired} battles`;
}
