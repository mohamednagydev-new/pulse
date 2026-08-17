import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, requireAdmin, type AuthedRequest } from '../middleware/auth';
import { processVideo } from '../lib/video';
import { buildTranslationPatch } from '../lib/translate';
import { aiEnabled, chatComplete } from '../lib/openai';
import { onlineCount, onlineIds } from '../lib/realtime';
import { notifyUser } from './push';
import { daysAgoStr } from '../lib/time';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

/**
 * Best-effort, non-blocking auto-translation. After an admin writes a record we
 * fill any empty Arabic (*Ar) fields with simple spoken Egyptian Arabic. Fire-and-
 * forget: never blocks or fails the admin response, all errors are swallowed.
 */
function autoTranslate(model: any, name: string, record: any) {
  Promise.resolve()
    .then(async () => {
      const patch = await buildTranslationPatch(name, record);
      if (patch) await model.update({ where: { id: record.id }, data: patch });
    })
    .catch((err) => console.warn(`[admin] auto-translate ${name} failed:`, (err as Error).message));
}

/** Optional per-resource cleanup of the admin payload before it hits the database.
 *  Throwing here is how a resource rejects bad input with a clear message. */
type Normalise = (data: Record<string, any>) => Record<string, any>;

/**
 * Writable scalar columns per model, read from Prisma's own datamodel — the
 * server-side allow-list the CRUD factory filters every payload through.
 * Without it req.body went straight into create/update: unknown columns threw
 * raw Prisma 500s and any caller could mass-assign fields the form never shows.
 */
const MODEL_FIELDS = new Map<string, Map<string, { type: string; nullable: boolean }>>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Map(
      m.fields
        .filter((f) => (f.kind === 'scalar' || f.kind === 'enum') && !f.isId && !['createdAt', 'updatedAt'].includes(f.name))
        .map((f) => [f.name, { type: f.type, nullable: !f.isRequired }]),
    ),
  ]),
);

/** Drop unknown keys and coerce the rest to the column's type. Throws a clear,
 *  field-named message that the CRUD handlers surface as a 400 (not a 500). */
function sanitise(modelName: string, body: unknown): Record<string, any> {
  const fields = MODEL_FIELDS.get(modelName);
  if (!fields) throw new Error(`Unknown model ${modelName}`);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('Invalid payload');
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const f = fields.get(key);
    if (!f) continue; // ids, relations, unknown columns: silently dropped
    if (value === undefined) continue;
    if (value === null || value === '') {
      // The form sends '' for every untouched field. NULLABLE columns clear to
      // null; NON-nullable ones (rewardXp, prizeMode, goalValue…) must be
      // OMITTED so Prisma applies the default — passing null threw
      // "Argument must not be null" on every challenge created without
      // touching Reward XP / Prize mode (user report).
      if (f.nullable) out[key] = null;
      continue;
    }
    switch (f.type) {
      case 'Int': {
        const n = Number(value);
        if (!Number.isInteger(n)) throw new Error(`"${key}" must be a whole number`);
        out[key] = n; break;
      }
      case 'Float': {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new Error(`"${key}" must be a number`);
        out[key] = n; break;
      }
      case 'Boolean':
        out[key] = value === true || value === 'true' || value === 1 || value === '1'; break;
      case 'DateTime': {
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) throw new Error(`"${key}" must be a valid date`);
        out[key] = d; break;
      }
      default:
        out[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  }
  return out;
}

/** Prisma throws on constraint/validation problems — those are the admin's fault,
 *  not the server's, so answer 400 with something readable instead of a 500. */
function asBadRequest(res: any, err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const messages: Record<string, string> = {
      P2002: 'A record with this unique value already exists',
      P2003: 'Referenced record does not exist',
      P2011: 'A required field is missing',
      P2025: 'Record not found',
    };
    res.status(err.code === 'P2025' ? 404 : 400).json({ error: messages[err.code] ?? 'Invalid data' });
    return true;
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Missing or invalid fields for this record' });
    return true;
  }
  return false;
}

// Generic CRUD factory over a Prisma model delegate.
function crud(model: any, name: string, ordered = true, normalise?: Normalise) {
  const r = Router();
  r.get('/', async (_req, res) =>
    res.json(await model.findMany(ordered ? { orderBy: { order: 'asc' } } : {})),
  );
  r.get('/:id', async (req, res) => {
    const item = await model.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: `${name} not found` });
    res.json(item);
  });
  r.post('/', async (req, res) => {
    let data: Record<string, any>;
    try { data = sanitise(name, normalise ? normalise(req.body) : req.body); }
    catch (e) { return res.status(400).json({ error: (e as Error).message }); }
    try {
      const item = await model.create({ data });
      res.status(201).json(item);
      autoTranslate(model, name, item);
    } catch (e) {
      if (!asBadRequest(res, e)) throw e;
    }
  });
  r.patch('/:id', async (req, res) => {
    let data: Record<string, any>;
    try { data = sanitise(name, normalise ? normalise(req.body) : req.body); }
    catch (e) { return res.status(400).json({ error: (e as Error).message }); }
    try {
      const item = await model.update({ where: { id: req.params.id }, data });
      res.json(item);
      autoTranslate(model, name, item);
    } catch (e) {
      if (!asBadRequest(res, e)) throw e;
    }
  });
  r.delete('/:id', async (req, res) => {
    try {
      await model.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (e) {
      if (!asBadRequest(res, e)) throw e;
    }
  });
  return r;
}

adminRouter.use('/coaches', crud(prisma.coach, 'Coach'));
adminRouter.use('/programs', crud(prisma.program, 'Program'));
adminRouter.use('/lessons', crud(prisma.lesson, 'Lesson'));
adminRouter.use('/muscle-groups', crud(prisma.muscleGroup, 'MuscleGroup'));
/** Body areas an exercise can be flagged against — mirrors the intake question. */
const CONTRA_AREAS = ['knee', 'back', 'shoulder', 'wrist', 'neck'];

/**
 * Accept "knee, back" as readily as ["knee","back"]. The column is JSON, but
 * parseArray silently returns [] for anything that isn't — so a comma-separated
 * entry would look saved and quietly flag nothing. An unknown area is rejected
 * rather than dropped, because a typo like "knees" disabling a safety flag is
 * exactly the failure nobody would notice.
 */
const normaliseExercise: Normalise = (data) => {
  if (!('contraindications' in data)) return data;
  const raw = data.contraindications;
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ...data, contraindications: null };
  }

  let list: string[];
  if (Array.isArray(raw)) list = raw.map(String);
  else {
    const text = String(raw).trim();
    try {
      const parsed = JSON.parse(text);
      list = Array.isArray(parsed) ? parsed.map(String) : [text];
    } catch {
      list = text.split(/[,;|]/);
    }
  }

  const cleaned = [...new Set(list.map((v) => v.trim().toLowerCase()).filter(Boolean))];
  const unknown = cleaned.filter((v) => !CONTRA_AREAS.includes(v));
  if (unknown.length) {
    throw new Error(`Unknown area(s): ${unknown.join(', ')}. Use any of: ${CONTRA_AREAS.join(', ')}.`);
  }

  return { ...data, contraindications: cleaned.length ? JSON.stringify(cleaned) : null };
};

adminRouter.use('/exercises', crud(prisma.exercise, 'Exercise', true, normaliseExercise));
adminRouter.use('/categories', crud(prisma.category, 'Category'));
adminRouter.use('/articles', crud(prisma.article, 'Article'));
adminRouter.use('/recipes', crud(prisma.recipe, 'Recipe'));
adminRouter.use('/banners', crud(prisma.banner, 'Banner'));
adminRouter.use('/featured', crud(prisma.featuredItem, 'FeaturedItem'));
adminRouter.use('/plans', crud(prisma.membershipPlan, 'MembershipPlan', false));
adminRouter.use('/badges', crud(prisma.badge, 'Badge', false));
adminRouter.use('/challenges', crud(prisma.challenge, 'Challenge', false));
adminRouter.use('/partners', crud(prisma.partner, 'Partner'));
adminRouter.use('/partner-products', crud(prisma.partnerProduct, 'PartnerProduct'));
adminRouter.use('/partner-deals', crud(prisma.partnerDeal, 'PartnerDeal'));
adminRouter.use('/lead-forms', crud(prisma.partnerLeadForm, 'PartnerLeadForm'));
adminRouter.use('/fit-events', crud(prisma.fitEvent, 'FitEvent', false));

// ---- Leads inbox ----
// The billable artefact: newest first, filterable by status, with a CSV hand-off
// so a partner can be sent their leads without anyone opening the database.
adminRouter.get('/leads', async (req, res) => {
  const status = String(req.query.status || '').trim();
  const formId = String(req.query.formId || '').trim();
  const leads = await prisma.lead.findMany({
    where: { ...(status ? { status } : {}), ...(formId ? { formId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { form: { select: { id: true, title: true, partner: { select: { id: true, name: true } } } } },
  });
  const byStatus = await prisma.lead.groupBy({ by: ['status'], _count: true });
  res.json({ leads, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })) });
});

