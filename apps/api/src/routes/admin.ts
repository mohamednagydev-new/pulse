import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { processVideo } from '../lib/video';
import { buildTranslationPatch } from '../lib/translate';

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
const MODEL_FIELDS = new Map<string, Map<string, { type: string }>>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Map(
      m.fields
        .filter((f) => (f.kind === 'scalar' || f.kind === 'enum') && !f.isId && !['createdAt', 'updatedAt'].includes(f.name))
        .map((f) => [f.name, { type: f.type }]),
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
    if (value === null || value === '') { out[key] = null; continue; }
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

  // Tell them they have an answer — a reply nobody sees is not a reply.
  if (sendingReply && ticket.userId) {
    const u = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { preferredLang: true } }).catch(() => null);
    const ar = u?.preferredLang === 'ar';
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'general',
        title: ar ? 'رد على رسالتك' : 'Reply to your message',
        body: ticket.subject,
        url: '/support',
      },
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

  res.json({
    dau: dau.map((d) => ({ day: d.day, users: Number(d.users) })),
    funnel,
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

adminRouter.get('/users', async (req, res) => {
  // Capped: an unbounded findMany over every user eventually returns megabytes.
  const take = Math.min(Math.max(Number(req.query.take) || 500, 1), 2000);
  const q = String(req.query.q || '').trim();
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] }
      : {},
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, isCoach: true, coachVerified: true, coachFeatured: true, avatarUrl: true, xp: true, level: true, currentStreak: true, lastActiveOn: true },
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
