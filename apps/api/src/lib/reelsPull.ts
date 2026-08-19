import { prisma } from './prisma';
import { channelVideos, resolveVideoUrl } from './embed';

/**
 * Scheduled reels intake: pull the newest uploads from a configured list of
 * YouTube channels and stage them for review.
 *
 * REELS_CHANNELS env: comma-separated channel links, each optionally suffixed
 * with |topic (workout | yoga), e.g.
 *   REELS_CHANNELS=youtube.com/@ATHLEANX|workout,youtube.com/@yogawithadriene|yoga
 *
 * Every candidate goes through resolveVideoUrl — the same oEmbed verification
 * the manual admin import uses — so age-restricted or non-embeddable videos
 * never enter the library. New rows land with active:false: the job fills the
 * inbox, a human decides what teenagers get to see (same philosophy as the
 * manual curation flow — approval is a decision about a creator).
 */

const MAX_PER_CHANNEL = 5; // per run — the feed needs a trickle, not a flood

function parseChannelsEnv(): { channel: string; topic: string }[] {
  return (process.env.REELS_CHANNELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [channel, topic] = entry.split('|').map((s) => s.trim());
      return { channel, topic: topic === 'yoga' ? 'yoga' : 'workout' };
    });
}

export async function pullReels(): Promise<{ added: number; skipped: number }> {
  const channels = parseChannelsEnv();
  if (!channels.length) return { added: 0, skipped: 0 }; // not configured — nothing to do

  const blocked = await prisma.blockedSource.findMany({ select: { handle: true } });
  const blockedHandles = blocked.map((b) => b.handle.toLowerCase());
  const isBlocked = (authorUrl: string | null, authorName: string | null) =>
    blockedHandles.some(
      (h) => (authorUrl && authorUrl.toLowerCase().includes(h)) || (authorName && authorName.toLowerCase() === h),
    );

  let added = 0;
  let skipped = 0;
  for (const { channel, topic } of channels) {
    let videos;
    try {
      videos = await channelVideos(channel);
    } catch (e: any) {
      console.warn(`[reels-pull] ${channel}: ${e?.message}`);
      continue;
    }
    let addedHere = 0;
    for (const v of videos) {
      if (addedHere >= MAX_PER_CHANNEL) break;
      if (isBlocked(v.authorUrl, v.authorName)) { skipped++; continue; }
      const dupe = await prisma.curatedReel.findFirst({
        where: { provider: 'youtube', externalId: v.externalId },
        select: { id: true },
      });
      if (dupe) { skipped++; continue; }
      // Full oEmbed verification — RSS alone can't tell us a video is
      // age-restricted or embed-blocked, and we never import unchecked.
      let verified;
      try {
        verified = await resolveVideoUrl(v.sourceUrl);
      } catch {
        skipped++;
        continue;
      }
      if (verified.ageRestricted) { skipped++; continue; }
      await prisma.curatedReel.create({
        data: {
          source: 'youtube',
          provider: 'youtube',
          externalId: verified.externalId,
          sourceUrl: verified.sourceUrl,
          authorName: verified.authorName ?? v.authorName,
          authorUrl: verified.authorUrl ?? v.authorUrl,
          topic,
          title: verified.title || v.title,
          coverUrl: verified.thumbnail ?? v.thumbnail,
          active: false, // staged for admin approval, never live unreviewed
        },
      });
      added++;
      addedHere++;
    }
  }
  if (added) console.log(`[reels-pull] staged ${added} new reel(s) for review (${skipped} skipped)`);
  return { added, skipped };
}