adminRouter.patch('/leads/:id', async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['new', 'sent', 'contacted', 'won', 'lost'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status } });
  res.json(lead);
});

adminRouter.delete('/leads/:id', async (req, res) => {
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

adminRouter.get('/leads.csv', async (req, res) => {
  const formId = String(req.query.formId || '').trim();
  const leads = await prisma.lead.findMany({
    where: formId ? { formId } : {},
    orderBy: { createdAt: 'desc' },
    take: 2000,
    include: { form: { select: { title: true, partner: { select: { name: true } } } } },
  });
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Date', 'Partner', 'Form', 'Name', 'Phone', 'City', 'Note', 'Status'].join(','),
    ...leads.map((l) =>
      [l.createdAt.toISOString(), l.form.partner.name, l.form.title, l.name, l.phone, l.city, l.note, l.status]
        .map(esc)
        .join(','),
    ),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pulse-leads.csv"');
  res.send('﻿' + rows); // BOM so Excel reads the Arabic correctly
});

adminRouter.post('/verify-coach/:userId', async (req, res) => {
  const verified = req.body?.verified !== false;
  await prisma.user.update({ where: { id: req.params.userId }, data: { coachVerified: verified, isCoach: true } });
  res.json({ ok: true });
});

adminRouter.post('/feature-coach/:userId', async (req, res) => {
  const featured = req.body?.featured !== false;
  await prisma.user.update({ where: { id: req.params.userId }, data: { coachFeatured: featured, isCoach: true } });
  res.json({ ok: true });
});

// ---- Bulk video link import ----
// Filling 99 lessons through the edit form one at a time is the reason they are all
// still empty. Paste "title or id, url" lines instead: preview the matches, then apply.

type ImportTarget = 'lesson' | 'exercise' | 'article' | 'recipe';

const IMPORT_MODELS: Record<ImportTarget, { model: any; titleField: 'title' | 'name' }> = {
  lesson: { model: prisma.lesson, titleField: 'title' },
  exercise: { model: prisma.exercise, titleField: 'name' },
  article: { model: prisma.article, titleField: 'title' },
  recipe: { model: prisma.recipe, titleField: 'title' },
};

/** Loose compare so "Day 1: Grounding Flow" matches "day 1 grounding flow". */
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

/** One CSV-ish line → { key, url }. Splits on the LAST comma so titles may contain commas. */
function parseLines(text: string): { line: string; key: string; url: string }[] {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cut = line.lastIndexOf(',');
      if (cut < 0) return { line, key: '', url: '' };
      return { line, key: line.slice(0, cut).trim().replace(/^["']|["']$/g, ''), url: line.slice(cut + 1).trim() };
    });
}

const looksLikeVideoUrl = (u: string) => /^https?:\/\/\S+$/i.test(u);

async function matchRows(target: ImportTarget, text: string) {
  const cfg = IMPORT_MODELS[target];
  const rows = await cfg.model.findMany({ select: { id: true, [cfg.titleField]: true } });

  const byId = new Map<string, any>(rows.map((r: any) => [r.id, r]));
  // A title can repeat ("First Program"), so track ambiguity instead of picking one.
  const byTitle = new Map<string, any[]>();
  for (const r of rows) {
    const k = norm(String(r[cfg.titleField] ?? ''));
    byTitle.set(k, [...(byTitle.get(k) ?? []), r]);
  }

  return parseLines(text).map(({ line, key, url }) => {
    if (!key || !url) return { line, status: 'bad_format' as const, reason: 'Expected "title or id, url"' };
    if (!looksLikeVideoUrl(url)) return { line, status: 'bad_format' as const, key, url, reason: 'That does not look like a URL' };

    const exact = byId.get(key);
    if (exact) return { line, status: 'matched' as const, id: exact.id, title: String(exact[cfg.titleField]), url };

    const hits = byTitle.get(norm(key)) ?? [];
    if (hits.length === 1) return { line, status: 'matched' as const, id: hits[0].id, title: String(hits[0][cfg.titleField]), url };
    if (hits.length > 1) return { line, status: 'ambiguous' as const, key, url, reason: `${hits.length} rows share this title — use the id` };
    return { line, status: 'no_match' as const, key, url, reason: 'No row with that title or id' };
  });
}

adminRouter.post('/video-import/preview', async (req, res) => {
  const target = String(req.body?.target || 'lesson') as ImportTarget;
  if (!IMPORT_MODELS[target]) return res.status(400).json({ error: 'Unknown target' });
  const results = await matchRows(target, req.body?.text);
  res.json({
    results,
    matched: results.filter((r) => r.status === 'matched').length,
    skipped: results.filter((r) => r.status !== 'matched').length,
  });
});

adminRouter.post('/video-import/apply', async (req, res) => {
  const target = String(req.body?.target || 'lesson') as ImportTarget;
  const cfg = IMPORT_MODELS[target];
  if (!cfg) return res.status(400).json({ error: 'Unknown target' });

  // Apply exactly what was previewed. Re-resolving from the raw text here could
  // write a different set than the admin reviewed (rows added/renamed between
  // preview and apply). The client sends the previewed matches; the text path
  // remains as a fallback for older clients.
  let toApply: { id: string; url: string }[];
  let skipped = 0;
  const rows = req.body?.rows;
  if (Array.isArray(rows)) {
    toApply = rows
      .filter((r: any) => r && typeof r.id === 'string' && typeof r.url === 'string' && looksLikeVideoUrl(r.url))
      .map((r: any) => ({ id: r.id, url: r.url }));
    skipped = rows.length - toApply.length;
  } else {
    const results = await matchRows(target, req.body?.text);
    toApply = results.filter((r) => r.status === 'matched') as { id: string; url: string }[];
    skipped = results.length - toApply.length;
  }

  let applied = 0;
  for (const r of toApply) {
    try {
      await cfg.model.update({ where: { id: r.id }, data: { videoUrl: r.url } });
      applied++;
    } catch {
      skipped++; // row deleted between preview and apply
    }
  }
  res.json({ applied, skipped });
});

/** Everything still missing a video, pre-formatted for the paste box: one
 *  "Title, " line per row, so the only thing left to type is the URL. */
adminRouter.get('/video-import/worklist', async (req, res) => {
  const target = String(req.query.target || 'lesson') as ImportTarget;
  const cfg = IMPORT_MODELS[target];
  if (!cfg) return res.status(400).json({ error: 'Unknown target' });

  const rows = await cfg.model.findMany({
    where: { videoId: null, videoUrl: null },
    select: { id: true, [cfg.titleField]: true },
    orderBy: { [cfg.titleField]: 'asc' },
  });

  // Titles are not always unique. Where they repeat, emit the id instead so the
  // pasted line can never be ambiguous.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const t = String(r[cfg.titleField] ?? '');
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const lines = rows.map((r: any) => {
    const title = String(r[cfg.titleField] ?? '');
    return (counts.get(title) ?? 0) > 1 ? `${r.id}, ` : `${title}, `;
  });

  res.json({ count: rows.length, text: lines.join('\n') });
});

/** What still has no video — the worklist that tells you when you are done. */
adminRouter.get('/video-import/status', async (_req, res) => {
  const out: Record<string, { total: number; withVideo: number }> = {};
  for (const [key, cfg] of Object.entries(IMPORT_MODELS)) {
    const total = await cfg.model.count();
    const withVideo = await cfg.model.count({
      where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] },
    });
    out[key] = { total, withVideo };
  }
  res.json(out);
});

// ---- Support inbox ----
adminRouter.get('/tickets', async (req, res) => {
  const status = String(req.query.status || '').trim();
  const kind = String(req.query.kind || '').trim();
  const tickets = await prisma.supportTicket.findMany({
    where: { ...(status ? { status } : {}), ...(kind ? { kind } : {}) },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
  });
  const [byStatus, byKind] = await Promise.all([
    prisma.supportTicket.groupBy({ by: ['status'], _count: true }),
    prisma.supportTicket.groupBy({ by: ['kind'], _count: true }),
  ]);
  res.json({
    tickets,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    byKind: byKind.map((k) => ({ kind: k.kind, count: k._count })),
  });
});

/** Update status, answer, or leave an internal note. A reply also notifies the user. */
adminRouter.patch('/tickets/:id', async (req, res) => {
  const { status, reply, adminNote } = req.body ?? {};
  if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const before = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: 'Not found' });

  const sendingReply = typeof reply === 'string' && reply.trim() && reply.trim() !== (before.reply ?? '');
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: {
      ...(status ? { status: String(status) } : {}),
      ...(typeof adminNote === 'string' ? { adminNote } : {}),
      ...(sendingReply ? { reply: String(reply).trim(), repliedAt: new Date() } : {}),
    },
  });

  // Tell them they have an answer — a reply nobody sees is not a reply. Via
  // notifyUser so it ALSO pushes: this is the one notification a user is
  // actively waiting for, and it was the only one arriving without a banner.
  // Guest tickets have no account to notify — but they left a contact. If it's
  // an email, the reply actually reaches them (it used to save-and-vanish).
  if (sendingReply && !ticket.userId && ticket.contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticket.contact)) {
    const { sendMail } = await import('../lib/mailer');
    const replyText = String(reply).trim();
    sendMail({
      to: ticket.contact,
      subject: `PULSE — Reply to: ${ticket.subject}`,
      text: `${replyText}\n\n— PULSE team · pulse.geddo.online`,
      html: `<p>${replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p><p>— PULSE team · <a href="https://pulse.geddo.online">pulse.geddo.online</a></p>`,
    }).catch((e: any) => console.warn('[support] guest reply mail failed:', e?.message));
  }
  if (sendingReply && ticket.userId) {
    await notifyUser(ticket.userId, {
      type: 'general',
      title: 'Reply to your message 💬',
      titleAr: 'رد على رسالتك 💬',
      body: ticket.subject,
      bodyAr: ticket.subject,
      url: '/support',
    }).catch(() => {});
  }

  res.json(ticket);
});

