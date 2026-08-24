import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { signMedia, verifyMedia } from '../lib/mediaSign';
import { env } from '../env';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth';
import { sendMail } from '../lib/mailer';
import { audit } from '../lib/audit';
import { notifyUser } from './push';
import { draftOutreach, draftFollowUp, classifyReply, briefLead } from '../lib/growth';
import { chatComplete, aiEnabled } from '../lib/openai';

/**
 * GROWTH TEAM — the AI-assisted partner-outreach pipeline. Leads move across a
 * kanban (new → contacted → replied → qualified → meeting → won/lost, or
 * `human` for handoff); the AI drafts every email, a human reviews and sends.
 */
export const adminGrowthRouter = Router();

/** GET /assets/:id/file?exp&sig — SIGNED, registered BEFORE the auth guard:
 *  inline <video>/<img> previews in the dashboard cannot send Bearer headers,
 *  so the file rides a short-lived HMAC URL instead (same scheme as /media). */
adminGrowthRouter.get('/assets/:id/file', async (req, res) => {
  const { exp, sig } = req.query as { exp?: string; sig?: string };
  if (!exp || !sig || !verifyMedia('marketing', req.params.id, Number(exp), sig)) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }
  const asset = await prisma.marketingAsset.findUnique({ where: { id: req.params.id } });
  if (!asset || !fs.existsSync(asset.filePath)) return res.status(404).json({ error: 'Asset file not found' });
  res.download(asset.filePath);
});

adminGrowthRouter.use(requireAuth, requireAdmin);

/** Short-lived signed URL for an asset file (previews + downloads). */
function assetFileUrl(id: string): string {
  const { exp, sig } = signMedia('marketing', id);
  return `/api/admin-growth/assets/${id}/file?exp=${exp}&sig=${sig}`;
}


const STAGES = ['new', 'contacted', 'replied', 'qualified', 'meeting', 'won', 'lost', 'human'] as const;
const LEAD_TYPES = ['gym', 'coach', 'store', 'sponsor', 'influencer', 'other'] as const;

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/** GET / → all leads grouped by stage + attention counts for the header. */
adminGrowthRouter.get('/', async (_req: AuthedRequest, res) => {
  const leads = await prisma.growthLead.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { touches: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } }, _count: { select: { touches: true } } },
  });

  const board: Record<string, any[]> = Object.fromEntries(STAGES.map((s) => [s, []]));
  for (const l of leads) {
    const { touches, _count, ...rest } = l;
    (board[l.stage] ?? (board[l.stage] = [])).push({
      ...rest,
      touchCount: _count.touches,
      lastTouchAt: touches[0]?.createdAt ?? null,
    });
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const [needsAction, dueToday] = await Promise.all([
    prisma.growthLead.count({ where: { needsAction: true } }),
    prisma.growthLead.count({ where: { nextTouchAt: { lte: endOfToday }, stage: { in: ['contacted', 'replied', 'qualified'] } } }),
  ]);

  res.json({ board, counts: { needsAction, dueToday } });
});

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  org: z.string().trim().max(200).optional(),
  type: z.enum(LEAD_TYPES),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  source: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(4000).optional(),
});

/** POST /leads → create one lead (stage new). */
adminGrowthRouter.post('/leads', async (req: AuthedRequest, res) => {
  const parsed = createLeadSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid lead' });
  const lead = await prisma.growthLead.create({ data: parsed.data });
  res.status(201).json(lead);
});

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        org: z.string().trim().max(200).optional(),
        type: z.enum(LEAD_TYPES).optional(),
        email: z.string().trim().email().max(200).optional(),
        phone: z.string().trim().max(50).optional(),
        source: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(200),
});

/** POST /leads/import → bulk create, deduped by email/phone against existing leads. */
adminGrowthRouter.post('/leads/import', async (req: AuthedRequest, res) => {
  const parsed = importSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid rows' });

  const existing = await prisma.growthLead.findMany({ select: { email: true, phone: true } });
  const seenEmails = new Set(existing.map((l) => l.email?.toLowerCase()).filter(Boolean) as string[]);
  const seenPhones = new Set(existing.map((l) => l.phone).filter(Boolean) as string[]);

  let created = 0;
  let skipped = 0;
  for (const row of parsed.data.rows) {
    const emailKey = row.email?.toLowerCase();
    if ((emailKey && seenEmails.has(emailKey)) || (row.phone && seenPhones.has(row.phone))) {
      skipped += 1;
      continue;
    }
    await prisma.growthLead.create({ data: { ...row, type: row.type ?? 'other' } });
    if (emailKey) seenEmails.add(emailKey);
    if (row.phone) seenPhones.add(row.phone);
    created += 1;
  }
  res.json({ created, skipped });
});

