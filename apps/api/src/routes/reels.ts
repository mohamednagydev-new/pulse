import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { createFeedPost, bumpChallenges } from '../lib/social';
import { pickLang } from '../lib/localize';
import { embedUrl } from '../lib/embed';

export const reelsRouter = Router();
reelsRouter.use(requireAuth);

/* ------------------------------------------------------------------------- *
 * Users only ever see the admin-approved CuratedReel library plus community posts.
 *
 * The TikTok keyword scraper that used to feed this is gone. It broke whenever
 * TikTok changed, it handed back signed CDN URLs that expired within hours, and its
 * search skewed toward content we would not want a teenager landing on. Reels are
 * now added one at a time by pasting a YouTube link, and played as embeds that have
 * no lifetime at all.
 * ------------------------------------------------------------------------- */

const TOPICS = ['workout', 'yoga'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;

type CuratedRow = {
  id: string;
  provider: string;
  externalId: string | null;
  sourceUrl: string | null;
  authorName: string | null;
  keyword: string | null;
  title: string;
  titleAr: string | null;
  topic: string;
  videoId: string | null;
  poster: string | null;
  coverUrl: string | null;
};

/** Shape one curated reel for the client.
 *  Downloaded reels play from our storage; URL-mode reels get a serve-time-fresh link. */
function shapeCurated(r: CuratedRow, lang: string, favSet: Set<string>) {
  const title = lang === 'ar' && r.titleAr ? r.titleAr : r.title;
  if (r.videoId) {
    return {
      id: r.id,
      key: r.id,
      source: 'curated' as const,
      title,
      videoId: r.videoId, // resolve via /api/me/media-sign on the client
      poster: r.poster,
      topic: r.topic,
      isFavorite: favSet.has(r.id),
    };
  }
  /**
   * Embed, not a direct file.
   *
   * The old path handed the client a signed CDN URL that TikTok expires within hours,
   * so reels went dead and the app showed a "this expired" card. An embed is
   * addressed by video id and has no lifetime at all — there is nothing left to
   * refresh, and nothing left to expire.
   */
  const embed = r.externalId ? embedUrl(r.provider, r.externalId) : null;
  return {
    id: r.id,
    key: r.id,
    source: 'embed' as const,
    provider: r.provider,
    title,
    embedUrl: embed,
    sourceUrl: r.sourceUrl,
    authorName: r.authorName,
    coverUrl: r.coverUrl || undefined,
    topic: r.topic,
    isFavorite: favSet.has(r.id),
  };
}

/** Topic affinity from watch history (explore/exploit weighting across the two topics). */
async function topicWeights(userId: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 30 * 86400000);
  const watches = await prisma.reelWatch.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { topic: true, watchedSec: true, completed: true },
  });
  const score = new Map<string, number>();
  for (const w of watches) score.set(w.topic, (score.get(w.topic) ?? 0) + w.watchedSec + (w.completed ? 15 : 0));
  return score;
}

// Feed: admin-approved curated reels + community posts. Shuffled per request.
// topic=workout|yoga filters; foryou mixes both, biased by watch affinity.
reelsRouter.get('/', async (req: AuthedRequest, res) => {
  const topic = String(req.query.topic || 'foryou');
  if (topic !== 'foryou' && !TOPICS.includes(topic)) return res.status(400).json({ error: 'Unknown topic' });
  const lang = pickLang(req);
  const topics = topic === 'foryou' ? TOPICS : [topic];

  const [curated, community, favs] = await Promise.all([
    prisma.curatedReel.findMany({ where: { active: true, topic: { in: topics } }, orderBy: { order: 'asc' }, take: 120 }),
    prisma.feedPost.findMany({
      where: { kind: 'reel', refId: { in: topics }, mediaType: 'video' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: userSelect } },
    }),
    prisma.reelFavorite.findMany({ where: { userId: req.userId! }, select: { key: true } }),
  ]);
  const favSet = new Set(favs.map((f) => f.key));
  let curatedShaped = curated.map((r) => shapeCurated(r, lang, favSet));
  if (topic === 'foryou' && curatedShaped.length > 8) {
    // Bias the mix toward the user's preferred topic while keeping variety.
    const w = await topicWeights(req.userId!);
    const a = curatedShaped.filter((r) => r.topic === 'workout');
    const b = curatedShaped.filter((r) => r.topic === 'yoga');
    const wa = (w.get('workout') ?? 0) + 1;
    const wb = (w.get('yoga') ?? 0) + 1;
    const total = Math.min(curatedShaped.length, 40);
    const na = Math.max(3, Math.round((total * wa) / (wa + wb)));
    curatedShaped = [...shuffle(a).slice(0, na), ...shuffle(b).slice(0, Math.max(3, total - na))];
  }

  const items = shuffle([
    ...community.map((p) => ({
      id: p.id,
      key: p.id,
      source: 'community' as const,
      title: p.text ?? '',
      videoId: p.mediaUrl,
      topic: p.refId,
      user: p.user,
      isFavorite: favSet.has(p.id),
      createdAt: p.createdAt,
    })),
    ...curatedShaped,
  ]);
  res.json({ topic, reels: items });
});