adminRouter.delete('/tickets/:id', async (req, res) => {
  await prisma.supportTicket.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---- Pinned community announcement ----
// One at a time: pinning a post retires whatever was pinned before, so the feed
// never shows two competing announcements.
adminRouter.post('/pinned', async (req, res) => {
  const { postId, days, title } = req.body ?? {};
  const span = Math.min(Math.max(Number(days) || 7, 1), 90);

  const post = await prisma.feedPost.findUnique({ where: { id: String(postId || '') } });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  await prisma.feedPost.updateMany({ where: { pinned: true }, data: { pinned: false, pinnedUntil: null } });
  const pinned = await prisma.feedPost.update({
    where: { id: post.id },
    data: {
      pinned: true,
      pinnedUntil: new Date(Date.now() + span * 86400000),
      pinnedTitle: typeof title === 'string' && title.trim() ? title.trim() : null,
    },
  });
  res.json(pinned);
});

adminRouter.delete('/pinned', async (_req, res) => {
  const r = await prisma.feedPost.updateMany({ where: { pinned: true }, data: { pinned: false, pinnedUntil: null } });
  res.json({ unpinned: r.count });
});

/** Whatever is pinned right now, with its comments — the admin's view of the thread. */
adminRouter.get('/pinned', async (_req, res) => {
  const post = await prisma.feedPost.findFirst({
    where: { pinned: true },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  if (!post) return res.json({ pinned: null });
  res.json({ pinned: post, expired: !!post.pinnedUntil && post.pinnedUntil.getTime() < Date.now() });
});

// ---- Product analytics dashboard ----
adminRouter.get('/analytics', async (_req, res) => {
  const since14 = new Date(Date.now() - 14 * 86400000);
  const since7 = new Date(Date.now() - 7 * 86400000);

  // DAU: distinct users with events per day (SQLite date bucketing; Prisma stores DATETIME).
  // Prisma stores DateTime as epoch-milliseconds in SQLite — bucket via unixepoch.
  const dau = await prisma.$queryRawUnsafe<{ day: string; users: number }[]>(
    `SELECT date(createdAt / 1000, 'unixepoch') as day, COUNT(DISTINCT userId) as users
     FROM Event WHERE createdAt >= ? GROUP BY day ORDER BY day ASC`,
    since14.getTime(),
  );

  const [topScreensRaw, topEventsRaw, totals] = await Promise.all([
    prisma.event.groupBy({
      by: ['meta'],
      where: { name: 'screen', createdAt: { gte: since7 }, meta: { not: null } },
      _count: true,
      orderBy: { _count: { meta: 'desc' } },
      take: 10,
    }),
    prisma.event.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since7 } },
      _count: true,
      orderBy: { _count: { name: 'desc' } },
      take: 10,
    }),
    Promise.all([
      prisma.user.count(),
      prisma.lessonCompletion.count(),
      prisma.reelWatch.count(),
      prisma.buddyChallenge.count(),
      prisma.feedPost.count(),
      prisma.connection.count({ where: { status: 'accepted' } }),
    ]),
  ]);

  // Acquisition funnel: landing → onboarding → register view → registered,
  // split by ad source ("tiktok/campaign", "facebook", "direct"). The meta is
  // first-touch, so a user who registers days after the ad click still counts
  // toward the ad that brought them.
  const since30 = new Date(Date.now() - 30 * 86400000);
  const funnelRaw = await prisma.event.groupBy({
    by: ['name', 'meta'],
    where: { name: { startsWith: 'funnel-' }, createdAt: { gte: since30 } },
    _count: true,
  });
  const funnel: Record<string, Record<string, number>> = {};
  for (const row of funnelRaw) {
    const source = row.meta || 'direct';
    (funnel[source] ??= {})[row.name] = row._count;
  }

  // Crash telemetry detail: WHICH errors real devices hit, not just the count.
  // 18 anonymous "client-error" rows in top-events are useless without the meta.
  const clientErrorsRaw = await prisma.event.groupBy({
    by: ['meta'],
    where: { name: 'client-error', createdAt: { gte: since7 }, meta: { not: null } },
    _count: true,
    orderBy: { _count: { meta: 'desc' } },
    take: 20,
  });

  const pushUsers = (await prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] })).length;
  res.json({
    onlineNow: onlineCount(),
    pushUsers,
    dau: dau.map((d) => ({ day: d.day, users: Number(d.users) })),
    funnel,
    clientErrors: clientErrorsRaw.map((e) => ({ message: e.meta, count: e._count })),
    // (clear with DELETE /analytics/client-errors)
    topScreens: topScreensRaw.map((s) => ({ path: s.meta, count: s._count })),
    topEvents: topEventsRaw.map((e) => ({ name: e.name, count: e._count })),
    totals: {
      users: totals[0],
      workouts: totals[1],
      reelWatches: totals[2],
      duels: totals[3],
      posts: totals[4],
      connections: totals[5],
    },
  });
});

// Wipe the crash-report list — for after a batch has been triaged and fixed,
// so the card starts clean instead of waiting out the 7-day window.
adminRouter.delete('/analytics/client-errors', async (_req, res) => {
  const r = await prisma.event.deleteMany({ where: { name: 'client-error' } });
  res.json({ ok: true, deleted: r.count });
});

// ---- Broadcast notifications ----
// Admin-composed message to every user (or a segment): lands as a web push on
// subscribed devices AND as an in-app notification for everyone else, with
// per-user language pick when both AR/EN are provided.
adminRouter.post('/broadcast', async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().min(2).max(80),
      body: z.string().trim().min(2).max(300),
      titleAr: z.string().trim().max(80).optional(),
      bodyAr: z.string().trim().max(300).optional(),
      url: z.string().trim().max(200).optional(),
      audience: z.enum(['all', 'active7', 'lapsed7']).default('all'),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Write a title and a message' });
  const { title, body, titleAr, bodyAr, url, audience } = parsed.data;

  const weekAgo = daysAgoStr(7);
  const where =
    audience === 'active7'
      ? { lastActiveOn: { gte: weekAgo } }
      : audience === 'lapsed7'
        ? { OR: [{ lastActiveOn: { lt: weekAgo } }, { lastActiveOn: null }] }
        : {};
  const users = await prisma.user.findMany({ where, select: { id: true } });
  // How many of them can actually receive a push banner (≥1 subscribed device) —
  // shown to the admin so reachability is visible, not guessed.
  const pushSubscribed = (
    await prisma.pushSubscription.findMany({ where: { user: where }, select: { userId: true }, distinct: ['userId'] })
  ).length;

  // Deliver in the background — a big audience must not time the request out.
  void (async () => {
    for (const u of users) {
      await notifyUser(u.id, { title, body, titleAr, bodyAr, url: url || '/', type: 'general' }).catch(() => {});
    }
    console.log(`[broadcast] delivered to ${users.length} user(s) (${audience}), ${pushSubscribed} push-subscribed`);
  })();

  res.json({ ok: true, queued: users.length, pushSubscribed, audience });
});

// Reach preview per audience — how many users each broadcast target holds and
// how many of them can actually receive a push banner. Shown BEFORE sending.
adminRouter.get('/broadcast/reach', async (_req, res) => {
  const weekAgo = daysAgoStr(7);
  const wheres: Record<string, Record<string, unknown>> = {
    all: {},
    active7: { lastActiveOn: { gte: weekAgo } },
    lapsed7: { OR: [{ lastActiveOn: { lt: weekAgo } }, { lastActiveOn: null }] },
  };
  const out: Record<string, { users: number; push: number }> = {};
  for (const [key, where] of Object.entries(wheres)) {
    const [users, push] = await Promise.all([
      prisma.user.count({ where }),
      prisma.pushSubscription
        .findMany({ where: { user: where }, select: { userId: true }, distinct: ['userId'] })
        .then((r) => r.length),
    ]);
    out[key] = { users, push };
  }
  res.json(out);
});

