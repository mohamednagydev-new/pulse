import { z } from 'zod';
import type { GrowthLead, GrowthTouch } from '@prisma/client';
import { prisma } from './prisma';
import { aiEnabled, chatComplete } from './openai';

/**
 * GROWTH TEAM — the AI SDR behind /api/admin-growth.
 *
 * Drafts personalized partner outreach (coaches / gyms / stores / sponsors),
 * follow-up bumps, reply classification, and lead briefs — all grounded in the
 * condensed pitch knowledge below (source: PARTNER-PLAN.md, PARTNERS-PITCH.md,
 * PARTNER-RATE-CARD.md at the repo root). Embedded as a constant so drafting
 * never depends on reading files at runtime.
 */

// ---------------------------------------------------------------------------
// Pitch knowledge — condensed for the model. Keep it honest: these are the
// facts an SDR may use; anything not here must not be invented.
// ---------------------------------------------------------------------------

const PITCH_CONTEXT = `
WHAT PULSE IS: أبلكيشن فيتنس مصري مجاني بالعربي والإنجليزي — pulse.geddo.online.
Workouts, streaks, weekly leagues, challenges with prizes, food tracking, community feed.
FREE MEANS FREE for users, always. Early partners also pay nothing (founding offer) and get featured placement; when paid tiers arrive, founding partners keep preferred terms locked in writing.
CORE PITCH RULE: sell the TOOL, not the traffic — "this makes the people you already have worth more, and everyone who joins through you is yours." Never lead with price; lead with the demo.

PER-TYPE VALUE (all features live and demoable today):
- COACH (مدرب): replaces WhatsApp+Excel — invite link/QR (/invite/code) lands clients PRE-CONNECTED to the coach; client dashboard (workouts, streaks, quiet-client alerts before churn); program builder public/clients-only; broadcast to clients; ratings + verified badge + coaches directory brings NEW clients. Free for coaches, permanently at the core tier.
- GYM (جيم): retention tool — gym invite code groups members under the gym; gym-only weekly leaderboard; live TV board at /tv/:id on the gym screen (the demo that closes meetings); owner analytics incl. at-risk members BY NAME before they cancel; listed in the /gyms directory. "We don't sell you members — we keep yours from quitting."
- STORE/BRAND (متجر): shop window inside a fitness community — catalog page, deals in /deals with WhatsApp button, featured placement, lead forms (name+phone delivered to their own portal). ZERO commission, always — the sale happens on their WhatsApp.
- SPONSOR (راعي): not an ad, a branded ritual — prize challenge with their name on the mechanic people sweat through for 30 days, podium + raffle + permanent Wall of Champions, winners-announcement post with their brand, events board with RSVP attribution. Their only real cost can be the prize itself.

FOUNDING OFFERS: first partners per category get free Verified/Featured placement (3-6 months) in exchange for actually distributing their code/link + a logo/quote. Renewal price locked in writing at signup. Coaches: "Founding Coach" badge + featured slot, free.
KEY OBJECTION ANSWERS: "will the app take my clients?" — no, your link makes every signup YOUR client, and programs can be clients-only. "prove it first" — free month/10 free leads, watch your own numbers in the portal. "commission?" — never.

LINKS: pitch page https://pulse.geddo.online/why-partner (always include) · app https://pulse.geddo.online · TV demo pulse.geddo.online/tv/<gymId> · WhatsApp 010 7079 9007 (wa.me/201070799007).
HONESTY RULES (non-negotiable): NEVER invent or imply user counts, traffic, or download numbers. NEVER name or disparage competitors. Never promise a feature not listed above. If asked for numbers, the human will answer — the email should offer a 10-minute demo instead.
SIGN-OFF: every email ends "Mohamed — PULSE".
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAi(): void {
  if (!aiEnabled()) {
    throw new Error('OPENAI_API_KEY is not configured — growth drafting needs it. Set it in the API .env.');
  }
}

function leadFacts(lead: GrowthLead): string {
  return [
    `Name: ${lead.name}`,
    lead.org ? `Organization: ${lead.org}` : null,
    `Partner type: ${lead.type}`,
    lead.source ? `How we found them: ${lead.source}` : null,
    `Pipeline stage: ${lead.stage}`,
    lead.notes ? `Internal notes: ${lead.notes.slice(0, 500)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function threadText(touches: GrowthTouch[]): string {
  // Last 6 touches, oldest first, so the model reads the thread in order.
  const recent = touches.slice(-6);
  if (recent.length === 0) return '(no previous touches)';
  return recent
    .map((t) => {
      const who = t.direction === 'out' ? 'US' : 'THEM';
      const subj = t.subject ? ` [${t.subject}]` : '';
      return `${who} (${t.channel}, ${t.status}, ${t.createdAt.toISOString().slice(0, 10)})${subj}: ${t.body.slice(0, 400)}`;
    })
    .join('\n---\n');
}

const draftSchema = z.object({ subject: z.string().min(1).max(200), body: z.string().min(1) });

function parseDraft(raw: string): { subject: string; body: string } {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { subject: parsed.data.subject.trim(), body: parsed.data.body.trim() };
  } catch {
    /* fall through to the raw-text fallback */
  }
  // Model ignored the JSON contract — salvage the text as the body.
  return { subject: 'PULSE — شراكة', body: raw.trim() };
}

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

