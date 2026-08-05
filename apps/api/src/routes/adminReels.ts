import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { resolveVideoUrl, resolveMany, channelVideos, embedUrl } from '../lib/embed';

export const adminReelsRouter = Router();
adminReelsRouter.use(requireAuth, requireAdmin);


/* ------------------------------------------------------------------ *
 * Paste a link.
 *
 * This replaces keyword search as the way reels get into the library, and it is a
 * better fit for how curation actually works here: reels are admin-approved, never
 * on-demand, so bulk search was always solving a problem we did not have. A human
 * finds a good video, pastes the link, and we read the title and creator from the
 * provider's own oEmbed endpoint.
 *
 * It also removes the dependency that broke: no scraper, no API key, no third-party
 * service. If this stops working, YouTube itself is down.
 * ------------------------------------------------------------------ */

/** Look up a pasted link without saving anything, so the admin sees what they are
 *  about to approve — title, creator, thumbnail — before they commit. */
adminReelsRouter.post('/resolve', async (req, res) => {
  const parsed = z.object({ url: z.string().min(8).max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Paste a video link.' });

  let video;
  try {
    video = await resolveVideoUrl(parsed.data.url);
  } catch (e) {
    return res.status(422).json({ error: (e as Error).message });
  }

  // A creator we have already refused stays refused, whatever the video looks like.
  const blocked = await blockedFor(video.provider, video.authorUrl, video.authorName);
  if (blocked) {
    return res.status(403).json({
      error: `${video.authorName ?? 'This creator'} is on the blocked list${blocked.reason ? ` — ${blocked.reason}` : ''}.`,
    });
  }

  const dupe = await prisma.curatedReel.findFirst({
    where: { provider: video.provider, externalId: video.externalId },
    select: { id: true },
  });

  res.json({ ...video, embedUrl: embedUrl(video.provider, video.externalId), alreadyImported: !!dupe });
});

/** Is this creator blocked? Matches on author URL or name, whichever we have. */
async function blockedFor(provider: string, authorUrl: string | null, authorName: string | null) {
  const handles = [authorUrl, authorName].filter(Boolean) as string[];
  if (handles.length === 0) return null;
  const rows = await prisma.blockedSource.findMany({ where: { provider } });
  return (
    rows.find((r) => handles.some((h) => h.toLowerCase().includes(r.handle.toLowerCase()))) ?? null
  );
}

/** Approve a pasted link into the library. */
adminReelsRouter.post('/add', async (req, res) => {
  const parsed = z
    .object({
      url: z.string().min(8).max(500),
      topic: z.enum(['workout', 'yoga']),
      title: z.string().max(300).optional(),
      titleAr: z.string().max(300).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  let video;
  try {
    video = await resolveVideoUrl(parsed.data.url);
  } catch (e) {
    return res.status(422).json({ error: (e as Error).message });
  }

  if (video.ageRestricted) {
    return res.status(422).json({ error: 'That video is age-restricted and cannot be added.' });
  }

  const blocked = await blockedFor(video.provider, video.authorUrl, video.authorName);
  if (blocked) return res.status(403).json({ error: 'That creator is on the blocked list.' });

  const dupe = await prisma.curatedReel.findFirst({
    where: { provider: video.provider, externalId: video.externalId },
  });
  if (dupe) return res.status(409).json({ error: 'Already in the library' });

  const reel = await prisma.curatedReel.create({
    data: {
      source: video.provider,
      provider: video.provider,
      externalId: video.externalId,
      sourceUrl: video.sourceUrl,
      authorName: video.authorName,
      authorUrl: video.authorUrl,
      topic: parsed.data.topic,
      title: parsed.data.title?.trim() || video.title,
      titleAr: parsed.data.titleAr,
      coverUrl: video.thumbnail,
    },
  });
  res.status(201).json({ ...reel, embedUrl: embedUrl(video.provider, video.externalId) });
});

/* ---- Bulk ---- */

/** Annotate resolved videos with everything the admin needs to decide: is this
 *  creator blocked, and is it already in the library. */
async function decorate(videos: Awaited<ReturnType<typeof channelVideos>>) {
  const ids = videos.map((v) => v.externalId);
  const existing = await prisma.curatedReel.findMany({
    where: { provider: 'youtube', externalId: { in: ids } },
    select: { externalId: true },
  });
  const have = new Set(existing.map((e) => e.externalId));
  const blocks = await prisma.blockedSource.findMany({ where: { provider: 'youtube' } });

  return videos.map((v) => {
    const hit = blocks.find((b) =>
      [v.authorUrl, v.authorName].filter(Boolean).some((h) => (h as string).toLowerCase().includes(b.handle.toLowerCase())),
    );
    return {
      ...v,
      embedUrl: embedUrl(v.provider, v.externalId),
      alreadyImported: have.has(v.externalId),
      blocked: !!hit,
      blockedReason: hit?.reason ?? null,
    };
  });
}

/** Paste a list of links — one per line. Nothing is saved; this is the review step. */
adminReelsRouter.post('/bulk-resolve', async (req, res) => {
  const parsed = z.object({ urls: z.array(z.string()).min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Paste one link per line.' });

  const results = await resolveMany(parsed.data.urls);
  const ok = results.filter((r): r is Extract<typeof r, { ok: true }> => r.ok);
  const failed = results.filter((r) => !r.ok);

  res.json({ videos: await decorate(ok), failed });
});

/** Pull a trusted channel's latest videos from YouTube's public RSS feed.
 *  No API key: this is the only bulk source that needs neither a key nor scraping. */
adminReelsRouter.post('/channel', async (req, res) => {
  const parsed = z.object({ url: z.string().min(8).max(300) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Paste a channel link.' });

  let videos;
  try {
    videos = await channelVideos(parsed.data.url);
  } catch (e) {
    return res.status(422).json({ error: (e as Error).message });
  }
  if (videos.length === 0) return res.status(422).json({ error: 'That channel has no recent videos.' });

  res.json({ videos: await decorate(videos), failed: [] });
});

/** Approve a reviewed batch. Each item was already resolved, so this trusts the
 *  externalId rather than re-fetching thirty times — but it still refuses anything
 *  blocked or duplicated, because the library is the last line of defence. */
adminReelsRouter.post('/bulk-add', async (req, res) => {
  const parsed = z
    .object({
      items: z
        .array(
          z.object({
            externalId: z.string().min(5).max(20),
            title: z.string().min(1).max(300),
            topic: z.enum(['workout', 'yoga']),
            sourceUrl: z.string().max(300).optional(),
            authorName: z.string().max(120).nullable().optional(),
            authorUrl: z.string().max(300).nullable().optional(),
            thumbnail: z.string().max(400).nullable().optional(),
          }),
        )
        .min(1)
        .max(50),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid batch' });

  const blocks = await prisma.blockedSource.findMany({ where: { provider: 'youtube' } });
  const isBlocked = (a?: string | null, b?: string | null) =>
    blocks.some((x) => [a, b].filter(Boolean).some((h) => (h as string).toLowerCase().includes(x.handle.toLowerCase())));

  let added = 0;
  let skipped = 0;

  for (const it of parsed.data.items) {
    if (isBlocked(it.authorUrl, it.authorName)) {
      skipped++;
      continue;
    }
    const dupe = await prisma.curatedReel.findFirst({
      where: { provider: 'youtube', externalId: it.externalId },
      select: { id: true },
    });
    if (dupe) {
      skipped++;
      continue;
    }
    await prisma.curatedReel.create({
      data: {
        source: 'youtube',
        provider: 'youtube',
        externalId: it.externalId,
        sourceUrl: it.sourceUrl ?? `https://www.youtube.com/watch?v=${it.externalId}`,
        authorName: it.authorName ?? null,
        authorUrl: it.authorUrl ?? null,
        topic: it.topic,
        title: it.title.trim(),
        coverUrl: it.thumbnail ?? `https://img.youtube.com/vi/${it.externalId}/hqdefault.jpg`,
      },
    });
    added++;
  }

  res.status(201).json({ added, skipped });
});

/* ---- Blocked creators ---- */

adminReelsRouter.get('/blocked', async (_req, res) => {
  res.json(await prisma.blockedSource.findMany({ orderBy: { createdAt: 'desc' } }));
});

adminReelsRouter.post('/blocked', async (req, res) => {
  const parsed = z
    .object({
      provider: z.literal('youtube'),
      handle: z.string().min(2).max(300),
      reason: z.string().max(300).optional(),
      /** Also pull anything already imported from this creator. */
      purge: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { provider, handle, reason, purge } = parsed.data;

  const row = await prisma.blockedSource.upsert({
    where: { provider_handle: { provider, handle } },
    create: { provider, handle, reason },
    update: { reason },
  });

  let removed = 0;
  if (purge) {
    // Blocking a creator you already imported from should not leave their videos up.
    const mine = await prisma.curatedReel.findMany({ where: { provider } });
    const hit = mine.filter((r) =>
      [r.authorUrl, r.authorName].filter(Boolean).some((h) => (h as string).toLowerCase().includes(handle.toLowerCase())),
    );
    if (hit.length) {
      await prisma.curatedReel.deleteMany({ where: { id: { in: hit.map((h) => h.id) } } });
      removed = hit.length;
    }
  }

  res.status(201).json({ ...row, removed });
});

adminReelsRouter.delete('/blocked/:id', async (req, res) => {
  await prisma.blockedSource.deleteMany({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/** Library management. URL-mode reels get a `resolvable` flag: can we currently
 *  re-find this video under its keyword? (Downloaded reels are always resolvable.) */
adminReelsRouter.get('/', async (_req, res) => {
  // Everything in the library is either a local upload or a provider embed, and both
  // resolve by id — so there is no longer such a thing as an unresolvable reel.
  const reels = await prisma.curatedReel.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  res.json(reels.map((r) => ({ ...r, resolvable: true })));
});

adminReelsRouter.patch('/:id', async (req, res) => {
  const parsed = z
    .object({
      title: z.string().min(1).max(300).optional(),
      titleAr: z.string().max(300).optional(),
      topic: z.enum(['workout', 'yoga']).optional(),
      keyword: z.string().max(60).optional(),
      active: z.boolean().optional(),
      order: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const reel = await prisma.curatedReel.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(reel);
});

adminReelsRouter.delete('/:id', async (req, res) => {
  const reel = await prisma.curatedReel.findUnique({ where: { id: req.params.id } });
  if (!reel) return res.status(404).json({ error: 'Not found' });
  await prisma.reelFavorite.deleteMany({ where: { key: reel.id } });
  await prisma.curatedReel.delete({ where: { id: reel.id } });
  // Best-effort file cleanup (downloaded reels only).
  const video = reel.videoId ? await prisma.video.findUnique({ where: { id: reel.videoId } }) : null;
  if (video) {
    fs.unlink(path.join(env.UPLOAD_DIR, video.filePath), () => {});
    if (video.thumbnailPath) fs.unlink(path.join(env.UPLOAD_DIR, video.thumbnailPath), () => {});
    await prisma.video.delete({ where: { id: video.id } }).catch(() => {});
  }
  if (reel.poster) fs.unlink(path.join(env.UPLOAD_DIR, reel.poster), () => {});
  res.json({ ok: true });
});

/** Community moderation: recent posts (incl. user reels) + delete. */
adminReelsRouter.get('/posts', async (req, res) => {
  const kind = String(req.query.kind || '');
  const posts = await prisma.feedPost.findMany({
    where: kind ? { kind } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  res.json(posts);
});

adminReelsRouter.delete('/posts/:id', async (req, res) => {
  await prisma.postReaction.deleteMany({ where: { postId: req.params.id } });
  await prisma.postComment.deleteMany({ where: { postId: req.params.id } });
  await prisma.reelFavorite.deleteMany({ where: { key: req.params.id } });
  const gone = await prisma.feedPost.deleteMany({ where: { id: req.params.id } });
  if (!gone.count) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