// ---- AI broadcast suggestion ----
// One fresh bilingual notification idea per call; the client falls back to its
// static pool when AI is off. Marketing wording rules are enforced in-prompt.
adminRouter.post('/broadcast/suggest', async (_req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'AI not configured' });
  try {
    const raw = await chatComplete(
      [
        {
          role: 'system',
          content: [
            'You write push notifications for PULSE, a free Egyptian fitness app (workouts, Egyptian food calories, challenges with friends, community).',
            'Produce ONE notification as strict JSON: {"title":"...","titleAr":"...","body":"...","bodyAr":"...","url":"/"}.',
            'titleAr/bodyAr: casual Egyptian Arabic (عامية مصرية), motivating, WhatsApp-friendly tone, one emoji in the title. title/body: matching English.',
            'Body under 120 characters. Vary the angle: motivation, habit tip, water, sleep, protein, challenge, comeback, invite-a-friend.',
            'url: one of / , /workout , /community , /achievements , /wellness/kitchen , /buddies , /tracker.',
            'FORBIDDEN phrases (Arabic): "في جيبك", "خطة مخصصة", "مدعوم بالذكاء الاصطناعي", "حقق أهدافك", "كل حاجة في مكان واحد". Never mention Ramadan or fasting.',
            'Return ONLY the JSON object.',
          ].join('\n'),
        },
        { role: 'user', content: `Write one now. Random seed: ${Date.now() % 10000}` },
      ],
      { temperature: 1.0 },
    );
    const idea = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, ''));
    if (!idea?.title || !idea?.titleAr || !idea?.body || !idea?.bodyAr) throw new Error('bad shape');
    if (/في جيبك|رمضان|صيام/.test(`${idea.titleAr} ${idea.bodyAr}`)) throw new Error('banned phrase');
    res.json({ idea });
  } catch {
    res.status(500).json({ error: 'Generation failed' });
  }
});

// ---- Community moderation ----
// Full admin visibility + delete over user-generated community content: feed
// posts, their comments, and challenge-room messages. (DMs stay private by
// design — moderation covers what the community can see.)
adminRouter.get('/moderation/feed', async (_req, res) => {
  const posts = await prisma.feedPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      comments: { include: { user: { select: { firstName: true } } }, orderBy: { createdAt: 'desc' as const }, take: 10 },
      reactions: { select: { id: true } },
    },
  });
  res.json(
    posts.map((p) => ({
      id: p.id,
      kind: p.kind,
      text: p.text,
      textAr: p.textAr,
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      user: p.user,
      reactionCount: p.reactions.length,
      comments: p.comments.map((c) => ({ id: c.id, text: c.text, by: c.user.firstName, createdAt: c.createdAt })),
    })),
  );
});
adminRouter.delete('/moderation/posts/:id', async (req, res) => {
  await prisma.feedPost.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});
adminRouter.delete('/moderation/comments/:id', async (req, res) => {
  await prisma.postComment.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});
// Who is connected right now (live sockets), newest-seen first.
adminRouter.get('/moderation/online', async (_req, res) => {
  const ids = onlineIds();
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, level: true, lastSeenAt: true },
      })
    : [];
  res.json({ count: ids.length, users });
});

// DM oversight: METADATA ONLY by design — who talks to whom, how much, when.
// Message content stays private; investigations should go through a report
// flow, not silent reading (users who suspect admins read DMs stop using chat).
adminRouter.get('/moderation/dm-threads', async (_req, res) => {
  const threads = await prisma.dMThread.findMany({
    orderBy: { lastMessageAt: 'desc' },
    take: 60,
    include: { _count: { select: { messages: true } } },
  });
  const userIds = Array.from(new Set(threads.flatMap((t) => [t.userAId, t.userBId])));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(
    threads.map((t) => ({
      id: t.id,
      a: byId.get(t.userAId) ?? { firstName: '?', lastName: '' },
      b: byId.get(t.userBId) ?? { firstName: '?', lastName: '' },
      messages: t._count.messages,
      lastMessageAt: t.lastMessageAt,
    })),
  );
});

// User-filed chat reports — the front door for reading DM content.
adminRouter.get('/moderation/reports', async (_req, res) => {
  const reports = await prisma.chatReport.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  const threadIds = Array.from(new Set(reports.map((r) => r.threadId)));
  const threads = await prisma.dMThread.findMany({ where: { id: { in: threadIds } } });
  const userIds = Array.from(new Set([...threads.flatMap((t) => [t.userAId, t.userBId]), ...reports.map((r) => r.reporterId)]));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const byThread = new Map(threads.map((t) => [t.id, t]));
  res.json(
    reports.map((r) => {
      const t = byThread.get(r.threadId);
      return {
        id: r.id,
        threadId: r.threadId,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        reporter: byId.get(r.reporterId) ?? null,
        a: t ? byId.get(t.userAId) ?? null : null,
        b: t ? byId.get(t.userBId) ?? null : null,
      };
    }),
  );
});

adminRouter.post('/moderation/reports/:id/resolve', async (req, res) => {
  await prisma.chatReport.update({ where: { id: req.params.id }, data: { status: 'resolved' } }).catch(() => {});
  res.json({ ok: true });
});

// Full DM content. Owner's call: access exists for any thread, but every read
// is logged loudly so it is an act, not a habit — and reports are the front door.
adminRouter.get('/moderation/dm-threads/:id/messages', async (req: AuthedRequest, res) => {
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: 'Not found' });
  const [a, b, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: thread.userAId }, select: { id: true, firstName: true, lastName: true } }),
    prisma.user.findUnique({ where: { id: thread.userBId }, select: { id: true, firstName: true, lastName: true } }),
    prisma.dMMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 300 }),
  ]);
  console.log(`[moderation] ADMIN ${req.userId} read DM thread ${thread.id} (${a?.firstName} <-> ${b?.firstName})`);
  res.json({
    a, b,
    messages: messages.map((m) => ({
      id: m.id,
      from: m.senderId === thread.userAId ? a?.firstName : b?.firstName,
      text: m.text,
      voice: Boolean(m.audio),
      createdAt: m.createdAt,
    })),
  });
});