/** GET /leads/:id → lead + full touch history. */
adminGrowthRouter.get('/leads/:id', async (req: AuthedRequest, res) => {
  const lead = await prisma.growthLead.findUnique({
    where: { id: req.params.id },
    include: { touches: { orderBy: { createdAt: 'asc' } } },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  // {lead, touches} — the drawer's contract; returning the lead flat left the
  // UI reading data.lead === undefined and spinning forever (user report).
  const { touches, ...rest } = lead;
  res.json({ lead: rest, touches });
});

const patchLeadSchema = z.object({
  stage: z.enum(STAGES).optional(),
  notes: z.string().trim().max(4000).optional(),
  needsAction: z.boolean().optional(),
  nextTouchAt: z.coerce.date().nullable().optional(),
  /** Autopilot: agent auto-sends its drafts on this lead (post-reply threads). */
  autoSend: z.boolean().optional(),
});

/** PATCH /leads/:id → stage / notes / attention flags. Stage moves are audited. */
adminGrowthRouter.patch('/leads/:id', async (req: AuthedRequest, res) => {
  const parsed = patchLeadSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid patch' });
  const lead = await prisma.growthLead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updated = await prisma.growthLead.update({ where: { id: lead.id }, data: parsed.data });
  if (parsed.data.stage && parsed.data.stage !== lead.stage) {
    audit(req.userId!, 'growth.stage', { targetType: 'growthLead', targetId: lead.id, detail: `${lead.stage} → ${parsed.data.stage}` });
  }
  res.json(updated);
});

// ---------------------------------------------------------------------------
// AI drafting + sending
// ---------------------------------------------------------------------------

/** Refresh the card brief off the request path — a slow model call must not
 *  hold up the draft response, and a failed brief is just a stale brief. */
function refreshBrief(leadId: string): void {
  void (async () => {
    const lead = await prisma.growthLead.findUnique({
      where: { id: leadId },
      include: { touches: { orderBy: { createdAt: 'asc' } } },
    });
    if (!lead) return;
    const brief = await briefLead(lead, lead.touches);
    await prisma.growthLead.update({ where: { id: leadId }, data: { aiBrief: brief } });
  })().catch((e) => console.warn('[growth] brief refresh failed:', e?.message));
}

const draftKindSchema = z.object({ kind: z.enum(['first', 'followup']) });

/** POST /leads/:id/draft {kind} → AI-drafted email saved as a draft touch. */
adminGrowthRouter.post('/leads/:id/draft', async (req: AuthedRequest, res) => {
  const parsed = draftKindSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "kind must be 'first' or 'followup'" });
  const lead = await prisma.growthLead.findUnique({
    where: { id: req.params.id },
    include: { touches: { orderBy: { createdAt: 'asc' } } },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  let draft: { subject: string; body: string };
  try {
    draft = parsed.data.kind === 'first' ? await draftOutreach(lead) : await draftFollowUp(lead, lead.touches);
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? 'AI draft failed' });
  }

  const touch = await prisma.growthTouch.create({
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
  refreshBrief(lead.id);
  res.status(201).json(touch);
});

const patchTouchSchema = z
  .object({ subject: z.string().trim().min(1).max(200).optional(), body: z.string().trim().min(1).max(10000).optional() })
  .refine((d) => d.subject !== undefined || d.body !== undefined, { message: 'Nothing to update' });

/** PATCH /touches/:id → human edit of a draft before sending. Drafts only. */
adminGrowthRouter.patch('/touches/:id', async (req: AuthedRequest, res) => {
  const parsed = patchTouchSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid edit' });
  const touch = await prisma.growthTouch.findUnique({ where: { id: req.params.id } });
  if (!touch) return res.status(404).json({ error: 'Touch not found' });
  if (touch.status !== 'draft') return res.status(400).json({ error: 'Only drafts can be edited' });
  const updated = await prisma.growthTouch.update({ where: { id: touch.id }, data: parsed.data });
  res.json(updated);
});

/** POST /touches/:id/send → email the draft to the lead; advance the cadence. */
adminGrowthRouter.post('/touches/:id/send', async (req: AuthedRequest, res) => {
  const touch = await prisma.growthTouch.findUnique({ where: { id: req.params.id }, include: { lead: true } });
  if (!touch) return res.status(404).json({ error: 'Touch not found' });
  if (touch.status !== 'draft') return res.status(400).json({ error: 'Only drafts can be sent' });
  if (!touch.lead.email) return res.status(400).json({ error: 'Lead has no email address' });

  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.8;direction:rtl;text-align:right">${touch.body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')}</div>`;
  const result = await sendMail({ to: touch.lead.email, subject: touch.subject ?? 'PULSE', replyTo: process.env.GROWTH_IMAP_USER, html, text: touch.body });
  if (!result.ok) return res.status(502).json({ error: `Send failed: ${result.reason}` });

  const [updatedTouch] = await Promise.all([
    prisma.growthTouch.update({ where: { id: touch.id }, data: { status: 'sent' } }),
    prisma.growthLead.update({
      where: { id: touch.leadId },
      data: {
        ...(touch.lead.stage === 'new' ? { stage: 'contacted' } : {}),
        nextTouchAt: new Date(Date.now() + 3 * 86_400_000),
        needsAction: false,
      },
    }),
  ]);
  audit(req.userId!, 'growth.send', { targetType: 'growthLead', targetId: touch.leadId, detail: touch.subject ?? undefined });
  res.json(updatedTouch);
});

const logReplySchema = z.object({
  body: z.string().trim().min(1).max(10000),
  channel: z.enum(['email', 'whatsapp', 'call', 'social', 'note']).optional(),
});

/** POST /leads/:id/log-reply → record what they answered; AI classifies it and
 *  moves the stage (interested→qualified, negative→lost, else replied). */
adminGrowthRouter.post('/leads/:id/log-reply', async (req: AuthedRequest, res) => {
  const parsed = logReplySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid reply' });
  const lead = await prisma.growthLead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Classification is best-effort: without a key (or on a hiccup) the reply is
  // still logged and a human still gets pinged via needsAction.
  const cls = aiEnabled()
    ? await classifyReply(parsed.data.body).catch(() => ({ intent: 'question' as const, summary: parsed.data.body.slice(0, 100) }))
    : { intent: 'question' as const, summary: parsed.data.body.slice(0, 100) };

  const touch = await prisma.growthTouch.create({
    data: {
      leadId: lead.id,
      direction: 'in',
      channel: parsed.data.channel ?? 'email',
      subject: `[${cls.intent}]`,
      body: parsed.data.body,
      status: 'received',
    },
  });

  const stage = cls.intent === 'interested' ? 'qualified' : cls.intent === 'negative' ? 'lost' : 'replied';
  await prisma.growthLead.update({
    where: { id: lead.id },
    data: { stage, needsAction: cls.intent !== 'negative' },
  });
  refreshBrief(lead.id);
  res.json({ touch, classification: cls, stage });
});

/** POST /leads/:id/handoff → the AI steps aside: stage `human`, fresh brief,
 *  every admin gets a "pick up the phone" notification. */
adminGrowthRouter.post('/leads/:id/handoff', async (req: AuthedRequest, res) => {
  const lead = await prisma.growthLead.findUnique({
    where: { id: req.params.id },
    include: { touches: { orderBy: { createdAt: 'asc' } } },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const aiBrief = await briefLead(lead, lead.touches).catch(() => lead.aiBrief);
  const updated = await prisma.growthLead.update({
    where: { id: lead.id },
    data: { stage: 'human', needsAction: true, aiBrief },
  });
  audit(req.userId!, 'growth.stage', { targetType: 'growthLead', targetId: lead.id, detail: `${lead.stage} → human (handoff)` });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: `📞 Lead ready for a call — ${lead.name}`,
      titleAr: `📞 عميل جاهز للمكالمة — ${lead.name}`,
      body: aiBrief ?? 'Open the growth board for the full thread.',
      bodyAr: aiBrief ?? 'افتح لوحة النمو للتفاصيل.',
      url: '/admin/growth',
      type: 'general',
    }).catch(() => {});
  }
  res.json(updated);
});

// ---------------------------------------------------------------------------
// Marketing assets — the reel/image pool the posting plan draws from
// ---------------------------------------------------------------------------

const marketingDir = path.join(env.UPLOAD_DIR, 'marketing');
fs.mkdirSync(marketingDir, { recursive: true });

const assetUpload = multer({
  storage: multer.diskStorage({
    destination: marketingDir,
    // Keep the original extension — WhatsApp/Facebook care about .mp4 vs .bin.
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only video or image files are accepted'));
  },
});

/** POST /assets (multipart `file`, optional `caption`) → add to the pool. */
adminGrowthRouter.post('/assets', (req: AuthedRequest, res) => {
  assetUpload.single('file')(req, res, async (err: unknown) => {
    if (err) return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });
    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim().slice(0, 1000) || null : null;
    const asset = await prisma.marketingAsset.create({
      data: {
        kind: req.file.mimetype.startsWith('video/') ? 'reel' : 'image',
        filePath: req.file.path,
        caption,
      },
    });
    res.status(201).json(asset);
  });
});

