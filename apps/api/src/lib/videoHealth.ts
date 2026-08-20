import { prisma } from './prisma';
import { parseYouTube } from './embed';

/**
 * Weekly broken-video sweep.
 *
 * Every externally embedded YouTube video — lesson links and curated reels —
 * is verified against YouTube's oEmbed endpoint. A 200 means the video still
 * plays; 401/403/404 means it is private, removed, or age-restricted, and a
 * ContentIssue row is opened for the admin. Network hiccups are skipped, never
 * flagged: a transient timeout must not page anyone about a healthy video.
 *
 * Locally hosted videos (videoId set) need no check — we serve those ourselves.
 */

type Candidate = {
  kind: 'lesson-video' | 'reel-video';
  refId: string;
  title: string | null;
  url: string;
  externalId: string;
};

const MAX_CHECKS_PER_RUN = 400;
const DELAY_MS = 250; // be polite to YouTube's oEmbed
const TIMEOUT_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 'ok' = plays, 'broken' = oEmbed said no (status attached), 'skip' = transient. */
async function checkOEmbed(externalId: string): Promise<{ verdict: 'ok' | 'broken' | 'skip'; status?: number }> {
  const watch = `https://www.youtube.com/watch?v=${externalId}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
      { signal: ctrl.signal },
    );
    if (res.ok) return { verdict: 'ok' };
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { verdict: 'broken', status: res.status };
    }
    // 429 / 5xx / anything else: not a verdict about the video.
    return { verdict: 'skip' };
  } catch {
    // Timeout or network error — transient, never flag.
    return { verdict: 'skip' };
  } finally {
    clearTimeout(t);
  }
}

async function collectCandidates(): Promise<Candidate[]> {
  const out: Candidate[] = [];

  // Lessons with an external link and no locally hosted file. Only YouTube
  // links are checkable via oEmbed — direct MP4s and anything else are skipped.
  const lessons = await prisma.lesson.findMany({
    where: { videoUrl: { not: null }, videoId: null },
    select: { id: true, title: true, videoUrl: true },
  });
  for (const l of lessons) {
    const id = parseYouTube(l.videoUrl!);
    if (!id) continue;
    out.push({ kind: 'lesson-video', refId: l.id, title: l.title, url: l.videoUrl!, externalId: id });
  }

  // Active YouTube reels served by embed (no local copy on our server).
  const reels = await prisma.curatedReel.findMany({
    where: { active: true, provider: 'youtube', externalId: { not: null }, videoId: null },
    select: { id: true, title: true, externalId: true, sourceUrl: true },
  });
  for (const r of reels) {
    out.push({
      kind: 'reel-video',
      refId: r.id,
      title: r.title,
      url: r.sourceUrl ?? `https://www.youtube.com/watch?v=${r.externalId}`,
      externalId: r.externalId!,
    });
  }

  return out;
}

/** Run the sweep. Returns a human-readable summary, e.g. "checked 137, broken 3, healed 1". */
export async function sweepVideos(): Promise<string> {
  const candidates = (await collectCandidates()).slice(0, MAX_CHECKS_PER_RUN);

  let checked = 0;
  let broken = 0;
  let healed = 0;

  for (const c of candidates) {
    if (checked > 0) await sleep(DELAY_MS);
    const { verdict, status } = await checkOEmbed(c.externalId);
    checked++;

    if (verdict === 'skip') continue;

    if (verdict === 'broken') {
      broken++;
      const note = `oembed ${status}`;
      const existing = await prisma.contentIssue.findUnique({
        where: { kind_refId: { kind: c.kind, refId: c.refId } },
      });
      if (!existing) {
        await prisma.contentIssue.create({
          data: { kind: c.kind, refId: c.refId, title: c.title, url: c.url, note },
        });
      } else if (existing.status !== 'ignored') {
        // Never resurrect an issue the admin chose to ignore.
        await prisma.contentIssue.update({
          where: { id: existing.id },
          data: { status: 'open', note, title: c.title, url: c.url },
        });
      }
    } else {
      // Healthy — close a previously open issue (the video came back).
      const { count } = await prisma.contentIssue.updateMany({
        where: { kind: c.kind, refId: c.refId, status: 'open' },
        data: { status: 'resolved' },
      });
      if (count > 0) healed++;
    }
  }

  return `checked ${checked}, broken ${broken}, healed ${healed}`;
}
