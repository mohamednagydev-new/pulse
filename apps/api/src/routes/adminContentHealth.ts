import { Router } from 'express';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { audit } from '../lib/audit';
import { resolveVideoUrl } from '../lib/embed';

/**
 * Content health: the broken-video list the weekly sweep produces, plus the
 * levers to act on it — re-run the sweep now, relink a video to a working URL,
 * ignore a known case, or pull a dead reel out of the feed.
 */
export const adminContentHealthRouter = Router();
adminContentHealthRouter.use(requireAuth, requireAdmin);

/** Open issues (newest first) + the last 20 resolved/ignored for context. */
adminContentHealthRouter.get('/issues', async (_req, res) => {
  const [open, recent] = await Promise.all([
    prisma.contentIssue.findMany({ where: { status: 'open' }, orderBy: { detectedAt: 'desc' } }),
    prisma.contentIssue.findMany({
      where: { status: { in: ['resolved', 'ignored'] } },
      orderBy: { detectedAt: 'desc' },
      take: 20,
    }),
  ]);
  res.json({ open, recent });
});

/** Run the sweep on demand instead of waiting for the weekly job. */
adminContentHealthRouter.post('/sweep-now', async (req: AuthedRequest, res) => {
  const { sweepVideos } = await import('../lib/videoHealth');
  const summary = await sweepVideos();
  audit(req.userId!, 'content.sweep', { detail: summary });
  await prisma.jobLog.create({ data: { name: 'video-sweep', manual: true, note: summary } });
  res.json({ note: summary });
});

/** Ignore: "we know, stop reporting it" — the sweep never resurrects these. */
adminContentHealthRouter.post('/issues/:id/ignore', async (req: AuthedRequest, res) => {
  const issue = await prisma.contentIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  await prisma.contentIssue.update({ where: { id: issue.id }, data: { status: 'ignored' } });
  res.json({ ok: true });
});

adminContentHealthRouter.post('/issues/:id/reopen', async (req: AuthedRequest, res) => {
  const issue = await prisma.contentIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  await prisma.contentIssue.update({ where: { id: issue.id }, data: { status: 'open' } });
  res.json({ ok: true });
});

/**
 * Relink: point the content at a working YouTube URL. The URL is verified via
 * oEmbed before anything is written — a relink can never swap one broken video
 * for another.
 */
adminContentHealthRouter.post('/issues/:id/relink', async (req: AuthedRequest, res) => {
  const issue = await prisma.contentIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const url = String(req.body?.url ?? '').trim();
  let resolved;
  try {
    resolved = await resolveVideoUrl(url);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
  if (resolved.ageRestricted) {
    return res.status(400).json({ error: 'That video is age-restricted and cannot be embedded.' });
  }

  if (issue.kind === 'lesson-video') {
    await prisma.lesson.update({ where: { id: issue.refId }, data: { videoUrl: resolved.sourceUrl } });
  } else if (issue.kind === 'reel-video') {
    // externalId + sourceUrl only — the curated title stays as the admin wrote it.
    await prisma.curatedReel.update({
      where: { id: issue.refId },
      data: { externalId: resolved.externalId, sourceUrl: resolved.sourceUrl },
    });
  } else {
    return res.status(400).json({ error: 'Unknown issue kind' });
  }

  await prisma.contentIssue.update({ where: { id: issue.id }, data: { status: 'resolved' } });
  audit(req.userId!, 'content.relink', { targetType: issue.kind, targetId: issue.refId, detail: resolved.sourceUrl });
  res.json({ ok: true });
});

/** Pull a dead reel out of the feed entirely. */
adminContentHealthRouter.post('/issues/:id/deactivate', async (req: AuthedRequest, res) => {
  const issue = await prisma.contentIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  if (issue.kind !== 'reel-video') {
    return res.status(400).json({ error: 'Only reels can be deactivated from here' });
  }
  await prisma.curatedReel.update({ where: { id: issue.refId }, data: { active: false } });
  await prisma.contentIssue.update({ where: { id: issue.id }, data: { status: 'resolved' } });
  audit(req.userId!, 'content.deactivate', { targetType: issue.kind, targetId: issue.refId });
  res.json({ ok: true });
});