const DRAFT_SYSTEM = `You are the growth SDR for PULSE, writing on behalf of Mohamed (the founder).
Ground every claim in the PITCH CONTEXT below — it is the complete list of what you may say.
${PITCH_CONTEXT}

Writing rules:
- Body: Egyptian Arabic (مصري عامية محترمة), warm and direct, no corporate filler.
- Subject: if the lead seems corporate/international (company org name, English notes), a SHORT English subject; otherwise a short Arabic subject.
- Always include the link https://pulse.geddo.online/why-partner in the body.
- Always end the body with the sign-off: Mohamed — PULSE
- HONESTY: never invent user counts or traffic numbers; never name competitors.
- Reply ONLY as JSON: {"subject": "...", "body": "..."}`;

/** Personalized first-touch email for a lead's partner type. */
export async function draftOutreach(lead: GrowthLead): Promise<{ subject: string; body: string }> {
  requireAi();
  const raw = await chatComplete(
    [
      { role: 'system', content: DRAFT_SYSTEM },
      {
        role: 'user',
        content:
          `Write the FIRST outreach email to this lead. Personalize it to their type and anything the facts reveal. ` +
          `6-10 sentences max, one clear call to action (a 10-minute demo call or WhatsApp).\n\nLEAD:\n${leadFacts(lead)}`,
      },
    ],
    { json: true, temperature: 0.7, maxTokens: 500 },
  );
  return parseDraft(raw);
}

/** Short follow-up (day-3 bump or reply-response) grounded in the thread so far. */
export async function draftFollowUp(lead: GrowthLead, touches: GrowthTouch[]): Promise<{ subject: string; body: string }> {
  requireAi();
  const raw = await chatComplete(
    [
      { role: 'system', content: DRAFT_SYSTEM },
      {
        role: 'user',
        content:
          `Write a FOLLOW-UP email for this lead. Keep it SHORT — 3 to 5 sentences. ` +
          `Reference the thread naturally (do not repeat the whole pitch), and push ONE concrete next step: ` +
          `a 10-minute call or a WhatsApp demo (wa.me/201070799007). If they replied, answer what they raised first.\n\n` +
          `LEAD:\n${leadFacts(lead)}\n\nTHREAD SO FAR:\n${threadText(touches)}`,
      },
    ],
    { json: true, temperature: 0.7, maxTokens: 500 },
  );
  return parseDraft(raw);
}

// ---------------------------------------------------------------------------
// Reply classification
// ---------------------------------------------------------------------------

export type ReplyIntent = 'interested' | 'question' | 'objection' | 'not_now' | 'negative';

const classifySchema = z.object({
  intent: z.enum(['interested', 'question', 'objection', 'not_now', 'negative']),
  summary: z.string().min(1).max(500),
});

export type ReplyClassification = z.infer<typeof classifySchema>;

/** Classify an inbound reply. Never throws on a malformed model answer —
 *  falls back to 'question' so a human still looks at it. */