adminRouter.get('/moderation/challenge-messages', async (_req, res) => {
  const msgs = await prisma.challengeMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: { user: { select: { firstName: true, lastName: true } }, challenge: { select: { title: true, titleAr: true } } },
  });
  res.json(
    msgs.map((m) => ({
      id: m.id,
      text: m.text,
      isCoach: m.isCoach,
      by: m.isCoach ? 'Coach PULSE' : `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim() || '—',
      room: m.challenge.titleAr ?? m.challenge.title,
      createdAt: m.createdAt,
    })),
  );
});
adminRouter.delete('/moderation/challenge-messages/:id', async (req, res) => {
  await prisma.challengeMessage.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ ok: true });
});

// ---- Facebook post studio ----
// The daily posting loop, in-app: 3 suggested captions (AI when a key exists,
// else a smart rotation over live content), admin edits, attaches an uploaded
// image, and publishes straight to the Page with the server's page token.
const GRAPH = 'https://graph.facebook.com/v21.0';
const fbCreds = () => ({ pageId: process.env.FB_PAGE_ID, token: process.env.FB_PAGE_TOKEN });

adminRouter.get('/fb/status', async (_req, res) => {
  const { pageId, token } = fbCreds();
  if (!pageId || !token) return res.json({ configured: false });
  const name = await fetch(`${GRAPH}/${pageId}?fields=name&access_token=${token}`)
    .then((r) => r.json())
    .then((j: any) => j.name ?? null)
    .catch(() => null);
  res.json({ configured: true, pageName: name, aiEnabled: aiEnabled() });
});

adminRouter.get('/fb/suggestions', async (_req, res) => {
  // Fresh content picks make every day's suggestions different even without AI.
  const dayN = Math.floor(Date.now() / 86_400_000);
  const [recipesAll, articlesAll, challenge] = await Promise.all([
    prisma.recipe.findMany({ select: { title: true, titleAr: true, calories: true }, take: 200 }),
    prisma.article.findMany({ select: { title: true, titleAr: true }, take: 300 }),
    prisma.challenge.findFirst({ where: { kind: 'global', endsOn: { gte: new Date().toISOString().slice(0, 10) } }, orderBy: { startsOn: 'desc' } }),
  ]);
  // Seasonal content stays out of the daily rotation off-season: the Ramadan
  // pack is big, so unfiltered day-math kept landing on it months early.
  const seasonal = /ramadan|رمضان|صيام|عيد/i;
  const inSeason = [1, 2].includes(new Date().getMonth()); // Feb–Mar 2027 window
  const notSeasonal = (x: { title: string | null; titleAr?: string | null }) =>
    inSeason || !(seasonal.test(x.title ?? '') || seasonal.test(x.titleAr ?? ''));
  const recipes = recipesAll.filter(notSeasonal);
  const articles = articlesAll.filter(notSeasonal);
  const recipe = recipes.length ? recipes[dayN % recipes.length] : null;
  const article = articles.length ? articles[(dayN * 7) % articles.length] : null;

  // ---- Three fixed roles per day: feature-sell / long knowledge / join CTA ----
  const FEATURES_POOL = [
    'تسجيل الأكل بالصوت 🎤 — بتقول أكلت إيه، والسعرات بتتحسب لوحدها. كشري، فول، طعمية — بأرقامها الحقيقية.',
    'خريطة العضلات 🎯 — بتدوس على العضلة اللي عايز تمرنها، بياخدك على جلسة كاملة بالفيديو خطوة بخطوة.',
    'حصص لايف جماعية 🔴 — السبت ٧م جسم كامل، الثلاثاء ٨م حرق، الخميس ٨م يوجا. بتايمر مشترك، كأنكم جنب بعض.',
    'الدوري الأسبوعي 🏅 — بتجمع نقط من تمارينك وبتنافس ٢٠ واحد زيك. أول ٥ بيصعدوا كل سبت.',
    'تحدي ١ ضد ١ ⚔️ — بتتحدى صاحبك على أسبوع تمارين، واللي يكسب ياخد نقط التاني. الخسارة بتوجع 😄',
    'خطة الوجبات 🥗 — مش بس بتقولك تاكل إيه، بتقولك ليه. ومعاها قايمة مشتريات جاهزة.',
    'سلسلة الأيام 🔥 — كل يوم بتتمرن فيه السلسلة بتكبر، والتطبيق بيحارب معاك عشان متقطعش. فيه حتى تجميدة لو ظرف حصل.',
    'أرقامك القياسية 🏆 — سجّل أوزانك، ولما تكسر رقمك القديم التطبيق بيحتفل بيك احتفال حقيقي.',
    'الأسبوع صفر 🌱 — لو عمرك ما اتمرنت: ٧ أيام هادية جداً بتدخلك عالم التمرين من غير ما تكره حياتك.',
    'ريلز تمارين 🎬 — مقاطع قصيرة جوه التطبيق، تتحمس بيها وتتعلم منها حركات جديدة.',
    'مقالات بالعربي 📖 — ١٢٠+ مقال عن النوم والضغط والسكر والمفاصل، مكتوبين ببساطة ومن غير كلام كبير.',
    'شات ورسائل صوتية 🎙 — إنت وأصحابك جوه التطبيق: شجعوا بعض، اتريقوا على بعض، والمهم كمّلوا.',
  ];

  const KNOWLEDGE_POOL = [
    'حقيقة عن البروتين 🥚\n\nجسمك محتاج حوالي ١.٦ جرام بروتين لكل كيلو من وزنك لو بتتمرن — يعني واحد وزنه ٨٠ كيلو محتاج ~١٢٨ جرام في اليوم.\n\nمصادر رخيصة وموجودة في كل بيت مصري:\n• بيضة = ٦ جرام\n• علبة فول = ١٥ جرام\n• صدر فراخ = ٣٠ جرام\n• كوب عدس مطبوخ = ١٨ جرام\n• علبة زبادي = ١٠ جرام\n\nمش لازم مكملات ولا بودرات — لازم بس تعرف بتاكل كام. وده بالظبط اللي التطبيق بيحسبهولك ببلاش.\npulse.geddo.online\n\n#PULSE #نبض #بروتين #تغذية',
    'ليه مش بتخس مع إنك "بتاكل كويس"؟ 🤔\n\nالسبب رقم واحد: السعرات السايلة.\nكوباية عصير مانجو = ~٢٠٠ سعرة\nلاتيه بالسكر = ~٢٥٠ سعرة\nمشروب غازي = ~١٥٠ سعرة\n\nلو بتشرب الثلاثة دول يومياً، ده ٦٠٠ سعرة زيادة — يعني كيلو دهون كل ١٢ يوم تقريباً، من غير ما تحس إنك أكلت حاجة.\n\nأول خطوة حقيقية للتخسيس: اعرف بتشرب كام قبل ما تفكر تاكل كام.\nسجّل يومك في PULSE وشوف بنفسك — مجاني.\npulse.geddo.online\n\n#PULSE #نبض #تخسيس #سعرات',
    'قاعدة التقدم التدريجي 📈\n\nالعضلات مش بتكبر من التعب — بتكبر من التحدي المتزايد.\n\nيعني إيه؟ لو بتشيل نفس الوزن بنفس العدات كل أسبوع، جسمك اتعود وخلاص — مفيش سبب يتغير.\n\nالحل بسيط: كل أسبوع زوّد حاجة واحدة صغيرة:\n• عدّة زيادة على نفس الوزن، أو\n• كيلو زيادة على نفس العدات، أو\n• ثانية أبطأ في النزول\n\nعشان كده بنقولك سجّل أوزانك — اللي مش متسجل مش هتعرف تزوّده.\npulse.geddo.online — التسجيل جوه التطبيق ببلاش.\n\n#PULSE #نبض #كمال_اجسام #تمرين',
    'النوم هو المكمل الغذائي الحقيقي 😴\n\nأقل من ٧ ساعات نوم بشكل مستمر بيعمل الآتي:\n• بيقلل هرمون الشبع وبيزود هرمون الجوع — بتصحى جعان أكتر\n• بيقلل قدرة العضلات على التعافي بعد التمرين\n• بيخلي جسمك يخزن دهون أسهل\n\nيعني ممكن تكون بتتمرن صح وبتاكل صح، والنوم هو اللي مضيّع مجهودك.\n\nجرب أسبوع واحد: نام ٧-٨ ساعات وشوف الفرق في طاقتك وتمرينك.\n\n#PULSE #نبض #نوم #صحة',
    'المشي مُقدَّر بأقل من حقه 🚶\n\n٣٠ دقيقة مشي يومياً:\n• بتحرق ~١٥٠ سعرة\n• بتحسن المزاج والتركيز\n• بتقلل خطر أمراض القلب والسكر\n• ومش محتاجة جيم ولا معدات ولا فلوس\n\nلو التمرين تقيل عليك دلوقتي، ابدأ بالمشي بس. أهم حاجة في اللياقة مش الشدة — الاستمرارية.\n\nولما تكون جاهز للخطوة الجاية، إحنا موجودين — ببلاش.\npulse.geddo.online\n\n#PULSE #نبض #مشي #لياقة',
    'يوم الراحة مش يوم كسل 🛋\n\nالعضلة بتكبر وإنت مرتاح، مش وإنت بتتمرن. التمرين بيعمل الجرح، والراحة بتبني.\n\nعلامات إنك محتاج راحة:\n• نايم كويس ولسه تعبان\n• الأوزان اللي كانت سهلة بقت تقيلة\n• عصبية ومزاج وحش من غير سبب\n\nيوم راحة ذكي: مشي خفيف + إطالات + مية كتير + نوم بدري.\nوجوه التطبيق فيه برنامج يوم راحة كامل — إطالة وتنفس ومشي.\n\n#PULSE #نبض #راحة #تعافي',
    'إزاي تعرف إنك بتتقدم من غير ميزان؟ 📏\n\nالميزان بيكدب: ممكن تخس دهون وتكسب عضل فيثبت الرقم — وإنت فعلياً اتحسنت جداً.\n\nعلامات تقدم حقيقية:\n• الهدوم بقت أوسع\n• بتطلع السلم من غير نهجان\n• الأوزان اللي كانت تقيلة بقت عادية\n• نومك أعمق ومزاجك أحسن\n\nقيس تقدمك بحاجات كتير مش برقم واحد. التطبيق بيسجللك التمارين والأوزان والصور — وبتشوف الرحلة كلها قدامك.\npulse.geddo.online\n\n#PULSE #نبض #تقدم',
    'الإحماء مش رفاهية ⚡\n\n٥ دقايق إحماء قبل التمرين بتعمل فرق ضخم:\n• بترفع حرارة العضلات فبتقل فرصة الإصابة\n• بتحسن أداءك في التمرين نفسه\n• بتجهز مفاصلك للأحمال\n\nإحماء بسيط: دقيقتين مشي سريع أو حبل + دورانات مفاصل + عدات خفيفة من نفس تمرينك الأول.\n\nكل جلسة في PULSE فيها الفيديو بيوريك الحركة الصح من الأول — ببلاش.\npulse.geddo.online\n\n#PULSE #نبض #احماء #تمرين',
    'المية والتخسيس 💧\n\nمعلومة بسيطة بتفرق مع ناس كتير: العطش بيتلبس لبس الجوع.\n\nيعني ساعات بتحس إنك جعان وإنت في الحقيقة عطشان — فبتاكل ٣٠٠ سعرة وإنت كنت محتاج كوباية مية بصفر سعرات.\n\nجرب القاعدة دي: أول ما تحس بجوع بين الوجبات، اشرب كوباية مية واستنى ١٠ دقايق. لو الجوع كمل، كل. لو راح — كانت عطش.\n\nعدّاد المية جوه PULSE بيفكرك طول اليوم — ببلاش.\npulse.geddo.online\n\n#PULSE #نبض #مية #تخسيس',
    'وجع العضلات بعد التمرين — خير ولا شر؟ 🤕\n\nالوجع اللي بييجي تاني يوم اسمه DOMS وهو طبيعي جداً، خصوصاً بعد تمرين جديد أو أول رجوع بعد غياب.\n\nحقايق مهمة:\n• الوجع مش شرط النجاح — ممكن تتمرن ممتاز من غير وجع\n• قمة الوجع بتيجي بعد ٢٤-٤٨ ساعة وبتروح لوحدها\n• أحسن علاج ليه: حركة خفيفة ومية، مش رقاد تام\n• لو الوجع في مفصل مش عضلة، أو حاد جداً — ده إنذار مش DOMS\n\nخلّي جسمك يتعود بالتدريج — وده بالظبط اللي البرامج جوه التطبيق معمولة عشانه.\npulse.geddo.online\n\n#PULSE #نبض #تمرين #تعافي',
    'الدهون مش العدو 🥑\n\nجسمك محتاج دهون عشان الهرمونات والدماغ وامتصاص فيتامينات كاملة (A وD وE وK).\n\nالفرق في النوع والكمية:\n✅ كويسة: زيت زيتون، مكسرات، أفوكادو، سمك\n⚠️ بحساب: سمنة وزبدة\n❌ قللها جداً: مقليات المطاعم والزيوت المتحروقة المعاد استخدامها\n\nالمشكلة الحقيقية إن الدهون سعراتها عالية (٩ سعرات للجرام) — فسهل تاكل كتير من غير ما تحس.\n\nمعلقة زيت = ~١٢٠ سعرة. سجّلها عشان تعرف.\npulse.geddo.online — الحاسبة ببلاش.\n\n#PULSE #نبض #تغذية #دهون',
    'البيت ولا الجيم؟ الإجابة العلمية 🏠🏋️\n\nالدراسات واضحة: العضلة مش عارفة إنت فين — هي عارفة بس فيه مقاومة ولا لأ.\n\nتمارين وزن الجسم (ضغط، سكوات، عقلة) بتبني عضل حقيقي لحد مستوى متقدم، خصوصاً لو بتزود الصعوبة بالتدريج.\n\nالجيم ميزته: أوزان أتقل وتنوع أكبر — مش سحر إضافي.\n\nالخلاصة: أحسن مكان للتمرين هو المكان اللي هتستمر فيه فعلاً.\nوجوه PULSE فيه برامج كاملة للاتنين — بيت من غير أي معدات، وجيم بالأوزان.\npulse.geddo.online — ببلاش.\n\n#PULSE #نبض #تمرين_في_البيت #جيم',
    'ثبت وزنك وواقف مكانك؟ (البلاتوه) 📉\n\nده طبيعي ومش معناه إنك فشلت — جسمك اتأقلم وخلاص.\n\nليه بيحصل: لما بتخس، جسمك الأخف بيحرق أقل، فالسعرات اللي كانت بتنزّلك بقت بالظبط اللي بتثبتك.\n\n٣ حلول عملية:\n١. زوّد حركتك اليومية (مشي أكتر، سلم بدل أسانسير)\n٢. راجع تسجيل أكلك — التقديرات بتزيد مع الوقت من غير ما نحس\n٣. زوّد شدة التمرين مش مدته\n\nاللي بيسجل بيعرف فين المشكلة. اللي مش بيسجل بيفتكر جسمه "باظ".\npulse.geddo.online — سجّل ببلاش.\n\n#PULSE #نبض #تخسيس #بلاتوه',
    'القهوة والتمرين ☕\n\nالكافيين من أكتر المكملات المثبتة علمياً — بيحسن الأداء والتركيز في التمرين فعلاً.\n\nالاستخدام الصح:\n• كوباية قهوة قبل التمرين بـ٣٠-٦٠ دقيقة\n• من غير سكر ولا لبن كامل لو هدفك تخسيس (القهوة السادة = ~٥ سعرات، اللاتيه = ٢٠٠+)\n• تجنبها بعد الساعة ٤ عصراً — الكافيين بيقعد في جسمك ٦+ ساعات وبيبوظ النوم\n\nوافتكر: النوم الكويس أهم من أي كوباية قهوة.\n\n#PULSE #نبض #قهوة #تمرين',
    'الألياف — السلاح المنسي في التخسيس 🌾\n\nالأكل الغني بالألياف بيشبعك أكتر بسعرات أقل، وبيظبط السكر والهضم.\n\nكنوز مصرية مليانة ألياف:\n• الفول والعدس والحمص 👑\n• الجوافة والتين البرشومي\n• البامية والملوخية\n• الردة والعيش البلدي (أحسن من الفينو بكتير)\n\nهدفك: ٢٥-٣٠ جرام ألياف يومياً. طبق فول الصبح + شوربة عدس بالليل وإنت قربت توصل.\n\nوكل الأكلات دي بسعراتها الحقيقية جوه التطبيق.\npulse.geddo.online\n\n#PULSE #نبض #الياف #تغذية',
  ];

  const JOIN_POOL = [
    'جرب تفتكر آخر مرة حسيت فيها إنك أقوى من الأسبوع اللي فاته 💪\n\nلو مش فاكر — يبقى ده وقتك.\nتمارين بالفيديو، سعرات بالأكل المصري، وأصحاب بيشدوا بعض.\nمن غير فيزا، من غير اشتراك، من غير أعذار.\n\npulse.geddo.online — ادخل حتى من غير حساب واتفرج بنفسك 👀\n\n#PULSE #نبض #ابدأ_دلوقتي',
    'التطبيقات التانية: "جرب ٧ أيام مجاناً وبعدين ادفع" 💸\nإحنا: مجاني. خلاص. مفيش وبعدين.\n\nتمارين، تغذية، تحديات، دوري أسبوعي — كله ببلاش لأننا مصريين عارفين إن الاشتراكات دي عائق مش خدمة.\n\npulse.geddo.online\n\n#PULSE #نبض #ببلاش',
    'محتاج ٣ حاجات بس عشان تبدأ النهارده:\n١. موبايلك 📱\n٢. ٣ دقايق ⏱\n٣. قرار ✅\n\nافتح اللينك، جاوب ٩ أسئلة، وخد خطتك وابدأ أول تمرين — قبل ما القهوة تبرد.\npulse.geddo.online — مجاني ١٠٠٪\n\n#PULSE #نبض #ابدأ_دلوقتي',
    'لصاحبك اللي بيقول "من بكرة" من ٢٠١٩ 😂\n\nابعتله البوست ده. خليه يدخل يشوف إن التمرين ممكن يكون: في البيت، من غير أجهزة، ومجاني.\nومفيش حجة تانية.\n\npulse.geddo.online\n\n#PULSE #نبض #من_بكرة',
    'إنت مش محتاج مدرب بـ٢٠٠٠ جنيه في الشهر.\nمحتاج خطة واضحة، فيديو يوريك الحركة الصح، وحد يسأل عليك لو غبت.\n\nالثلاثة موجودين في PULSE — وبلاش.\nجرب بنفسك من غير ما تعمل حساب حتى: pulse.geddo.online\n\n#PULSE #نبض #كوتش',
  ];

  const seasonalScrub = (p: { label: string; caption: string }, fallback: { label: string; caption: string }) =>
    seasonal.test(p.caption) ? fallback : p;

  const fallbackTrio = [
    { label: 'ميزة النهارده', caption: `${FEATURES_POOL[dayN % FEATURES_POOL.length]}\n\nوده واحدة بس من اللي جوه — كله مجاني ١٠٠٪.\npulse.geddo.online\n\n#PULSE #نبض #فتنس` },
    { label: 'معلومة تفيدك', caption: KNOWLEDGE_POOL[dayN % KNOWLEDGE_POOL.length] },
    { label: 'انضم لينا', caption: JOIN_POOL[dayN % JOIN_POOL.length] },
  ];

  if (aiEnabled()) {
    try {
      const raw = await chatComplete(
        [
          {
            role: 'system',
            content:
              'You write Facebook posts for PULSE (pulse.geddo.online), a 100% free Egyptian fitness app. Spoken Egyptian Arabic (عامية مصرية) only. Return STRICT JSON {"posts":[{"label":"...","caption":"..."},{"label":"...","caption":"..."},{"label":"...","caption":"..."}]} with EXACTLY these three roles in order: (1) label "ميزة النهارده" — sell ONE app feature attractively in 3-5 lines (pick from: voice food logging with Egyptian foods, muscle map with video sessions, live group sessions Sat/Tue/Thu, weekly XP league, 1v1 friend duels, meal plans + grocery list, streaks, PR celebrations, Week Zero for beginners, Arabic articles, reels, chat with voice notes). (2) label "معلومة تفيدك" — a LONG genuinely useful knowledge post (8-14 lines) teaching something concrete about training, nutrition, sleep, or health, with real numbers and Egyptian food examples, ending with a soft mention of the app. (3) label "انضم لينا" — a punchy conversion post that makes people want to join NOW, mentioning it is completely free and that they can browse without an account. Every caption ends with pulse.geddo.online and 2-3 Arabic hashtags + #PULSE #نبض. NEVER use: «خطة مخصصة», «مدعوم بالذكاء الاصطناعي», «حقق أهدافك», «كل حاجة في مكان واحد». ABSOLUTELY NO seasonal content: no Ramadan/رمضان, صيام, عيد, Eid — reject the temptation even if source material mentions it.',
          },
          {
            role: 'user',
            content: `Optional non-seasonal seeds you may use: recipe "${recipe?.titleAr || recipe?.title || '-'}" (${recipe?.calories ?? '?'} kcal), article topic "${article?.titleAr || article?.title || '-'}", live challenge "${challenge?.titleAr || challenge?.title || '-'}" (code ${challenge?.inviteCode || '-'}). Day number ${dayN} — vary style from previous days.`,
          },
        ],
        { json: true, temperature: 0.9 },
      );
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.posts) && parsed.posts.length >= 3) {
        // Belt over braces: any seasonal slip in AI output swaps for the curated fallback of the same role.
        const posts = parsed.posts.slice(0, 3).map((p: any, i: number) => seasonalScrub(p, fallbackTrio[i]));
        return res.json({ source: 'ai', posts });
      }
    } catch (e: any) {
      console.warn('[fb-suggest] AI failed, using rotation:', e?.message);
    }
  }

  res.json({ source: 'rotation', posts: fallbackTrio });
});