/** GET /assets → the whole pool, least-used first (i.e. next-up first). */
adminGrowthRouter.get('/assets', async (_req: AuthedRequest, res) => {
  const assets = await prisma.marketingAsset.findMany({ orderBy: [{ usedCount: 'asc' }, { createdAt: 'desc' }] });
  res.json(assets.map((a) => ({ ...a, fileUrl: assetFileUrl(a.id) })));
});

/** DELETE /assets/:id → drop from the pool; file unlink is best-effort. */
adminGrowthRouter.delete('/assets/:id', async (req: AuthedRequest, res) => {
  const asset = await prisma.marketingAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  await prisma.marketingAsset.delete({ where: { id: asset.id } });
  fs.promises.unlink(asset.filePath).catch(() => {});
  res.json({ ok: true });
});

/** Least-used active asset (tie: oldest lastUsedAt, never-used first); bumps
 *  its usage counters so rotation is automatic. Null when the pool is empty. */
async function pickAsset() {
  const asset = await prisma.marketingAsset.findFirst({
    where: { active: true },
    orderBy: [{ usedCount: 'asc' }, { lastUsedAt: 'asc' }],
  });
  if (!asset) return null;
  return prisma.marketingAsset.update({
    where: { id: asset.id },
    data: { usedCount: { increment: 1 }, lastUsedAt: new Date() },
  });
}

