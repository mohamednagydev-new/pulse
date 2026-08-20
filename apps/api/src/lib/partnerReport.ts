import { prisma } from './prisma';

/**
 * The monthly partner one-pager (rate card §7), computed instead of hand-made.
 * Same builder serves the partner portal (manager sees their own) and the admin
 * endpoint (we send it on WhatsApp on the first of the month).
 *
 * Honesty note baked into the shape: views/contacts are ALL-TIME counters (we
 * don't keep a per-day series for them); everything dated — leads, new members,
 * member workouts — is exact for the requested month.
 */

export type PartnerReport = {
  partnerId: string;
  name: string;
  type: string;
  month: string; // YYYY-MM
  allTime: { views: number; contacts: number };
  monthStats: { leads: number; newMembers: number; memberWorkouts: number };
  members: { total: number; active30: number };
  topPerformers: { firstName: string; workouts: number }[];
  summaryText: string;
};

function monthRange(month?: string): { key: string; start: Date; end: Date } {
  const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '') ? (month as string) : new Date().toISOString().slice(0, 7);
  const [y, mo] = m.split('-').map(Number);
  return { key: m, start: new Date(y, mo - 1, 1), end: new Date(y, mo, 1) };
}

export async function buildPartnerReport(partnerId: string, month?: string): Promise<PartnerReport | null> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, type: true, views: true, contacts: true },
  });
  if (!partner) return null;
  const { key, start, end } = monthRange(month);
  const inMonth = { gte: start, lt: end };

  const isGym = partner.type === 'gym';
  const [leads, newMembers, membersTotal, active30, memberWorkouts] = await Promise.all([
    prisma.lead.count({ where: { createdAt: inMonth, form: { partnerId } } }),
    isGym ? prisma.user.count({ where: { gymId: partnerId, gymJoinedAt: inMonth } }) : 0,
    isGym ? prisma.user.count({ where: { gymId: partnerId } }) : 0,
    isGym ? prisma.user.count({ where: { gymId: partnerId, lastSeenAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }) : 0,
    isGym ? prisma.lessonCompletion.count({ where: { completedAt: inMonth, user: { gymId: partnerId } } }) : 0,
  ]);

  let topPerformers: { firstName: string; workouts: number }[] = [];
  if (isGym && memberWorkouts > 0) {
    const grouped = await prisma.lessonCompletion.groupBy({
      by: ['userId'],
      where: { completedAt: inMonth, user: { gymId: partnerId } },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 3,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, firstName: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.firstName]));
    topPerformers = grouped.map((g) => ({ firstName: nameMap.get(g.userId) ?? '—', workouts: g._count }));
  }

  const lines = [
    `📊 تقرير ${partner.name} — شهر ${key}`,
    `👀 مشاهدات الصفحة (إجمالي): ${partner.views} · تواصل: ${partner.contacts}`,
    `📩 عملاء محتملين الشهر ده: ${leads}`,
  ];
  if (isGym) {
    lines.push(
      `🆕 أعضاء جدد بكود الجيم: ${newMembers} (الإجمالي: ${membersTotal}، نشط آخر ٣٠ يوم: ${active30})`,
      `💪 تمرينات أعضاءك الشهر ده: ${memberWorkouts}`,
    );
    if (topPerformers.length) {
      lines.push(`🏆 الأبطال: ${topPerformers.map((t) => `${t.firstName} (${t.workouts})`).join(' · ')}`);
    }
  }
  lines.push('— PULSE');

  return {
    partnerId: partner.id,
    name: partner.name,
    type: partner.type,
    month: key,
    allTime: { views: partner.views, contacts: partner.contacts },
    monthStats: { leads, newMembers, memberWorkouts },
    members: { total: membersTotal, active30 },
    topPerformers,
    summaryText: lines.join('\n'),
  };
}
