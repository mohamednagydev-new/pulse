import crypto from 'crypto';
import { prisma } from './prisma';
import { env } from '../env';
import { sendMail } from './mailer';
import { daysAgoStr } from './time';

/**
 * The ONE marketing email PULSE sends: a weekly win-back digest, Fridays, to
 * users inactive 7+ days who haven't opted out. Everything else stays push /
 * in-app — flooding inboxes with nudges would burn the domain's reputation
 * and take password-reset deliverability down with it.
 *
 * Capped per run to respect Gmail's daily send limits; one-click unsubscribe
 * link is HMAC-signed so it needs no login.
 */

const PER_RUN_CAP = 150;

export function unsubToken(userId: string): string {
  return crypto.createHmac('sha256', env.MEDIA_SIGN_SECRET).update(`unsub:${userId}`).digest('hex').slice(0, 32);
}

export async function sendWeeklyDigest() {
  const cutoff = daysAgoStr(7);
  const users = await prisma.user.findMany({
    where: {
      emailOptOut: false,
      email: { not: { endsWith: '@test.local' } },
      OR: [{ lastActiveOn: { lt: cutoff } }, { lastActiveOn: null }],
    },
    orderBy: { lastSeenAt: 'desc' }, // most-recently-lapsed first — likeliest to return
    take: PER_RUN_CAP,
    select: { id: true, email: true, firstName: true, preferredLang: true, currentStreak: true },
  });
  if (!users.length) return;

  // The hook content: what's live right now.
  const today = daysAgoStr(0);
  const weekly = await prisma.challenge.findFirst({
    where: { seasonKey: { startsWith: 'week:' }, startsOn: { lte: today }, endsOn: { gte: today } },
    select: { title: true, titleAr: true },
  });

  let sent = 0;
  for (const u of users) {
    const ar = u.preferredLang !== 'en';
    const unsub = `${env.WEB_ORIGIN}/api/unsubscribe?u=${u.id}&t=${unsubToken(u.id)}`;
    const challengeLine = weekly
      ? ar
        ? `تحدي الأسبوع شغال دلوقتي: «${weekly.titleAr ?? weekly.title}» — لسه تقدر تلحق 🏆`
        : `This week's challenge is live: "${weekly.title}" — you can still make the podium 🏆`
      : ar
        ? 'في تحدي جديد كل سبت — ادخل شوف تحدي الأسبوع 🏆'
        : 'A new challenge starts every Saturday 🏆';
    const subject = ar ? `${u.firstName}، وحشتنا في PULSE 💪` : `${u.firstName}, PULSE misses you 💪`;
    const bodyLines = ar
      ? [
          `أهلاً ${u.firstName} 👋`,
          '',
          'بقالك أسبوع مدخلتش تتمرن — مفيش مشكلة، المهم الرجعة.',
          challengeLine,
          'تمرين واحد ١٥ دقيقة النهارده يرجّع كل حاجة.',
          '',
          'افتح التطبيق: https://pulse.geddo.online',
        ]
      : [
          `Hey ${u.firstName} 👋`,
          '',
          "It's been a week — no guilt, comebacks are the whole point.",
          challengeLine,
          'One 15-minute workout today restarts everything.',
          '',
          'Open the app: https://pulse.geddo.online',
        ];
    const text = bodyLines.join('\n');
    const html =
      `<div dir="${ar ? 'rtl' : 'ltr'}" style="font-family:sans-serif;line-height:1.7">` +
      bodyLines.map((l) => (l ? `<p style="margin:4px 0">${l.replace('https://pulse.geddo.online', '<a href="https://pulse.geddo.online" style="color:#f97316;font-weight:bold">pulse.geddo.online</a>')}</p>` : '')).join('') +
      `<p style="margin-top:20px;font-size:11px;color:#999"><a href="${unsub}" style="color:#999">${ar ? 'إلغاء الاشتراك في رسائل التذكير' : 'Unsubscribe from these emails'}</a></p></div>`;
    await sendMail({ to: u.email, subject, html, text }).catch(() => {});
    sent++;
  }
  console.log(`[digest] weekly win-back sent to ${sent} lapsed user(s)`);
}