adminRouter.post('/fb/post', async (req, res) => {
  const { pageId, token } = fbCreds();
  if (!pageId || !token) return res.status(400).json({ error: 'FB_PAGE_ID / FB_PAGE_TOKEN not configured on the server' });
  const parsed = z
    .object({
      message: z.string().trim().min(5).max(5000),
      imagePath: z.string().trim().max(300).optional(),
      scheduleAt: z.string().datetime({ offset: true }).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Write a caption first' });
  const { message, imagePath, scheduleAt } = parsed.data;

  const when = scheduleAt ? Math.floor(new Date(scheduleAt).getTime() / 1000) : null;
  if (when && when < Date.now() / 1000 + 660) {
    return res.status(400).json({ error: 'Facebook needs schedules at least ~10 minutes ahead' });
  }

  const params: Record<string, string> = { access_token: token };
  if (when) {
    params.published = 'false';
    params.scheduled_publish_time = String(when);
  }

  let url: string;
  if (imagePath) {
    // FB fetches the image itself — our content images are public.
    params.url = `${env.WEB_ORIGIN}/media/image/${imagePath.replace(/^images\//, '')}`;
    params.caption = message;
    url = `${GRAPH}/${pageId}/photos`;
  } else {
    params.message = message;
    params.link = env.WEB_ORIGIN;
    url = `${GRAPH}/${pageId}/feed`;
  }

  const json: any = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
    .then((r) => r.json())
    .catch((e) => ({ error: { message: String(e?.message || e) } }));

  if (json.error) return res.status(502).json({ error: `Facebook: ${json.error.message ?? 'post failed'}` });
  res.json({ ok: true, id: json.post_id ?? json.id, scheduled: !!when });
});

adminRouter.get('/users', async (req, res) => {
  // Capped: an unbounded findMany over every user eventually returns megabytes.
  const take = Math.min(Math.max(Number(req.query.take) || 500, 1), 2000);
  const q = String(req.query.q || '').trim();
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] }
      : {},
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, isCoach: true, coachVerified: true, coachFeatured: true, avatarUrl: true, xp: true, level: true, currentStreak: true, lastActiveOn: true, lastSeenAt: true, _count: { select: { pushSubs: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(users);
});

// ---- Full user control (edit / reset password / delete) ----

const adminUserPatch = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().max(60).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isCoach: z.boolean().optional(),
  coachVerified: z.boolean().optional(),
  coachFeatured: z.boolean().optional(),
});