// Related reels for content pages — served ONLY from the approved library.
// Matches the query against curated keyword/title/topic.
reelsRouter.get('/related', async (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return res.json({ reels: [] });
  const lang = pickLang(req);
  const tokens = q.split(/\s+/).filter((t) => t.length >= 3).slice(0, 4);

  const all = await prisma.curatedReel.findMany({ where: { active: true }, take: 300 });
  const scored = all
    .map((r) => {
      const hay = `${r.keyword ?? ''} ${r.title} ${r.titleAr ?? ''} ${r.topic}`.toLowerCase();
      let s = 0;
      if (r.keyword && q.includes(r.keyword.toLowerCase())) s += 3;
      for (const tk of tokens) if (hay.includes(tk)) s += 1;
      if (q.includes(r.topic)) s += 1;
      return { r, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12);

  // Fall back to the reel's topic pool when nothing matches textually.
  const pool = scored.length
    ? scored.map((x) => x.r)
    : all.filter((r) => (q.includes('yoga') || q.includes('يوجا') ? r.topic === 'yoga' : r.topic === 'workout'));

  const picked = shuffle(pool).slice(0, 6);
  res.json({ reels: picked.map((r) => shapeCurated(r, lang, new Set())) });
});

/** My saved reels.
 *
 *  Favourites saved before curation existed were TikTok snapshots holding a signed
 *  URL that has long since expired. They are dropped rather than rendered: a card
 *  that can never play again is not a saved reel, it is a broken one, and leaving it
 *  in the list makes the whole screen look faulty. */
reelsRouter.get('/favorites', async (req: AuthedRequest, res) => {
  const lang = pickLang(req);
  const favs = await prisma.reelFavorite.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } });
  const curatedIds = favs.filter((f) => f.source === 'curated').map((f) => f.key);
  const communityIds = favs.filter((f) => f.source === 'community').map((f) => f.key);
  const [curated, posts] = await Promise.all([
    curatedIds.length ? prisma.curatedReel.findMany({ where: { id: { in: curatedIds }, active: true } }) : [],
    communityIds.length ? prisma.feedPost.findMany({ where: { id: { in: communityIds } }, include: { user: { select: userSelect } } }) : [],
  ]);
  const cmap = new Map(curated.map((c) => [c.id, c]));
  const pmap = new Map(posts.map((p) => [p.id, p]));
  res.json({
    reels: favs
      .map((f) => {
        if (f.source === 'curated') {
          const c = cmap.get(f.key);
          return c ? { ...shapeCurated(c, lang, new Set([c.id])), isFavorite: true } : null;
        }
        if (f.source === 'community') {
          const p = pmap.get(f.key);
          if (!p) return null;
          return { id: p.id, key: f.key, source: 'community' as const, title: p.text ?? '', videoId: p.mediaUrl, user: p.user, isFavorite: true };
        }
        // Legacy TikTok snapshot — the URL is dead and there is nothing to play.
        return null;
      })
      .filter(Boolean),
  });
});

// Toggle favorite (curated or community).
reelsRouter.post('/favorite', async (req: AuthedRequest, res) => {
  const parsed = z
    // 'tiktok' is still accepted so a cached old bundle can still *un*-favourite a
    // legacy row rather than getting a 400 it cannot recover from.
    .object({ key: z.string().min(1), source: z.enum(['curated', 'community', 'tiktok']), topic: z.string().optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid reel' });
  const { key, source, topic } = parsed.data;
  const existing = await prisma.reelFavorite.findUnique({ where: { userId_key: { userId: req.userId!, key } } });
  if (existing) {
    await prisma.reelFavorite.delete({ where: { id: existing.id } });
    return res.json({ favorite: false });
  }
  await prisma.reelFavorite.create({ data: { userId: req.userId!, key, source, topic } });
  res.json({ favorite: true });
});

// Watch telemetry (fired by the client when a reel leaves view). Powers "For You".
reelsRouter.post('/watch', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      key: z.string().min(1),
      topic: z.string().min(1).max(60),
      watchedSec: z.number().int().min(1).max(3600),
      completed: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid watch event' });
  await prisma.reelWatch.create({
    data: {
      userId: req.userId!,
      key: parsed.data.key,
      topic: parsed.data.topic.toLowerCase(),
      watchedSec: parsed.data.watchedSec,
      completed: parsed.data.completed ?? false,
    },
  });
  await bumpChallenges(req.userId!, 'calorie').catch(() => {}); // reels challenges advance on the watch
  res.json({ ok: true });
});

// Publish a user reel (video uploaded first via POST /api/social/upload).
// Community reels are user-generated; admins can remove them in the moderation screen.
reelsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({ topic: z.enum(['workout', 'yoga']), mediaUrl: z.string().min(1), text: z.string().max(300).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Upload a video and pick a topic' });
  // Must reference a real uploaded video row, not an arbitrary string.
  const vid = await prisma.video.findUnique({ where: { id: parsed.data.mediaUrl }, select: { id: true } });
  if (!vid) return res.status(400).json({ error: 'Upload the video first' });
  const post = await createFeedPost(req.userId!, 'reel', parsed.data.text, 'reel', parsed.data.topic, {
    mediaType: 'video',
    mediaUrl: parsed.data.mediaUrl,
  });
  res.status(201).json({ ok: true, id: post.id });
});
