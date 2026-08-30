import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './prisma';
import { sendMail } from './mailer';
import { notifyUser } from '../routes/push';
import { classifyReply, draftFollowUp, briefLead } from './growth';

/**
 * The inbox half of the growth agent: polls the GROWTH_IMAP_* mailbox for
 * unseen replies, matches senders to GrowthLeads, classifies each reply,
 * moves the stage, drafts the response — and on autopilot leads, sends it.
 *
 * Every outreach email sets Reply-To to this mailbox, so the whole back-and-
 * forth flows through here without touching the owner's personal email.
 *
 * Not configured (no GROWTH_IMAP_HOST) → clean no-op.
 */

let polling = false; // one poll at a time — IMAP sessions don't overlap well

export function inboxConfigured(): boolean {
  return Boolean(process.env.GROWTH_IMAP_HOST && process.env.GROWTH_IMAP_USER && process.env.GROWTH_IMAP_PASS);
}

async function notifyAdmins(title: string, body: string) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, { title, titleAr: title, body, bodyAr: body, url: '/admin/growth', type: 'general' }).catch(() => {});
  }
}

/** Strip quoted history/signatures so the classifier sees the actual message. */
function cleanBody(text: string): string {
  const lines = text.split('\n');
  const cut = lines.findIndex((l) => /^On .+wrote:$|^-{2,}\s*$|^>|^From: /.test(l.trim()));
  const kept = cut > 0 ? lines.slice(0, cut) : lines;
  return kept.join('\n').trim().slice(0, 4000);
}

export async function pollGrowthInbox(): Promise<string> {
  if (!inboxConfigured()) return 'skipped — GROWTH_IMAP_* not configured';
  if (polling) return 'skipped — already polling';
  polling = true;
  try {
    const client = new ImapFlow({
      host: process.env.GROWTH_IMAP_HOST!,
      port: Number(process.env.GROWTH_IMAP_PORT ?? 993),
      secure: true,
      auth: { user: process.env.GROWTH_IMAP_USER!, pass: process.env.GROWTH_IMAP_PASS! },
      logger: false,
      // Without these a bad network hangs connect() indefinitely: the polling
      // flag stays up and every later run reports vague connection failures.
      greetingTimeout: 15_000,
      socketTimeout: 60_000,
    });
    await client.connect();
    let processed = 0;
    let matched = 0;
    let autoSent = 0;
    let newLeads = 0;
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch({ seen: false }, { source: true, uid: true })) {
          processed++;
          const parsed = await simpleParser(msg.source as Buffer);
          const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
          const fromName = parsed.from?.value?.[0]?.name || fromEmail || 'Unknown';
          const html = typeof parsed.html === 'string' ? parsed.html : '';
          const body = cleanBody(parsed.text || html.replace(/<[^>]+>/g, ' ') || '');
          await client.messageFlagsAdd({ uid: String(msg.uid) }, ['\\Seen'], { uid: true });
          if (!fromEmail || !body) continue;
          // Ignore our own bounces/self-mail and machine senders — Google welcome
          // mails and mailer-daemons must never become "leads".
          if (fromEmail === process.env.GROWTH_IMAP_USER?.toLowerCase()) continue;
          if (/no-?reply|mailer-daemon|postmaster|@google\.com$|@accounts\.google|@mail\.instagram|@facebookmail/i.test(fromEmail)) continue;

          let lead = await prisma.growthLead.findFirst({ where: { email: { equals: fromEmail } } });
          if (!lead) {
            // Unknown sender writing to the growth inbox = inbound interest.
            lead = await prisma.growthLead.create({
              data: { name: fromName, email: fromEmail, type: 'other', source: 'inbound', stage: 'replied', needsAction: true },
            });
            newLeads++;
          }
          matched++;

          const cls = await classifyReply(body).catch(() => ({ intent: 'question' as const, summary: body.slice(0, 100) }));
          await prisma.growthTouch.create({
            data: { leadId: lead.id, direction: 'in', channel: 'email', subject: `[${cls.intent}] ${parsed.subject ?? ''}`.slice(0, 200), body, status: 'received' },
          });

          // Stage movement mirrors the manual log-reply endpoint.
          const nextStage = cls.intent === 'interested' ? 'qualified' : cls.intent === 'negative' ? 'lost' : lead.stage === 'new' || lead.stage === 'contacted' ? 'replied' : lead.stage;
          const done = cls.intent === 'negative';

          // Draft the answer; on autopilot (and not a dead lead) send it too.
          let responded = false;
          if (!done) {
            try {
              const touches = await prisma.growthTouch.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: 'asc' } });
              const draft = await draftFollowUp({ ...lead, stage: nextStage }, touches);
              const touch = await prisma.growthTouch.create({
                data: { leadId: lead.id, direction: 'out', channel: 'email', subject: draft.subject, body: draft.body, aiDrafted: true, status: 'draft' },
              });
              if (lead.autoSend) {
                const r = await sendMail({ to: fromEmail, subject: draft.subject, replyTo: process.env.GROWTH_IMAP_USER, html: `<div dir="rtl" style="font-family:Tahoma,Arial;white-space:pre-line">${draft.body}</div>`, text: draft.body });
                if (r.ok) {
                  await prisma.growthTouch.update({ where: { id: touch.id }, data: { status: 'sent' } });
                  responded = true;
                  autoSent++;
                }
              }
            } catch { /* drafting failed — the reply itself is still logged + flagged */ }
          }

          await prisma.growthLead.update({
            where: { id: lead.id },
            data: {
              stage: nextStage,
              needsAction: !responded || cls.intent === 'interested',
              nextTouchAt: done ? null : new Date(Date.now() + 3 * 86_400_000),
              aiBrief: await briefLead(lead, await prisma.growthTouch.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: 'asc' }, take: 12 })).catch(() => lead.aiBrief),
            },
          });

          if (cls.intent === 'interested') {
            await notifyAdmins('🔥 Interested lead replied', `${lead.name}: ${cls.summary}`);
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
    if (matched > 0 && autoSent < matched) {
      await notifyAdmins('📥 Growth inbox', `${matched} repl${matched === 1 ? 'y' : 'ies'} processed — drafts waiting for review`);
    }
    return `processed:${processed} matched:${matched} newLeads:${newLeads} autoSent:${autoSent}`;
  } finally {
    polling = false;
  }
}