adminRouter.patch('/users/:id', async (req: any, res) => {
  const parsed = adminUserPatch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid fields' });
  // The last admin must not be able to lock everyone out by demoting themselves.
  if (parsed.data.role === 'USER' && req.params.id === req.userId) {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) return res.status(400).json({ error: 'You are the only admin — promote someone else first' });
  }
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (e) {
    if (!asBadRequest(res, e)) throw e;
  }
});

/** New random password, returned exactly once. All sessions are revoked. */
adminRouter.post('/users/:id/reset-password', async (req, res) => {
  const crypto = await import('crypto');
  const bcrypt = await import('bcryptjs');
  const pw = crypto.randomBytes(9).toString('base64url');
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
    res.json({ password: pw });
  } catch (e) {
    if (!asBadRequest(res, e)) throw e;
  }
});

/** Hard delete: FK cascades handle most tables; the loose-id tables (same set
 *  clean-demo.ts sweeps) are cleared explicitly so no orphan rows remain. */
adminRouter.delete('/users/:id', async (req: any, res) => {
  const id = req.params.id;
  if (id === req.userId) return res.status(400).json({ error: "You can't delete your own account" });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (target.role === 'ADMIN') return res.status(400).json({ error: 'Demote the admin to USER first' });

  const inId = { in: [id] };
  await prisma.notification.deleteMany({ where: { userId: inId } });
  await prisma.connection.deleteMany({ where: { OR: [{ requesterId: inId }, { addresseeId: inId }] } });
  await prisma.eventRsvp.deleteMany({ where: { userId: inId } });
  await prisma.reelFavorite.deleteMany({ where: { userId: inId } });
  await prisma.reelWatch.deleteMany({ where: { userId: inId } });
  await prisma.spinClaim.deleteMany({ where: { userId: inId } });
  await prisma.questClaim.deleteMany({ where: { userId: inId } });
  await prisma.waterLog.deleteMany({ where: { userId: inId } });
  await prisma.bodyLog.deleteMany({ where: { userId: inId } });
  await prisma.liftLog.deleteMany({ where: { userId: inId } });
  await prisma.postReaction.deleteMany({ where: { userId: inId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: inId } });
  await prisma.groupParticipant.deleteMany({ where: { userId: inId } });
  await prisma.groupSession.deleteMany({ where: { coachUserId: inId } });
  await prisma.coachRating.deleteMany({ where: { OR: [{ coachUserId: inId }, { clientId: inId }] } });
  await prisma.coachRequest.deleteMany({ where: { OR: [{ coachUserId: inId }, { clientId: inId }] } });
  await prisma.coachWorkout.deleteMany({ where: { coachUserId: inId } });
  await prisma.coachProgram.deleteMany({ where: { coachUserId: inId } });
  await prisma.dMThread.deleteMany({ where: { OR: [{ userAId: inId }, { userBId: inId }] } });
  await prisma.buddyChallenge.deleteMany({ where: { OR: [{ challengerId: inId }, { opponentId: inId }] } });
  await prisma.lead.deleteMany({ where: { userId: inId } });
  await prisma.aiUsage.deleteMany({ where: { userId: inId } });
  await prisma.weeklyRecap.deleteMany({ where: { userId: inId } });
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

// ---- Uploads ----
const tmpDir = path.join(env.UPLOAD_DIR, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

adminRouter.post('/upload/video', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  // 2 GB of anything used to be accepted here; ffmpeg would then choke on it.
  if (!/^video\//.test(req.file.mimetype || '')) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Video files only' });
  }
  const processed = await processVideo(req.file.path);
  const video = await prisma.video.create({ data: processed });
  res.status(201).json(video);
});

adminRouter.post('/upload/image', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!/^image\/(jpe?g|png|webp|gif)$/.test(req.file.mimetype || '')) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Only JPG, PNG, WEBP or GIF images' });
  }
  const imagesDir = path.join(env.UPLOAD_DIR, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  // Extension from the validated mime, not the client filename (see social upload).
  const ext = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[req.file.mimetype] ?? '.jpg';
  const name = `${req.file.filename}${ext}`;
  fs.renameSync(req.file.path, path.join(imagesDir, name));
  res.status(201).json({ path: `images/${name}`, url: `/media/image/${name}` });
});

/* ------------------------------------------------------------------ *
 * Email blast — targeted re-engagement email from the admin, with an
 * AI drafter. Audiences are pre-defined segments (never raw SQL from
 * the client), the send is capped per run, every mail carries the
 * signed unsubscribe link, and opted-out users are always excluded.
 * ------------------------------------------------------------------ */

const EMAIL_SEND_CAP = 150;

function audienceWhere(seg: string): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = {
    emailOptOut: false,
    email: { not: { endsWith: '@test.local' } },
  };
  const cutoff = (days: number) => new Date(Date.now() - days * 86400000);
  switch (seg) {
    case 'inactive3':
      return { ...base, OR: [{ lastSeenAt: { lt: cutoff(3) } }, { lastSeenAt: null }] };
    case 'inactive7':
      return { ...base, OR: [{ lastSeenAt: { lt: cutoff(7) } }, { lastSeenAt: null }] };
    case 'nopush':
      return { ...base, pushSubs: { none: {} } };
    case 'all':
    default:
      return base;
  }
}

adminRouter.get('/email/audience', async (req, res) => {
  const seg = String(req.query.seg || 'inactive3');
  const count = await prisma.user.count({ where: audienceWhere(seg) });
  res.json({ seg, count, cap: EMAIL_SEND_CAP });
});

// Connect+auth against SMTP without sending — surfaces "unconfigured" or the
// provider's real error in the admin UI instead of a false "sent ✅".
adminRouter.get('/email/smtp-status', async (_req, res) => {
  const { verifySmtp } = await import('../lib/mailer');
  res.json(await verifySmtp());
});