export async function classifyReply(text: string): Promise<ReplyClassification> {
  requireAi();
  const raw = await chatComplete(
    [
      {
        role: 'system',
        content:
          `You classify replies from potential partners of PULSE (an Egyptian fitness app). ` +
          `Reply ONLY as JSON: {"intent": "interested"|"question"|"objection"|"not_now"|"negative", "summary": "..."} ` +
          `where summary is EXACTLY ONE sentence in Egyptian Arabic describing what they said.`,
      },
      { role: 'user', content: text.slice(0, 2000) },
    ],
    { json: true, temperature: 0.2, maxTokens: 200 },
  );
  try {
    const parsed = classifySchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fall through */
  }
  return { intent: 'question', summary: text.slice(0, 100) };
}

// ---------------------------------------------------------------------------
// Lead brief
// ---------------------------------------------------------------------------

/** 2-3 sentence Arabic brief for the lead card / human handoff. */
export async function briefLead(lead: GrowthLead, touches: GrowthTouch[]): Promise<string> {
  requireAi();
  const raw = await chatComplete(
    [
      {
        role: 'system',
        content:
          `You brief a human salesperson on a PULSE partner lead. Write 2-3 sentences in Egyptian Arabic: ` +
          `who this is, where the conversation stands, and what the next move should be. Plain text, no JSON, no headers.`,
      },
      { role: 'user', content: `LEAD:\n${leadFacts(lead)}\n\nTHREAD:\n${threadText(touches)}` },
    ],
    { temperature: 0.4, maxTokens: 250 },
  );
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Daily cadence — called by the reminders scheduler (08:00) via runLogged.
// ---------------------------------------------------------------------------

/**
 * Draft follow-ups for every lead whose nextTouchAt is due and who is still in
 * an active conversation stage. Drafts land as needs-action items on the board
 * — nothing is auto-sent; a human reviews and hits send.
 */
export async function runGrowthCadence(): Promise<string> {
  if (!aiEnabled()) return 'skipped — OPENAI_API_KEY not configured';

  const due = await prisma.growthLead.findMany({
    where: { nextTouchAt: { lte: new Date() }, stage: { in: ['contacted', 'replied', 'qualified'] } },
    orderBy: { nextTouchAt: 'asc' },
    take: 50,
    include: { touches: { orderBy: { createdAt: 'asc' } } },
  });
  if (due.length === 0) return 'no follow-ups due';

  let drafted = 0;
  let failed = 0;
  for (const lead of due) {
    try {
      const draft = await draftFollowUp(lead, lead.touches);
      await prisma.growthTouch.create({
        data: {
          leadId: lead.id,
          direction: 'out',
          channel: 'email',
          subject: draft.subject,
          body: draft.body,
          aiDrafted: true,
          status: 'draft',
        },
      });
      await prisma.growthLead.update({
        where: { id: lead.id },
        data: { needsAction: true, nextTouchAt: new Date(Date.now() + 4 * 86_400_000) },
      });
      drafted += 1;
    } catch (e: any) {
      // One bad lead (or one OpenAI hiccup) must not sink the whole batch —
      // push its nextTouchAt out a day so tomorrow's run retries it.
      failed += 1;
      console.warn('[growth-cadence] draft failed for', lead.id, e?.message);
      await prisma.growthLead
        .update({ where: { id: lead.id }, data: { nextTouchAt: new Date(Date.now() + 86_400_000) } })
        .catch(() => {});
    }
  }

  if (drafted > 0) {
    const { notifyUser } = await import('../routes/push');
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const a of admins) {
      await notifyUser(a.id, {
        title: `🧲 ${drafted} growth follow-ups drafted — review & send`,
        titleAr: `🧲 ${drafted} رسالة متابعة جاهزة للمراجعة والإرسال`,
        body: 'AI drafted follow-ups for leads that were due today. Review them on the growth board.',
        bodyAr: 'الذكاء الاصطناعي جهّز رسايل متابعة للعملاء المستحقين النهارده. راجعها من لوحة النمو.',
        url: '/admin/growth',
        type: 'general',
      }).catch(() => {});
    }
  }

  return `drafted ${drafted} follow-up(s)${failed ? `, ${failed} failed` : ''} of ${due.length} due`;
}