/** GET /assets/pick → rotate to the next asset and hand back its download URL. */
adminGrowthRouter.get('/assets/pick', async (_req: AuthedRequest, res) => {
  const asset = await pickAsset();
  if (!asset) return res.status(404).json({ error: 'No active assets in the pool' });
  res.json({ ...asset, fileUrl: assetFileUrl(asset.id) });
});

// ---------------------------------------------------------------------------
// Posting plan — today's cross-platform content, regenerated on demand
// ---------------------------------------------------------------------------

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'whatsapp-channel'] as const;

const planSchema = z.object({
  items: z
    .array(z.object({ platform: z.enum(PLATFORMS), text: z.string().min(1) }))
    .min(1),
});

/** POST /posting-plan {} → one post per platform (distinct angles) + the next
 *  asset in rotation. Nothing is stored — hit it again for a fresh plan. */
adminGrowthRouter.post('/posting-plan', async (_req: AuthedRequest, res) => {
  if (!aiEnabled()) return res.status(502).json({ error: 'OPENAI_API_KEY is not configured' });
  try {
    const { generatePostingPlan } = await import('../lib/growth');
    const plan = await generatePostingPlan();
    res.json({
      items: plan.items,
      asset: plan.asset ? { id: plan.asset.id, caption: plan.asset.caption, fileUrl: plan.asset.fileUrl } : null,
    });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? 'Posting-plan generation failed' });
  }
});


// ---------------------------------------------------------------------------
// Auto-posting controls
// ---------------------------------------------------------------------------

/** GET /social-status → which platforms the auto-poster can reach right now. */
adminGrowthRouter.get('/social-status', async (_req: AuthedRequest, res) => {
  const { socialConfigured } = await import('../lib/socialPoster');
  const { inboxConfigured } = await import('../lib/inbox');
  res.json({
    ...socialConfigured(),
    inbox: inboxConfigured(),
    autoPostDaily: (process.env.AUTO_POST_SOCIAL ?? 'on') !== 'off',
  });
});

/** POST /posting-plan/publish {items, assetId?} → publish NOW to every
 *  configured platform. The dashboard's one-click alternative to the 17:00 job. */
adminGrowthRouter.post('/posting-plan/publish', async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ platform: z.string(), text: z.string().min(5).max(2000) })).min(1).max(6),
    assetId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid plan' });
  const asset = parsed.data.assetId
    ? await prisma.marketingAsset.findUnique({ where: { id: parsed.data.assetId } })
    : null;
  const { publishPlan } = await import('../lib/socialPoster');
  const origin = process.env.WEB_ORIGIN?.replace(/\/$/, '') ?? '';
  const withUrl = asset ? { id: asset.id, filePath: asset.filePath, fileUrl: assetFileUrl(asset.id) } : null;
  const summary = await publishPlan(parsed.data.items, withUrl, origin);
  audit(req.userId!, 'growth.publish', { targetType: 'broadcast', detail: summary.slice(0, 180) });
  res.json({ summary });
});