adminRouter.post('/email/draft', async (req: AuthedRequest, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'AI is not configured' });
  const parsed = z.object({ goal: z.string().min(3).max(400) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Describe the email goal' });
  const raw = await chatComplete(
    [
      {
        role: 'system',
        content:
          'You write short re-engagement emails for PULSE, a free Egyptian fitness PWA (pulse.geddo.online). ' +
          'Write in warm spoken Egyptian Arabic (عامية مصرية). Keep it under 120 words, friendly, zero guilt-tripping. ' +
          'Never use the phrases: "في جيبك", "خطة مخصصة", "مدعوم بالذكاء الاصطناعي", "حقق أهدافك", "كل حاجة في مكان واحد". ' +
          'Always end the body with the link https://pulse.geddo.online on its own line. ' +
          'Return JSON: {"subject": "...", "body": "..."} where body uses \n for line breaks. ' +
          'The greeting must start with {name} as a placeholder for the recipient first name.',
      },
      { role: 'user', content: parsed.data.goal },
    ],
    { json: true, maxTokens: 400, temperature: 0.8 },
  );
  try {
    const draft = JSON.parse(raw);
    if (!draft.subject || !draft.body) throw new Error('bad shape');
    // Models sometimes answer with <br/> or stray tags despite the \n instruction.
    const body = String(draft.body)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .slice(0, 2000);
    res.json({ subject: String(draft.subject).slice(0, 150), body });
  } catch {
    res.status(502).json({ error: 'AI returned an unusable draft — try again' });
  }
});

adminRouter.post('/email/send', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      seg: z.enum(['inactive3', 'inactive7', 'nopush', 'all']),
      subject: z.string().min(3).max(150),
      body: z.string().min(10).max(2000),
      testTo: z.string().email().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Subject and body are required' });
  const { seg, subject, body, testTo } = parsed.data;

  const { sendMail } = await import('../lib/mailer');
  const { unsubToken } = await import('../lib/digest');

  const render = (firstName: string, userId: string | null) => {
    const text = body.replaceAll('{name}', firstName);
    const unsub = userId ? `${env.WEB_ORIGIN}/api/unsubscribe?u=${userId}&t=${unsubToken(userId)}` : '#';
    const html =
      `<div dir="rtl" style="font-family:sans-serif;line-height:1.7">` +
      text
        .split('\n')
        .map((l) =>
          l
            ? `<p style="margin:4px 0">${l.replace(
                'https://pulse.geddo.online',
                '<a href="https://pulse.geddo.online" style="color:#f97316;font-weight:bold">pulse.geddo.online</a>',
              )}</p>`
            : '',
        )
        .join('') +
      (userId ? `<p style="margin-top:20px;font-size:11px;color:#999"><a href="${unsub}" style="color:#999">إلغاء الاشتراك في رسائل التذكير</a></p>` : '') +
      `</div>`;
    return { text, html };
  };

  // Test send: one mail to the admin's chosen inbox, audience untouched.
  // Report the REAL outcome — this used to answer "sent ✅" even when SMTP
  // was never configured, so broken email looked healthy from the admin UI.
  if (testTo) {
    const { text, html } = render('يا بطل', null);
    const result = await sendMail({ to: testTo, subject, html, text });
    if (!result.ok) return res.status(502).json({ error: `Email NOT sent — ${result.reason}` });
    return res.json({ sent: 1, test: true });
  }

  const users = await prisma.user.findMany({
    where: audienceWhere(seg),
    orderBy: { lastSeenAt: 'desc' },
    take: EMAIL_SEND_CAP,
    select: { id: true, email: true, firstName: true },
  });
  let sent = 0;
  let failed = 0;
  for (const u of users) {
    const { text, html } = render(u.firstName, u.id);
    const result = await sendMail({ to: u.email, subject, html, text });
    if (result.ok) sent++;
    else {
      failed++;
      // Unconfigured SMTP fails identically for every recipient — stop after
      // the first one instead of "sending" to the whole audience.
      if (result.reason.includes('not configured')) {
        return res.status(502).json({ error: `Email NOT sent — ${result.reason}`, sent, failed: users.length - sent });
      }
    }
  }
  res.json({ sent, failed, capped: users.length === EMAIL_SEND_CAP });
});

/* ------------------------------------------------------------------ *
 * Challenge audit — is the winner real? Self-reported fitness data can
 * never be PROVEN, but cheating leaves fingerprints: impossible daily
 * volumes, burst logging, brand-new accounts, XP with no matching
 * activity. This surfaces those fingerprints so a human decides before
 * a prize is paid.
 * ------------------------------------------------------------------ */

adminRouter.get('/challenge-audit', async (_req, res) => {
  const list = await prisma.challenge.findMany({
    where: { kind: 'global' },
    orderBy: { endsOn: 'desc' },
    take: 30,
    include: { _count: { select: { participants: true } } },
  });
  res.json(list.map((c) => ({
    id: c.id, title: c.title, goalType: c.goalType, goalValue: c.goalValue,
    startsOn: c.startsOn, endsOn: c.endsOn, prizeText: c.prizeText,
    participants: c._count.participants,
  })));
});

adminRouter.get('/challenge-audit/:id', async (req, res) => {
  const ch = await prisma.challenge.findUnique({
    where: { id: req.params.id },
    include: { participants: { orderBy: { progress: 'desc' }, take: 10, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, xp: true } } } } },
  });
  if (!ch) return res.status(404).json({ error: 'Not found' });
  const winStart = new Date(`${ch.startsOn}T00:00:00Z`);
  const winEnd = new Date(`${ch.endsOn}T23:59:59Z`);

  const rows = await Promise.all(
    ch.participants.map(async (p) => {
      const u = p.user;
      const [xpEvents, calorieDays, workoutEvents, biggestEntry, entryCount, proofCount] = await Promise.all([
        prisma.xpEvent.findMany({ where: { userId: u.id, createdAt: { gte: winStart, lte: winEnd } }, select: { amount: true, createdAt: true, reason: true } }),
        prisma.calorieEntry.groupBy({ by: ['date'], where: { userId: u.id, date: { gte: ch.startsOn, lte: ch.endsOn } }, _sum: { calories: true }, _count: true }),
        prisma.xpEvent.findMany({ where: { userId: u.id, reason: { in: ['workout-session', 'workout-lesson'] }, createdAt: { gte: winStart, lte: winEnd } }, select: { createdAt: true } }),
        prisma.calorieEntry.findFirst({ where: { userId: u.id, date: { gte: ch.startsOn, lte: ch.endsOn } }, orderBy: { calories: 'desc' }, select: { calories: true, name: true } }),
        prisma.calorieEntry.count({ where: { userId: u.id, date: { gte: ch.startsOn, lte: ch.endsOn } } }),
        prisma.challengeMessage.count({ where: { challengeId: ch.id, userId: u.id, isProof: true } }),
      ]);

      // Per-day aggregates for the fingerprints.
      const xpByDay = new Map<string, number>();
      for (const e of xpEvents) {
        const d = e.createdAt.toISOString().slice(0, 10);
        xpByDay.set(d, (xpByDay.get(d) ?? 0) + e.amount);
      }
      const workoutsByDay = new Map<string, number>();
      for (const e of workoutEvents) {
        const d = e.createdAt.toISOString().slice(0, 10);
        workoutsByDay.set(d, (workoutsByDay.get(d) ?? 0) + 1);
      }
      const maxXpDay = Math.max(0, ...xpByDay.values());
      const maxWorkoutsDay = Math.max(0, ...workoutsByDay.values());
      const maxCalDay = Math.max(0, ...calorieDays.map((d) => d._sum.calories ?? 0));
      const maxEntriesDay = Math.max(0, ...calorieDays.map((d) => d._count));
      const accountAgeDays = Math.floor((Date.now() - u.createdAt.getTime()) / 86400000);
      const joinedAfterStart = u.createdAt > winStart;

      const flags: string[] = [];
      if (maxWorkoutsDay > 4) flags.push(`${maxWorkoutsDay} workouts in one day`);
      if (maxXpDay > 800) flags.push(`${maxXpDay} XP in one day`);
      if (maxCalDay > 8000) flags.push(`${maxCalDay} kcal logged in one day`);
      if (maxEntriesDay > 20) flags.push(`${maxEntriesDay} food entries in one day (burst logging)`);
      if (biggestEntry && biggestEntry.calories > 3000) flags.push(`single "${biggestEntry.name}" entry of ${biggestEntry.calories} kcal`);
      if (joinedAfterStart && accountAgeDays < 7) flags.push('account created after the challenge started');

      return {
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        progress: p.progress,
        accountAgeDays,
        totalXpInWindow: [...xpByDay.values()].reduce((a, b) => a + b, 0),
        maxXpDay,
        maxWorkoutsDay,
        maxCalDay,
        entryCount,
        proofCount,
        flags,
        suspicious: flags.length > 0,
      };
    }),
  );

  res.json({
    challenge: { id: ch.id, title: ch.title, goalType: ch.goalType, goalValue: ch.goalValue, startsOn: ch.startsOn, endsOn: ch.endsOn, prizeText: ch.prizeText },
    participants: rows,
  });
});
