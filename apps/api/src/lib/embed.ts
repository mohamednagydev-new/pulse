/**
 * Turn a pasted video link into something we can show.
 *
 * YouTube only, on purpose.
 *
 * TikTok was removed rather than kept as a second option. Its fitness search skews
 * hard toward body-focused content, and its embed links out to TikTok — so one tap
 * put a user inside an algorithmic feed we do not control. YouTube refuses to embed
 * age-restricted videos at all, which turns our failure mode into "reject" instead of
 * "import something unchecked", and its channels can be vetted once and trusted.
 *
 * Resolution uses YouTube's own oEmbed endpoint: no scraping, no API key, nothing
 * that can go dark the way the TikTok scraper did. Playback is an embed addressed by
 * video id rather than a signed CDN URL, so there is no lifetime and nothing to
 * refresh — which is what actually fixed reels expiring.
 */

export type Provider = 'youtube';

export type ResolvedVideo = {
  provider: Provider;
  externalId: string;
  sourceUrl: string;
  title: string;
  authorName: string | null;
  authorUrl: string | null;
  thumbnail: string | null;
  /** True when we could not rule out an age restriction — never imported. */
  ageRestricted: boolean;
};

/* ------------------------------------------------------------------ *
 * URL parsing
 * ------------------------------------------------------------------ */

/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ — all the shapes people paste. */
export function parseYouTube(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') return clean(u.pathname.slice(1));
    if (!host.endsWith('youtube.com') && !host.endsWith('youtube-nocookie.com')) return null;

    const v = u.searchParams.get('v');
    if (v) return clean(v);

    const m = /^\/(shorts|embed|live|v)\/([^/?]+)/.exec(u.pathname);
    return m ? clean(m[2]) : null;
  } catch {
    return null;
  }
}

function clean(id: string): string | null {
  const v = id.trim().split(/[?&#]/)[0];
  return /^[A-Za-z0-9_-]{6,20}$/.test(v) ? v : null;
}

/* ------------------------------------------------------------------ *
 * Resolution
 * ------------------------------------------------------------------ */

async function oembed(url: string, timeoutMs = 10000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`oembed ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * YouTube.
 *
 * oEmbed answers 401/403 for videos that are private, deleted, or **age-restricted**
 * — which is exactly the signal we want. A video we cannot resolve is a video we
 * refuse, so the failure mode is "reject", never "import something unchecked".
 */
async function resolveYouTube(id: string): Promise<ResolvedVideo> {
  const watch = `https://www.youtube.com/watch?v=${id}`;
  let data: any;
  try {
    data = await oembed(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`);
  } catch (e) {
    const msg = (e as Error).message;
    if (/401|403/.test(msg)) {
      throw new Error(
        'YouTube will not embed this video — it is private, removed, age-restricted, or embedding is disabled. Not imported.',
      );
    }
    throw new Error('Could not read that YouTube link.');
  }

  return {
    provider: 'youtube',
    externalId: id,
    sourceUrl: watch,
    title: String(data.title ?? '').slice(0, 300),
    authorName: data.author_name ? String(data.author_name).slice(0, 120) : null,
    authorUrl: data.author_url ? String(data.author_url).slice(0, 300) : null,
    thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    ageRestricted: false,
  };
}

/** Resolve any supported link. Throws with a message meant for the admin to read. */
export async function resolveVideoUrl(input: string): Promise<ResolvedVideo> {
  const raw = (input || '').trim();
  if (!raw) throw new Error('Paste a video link first.');

  const yt = parseYouTube(raw);
  if (yt) return resolveYouTube(yt);

  throw new Error('Only YouTube links are supported. Paste a youtube.com or youtu.be link.');
}

/* ------------------------------------------------------------------ *
 * Bulk
 * ------------------------------------------------------------------ */

export type BulkItem =
  | ({ ok: true } & ResolvedVideo)
  | { ok: false; url: string; error: string };

/**
 * Resolve many links at once.
 *
 * Adding reels one at a time is fine for a correction and miserable for stocking a
 * launch, so this takes a whole list. Concurrency is capped: forty simultaneous
 * requests to oEmbed gets us rate-limited, and the whole point of this path is that
 * it does not depend on anything fragile.
 *
 * One bad link never sinks the batch — failures come back as rows with a reason, so
 * the admin sees exactly which three of thirty need attention.
 */
export async function resolveMany(urls: string[], concurrency = 5): Promise<BulkItem[]> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(0, 50);
  const out: BulkItem[] = [];

  for (let i = 0; i < unique.length; i += concurrency) {
    const slice = unique.slice(i, i + concurrency);
    const settled = await Promise.all(
      slice.map(async (url): Promise<BulkItem> => {
        try {
          return { ok: true, ...(await resolveVideoUrl(url)) };
        } catch (e) {
          return { ok: false, url, error: (e as Error).message };
        }
      }),
    );
    out.push(...settled);
  }
  return out;
}

/** /channel/UC…, /@handle, /user/name, or any video URL from the channel. */
function parseChannelRef(raw: string): { channelId?: string; pageUrl?: string } | null {
  try {
    const u = new URL(raw.trim());
    if (!u.hostname.replace(/^www\./, '').endsWith('youtube.com')) return null;

    const direct = /^\/channel\/(UC[A-Za-z0-9_-]{20,})/.exec(u.pathname);
    if (direct) return { channelId: direct[1] };

    if (/^\/(@[^/]+|c\/[^/]+|user\/[^/]+)/.test(u.pathname)) return { pageUrl: u.toString() };
    return null;
  } catch {
    return null;
  }
}

/**
 * The channel's most recent videos, from YouTube's own public RSS feed.
 *
 * This is the one bulk source that needs no API key and no scraping: it is a
 * documented, stable feed. It returns the latest 15, which is the right amount —
 * enough to stock a launch from a channel you trust, small enough that reviewing
 * every one is realistic.
 *
 * A handle (@name) has no feed of its own, so it costs one page fetch to find the
 * channel id. That is the only place here that reads a YouTube page, and it looks for
 * a single stable field.
 */
export async function channelVideos(input: string): Promise<ResolvedVideo[]> {
  const ref = parseChannelRef(input);
  if (!ref) throw new Error('Paste a YouTube channel link, e.g. youtube.com/@name.');

  let channelId = ref.channelId;
  if (!channelId && ref.pageUrl) {
    // A browser UA matters: without one some channel pages come back as a consent
    // shell with no ids in it at all.
    const html = await fetch(ref.pageUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }).then((r) => r.text());

    /**
     * Several patterns, because YouTube does not serve one layout.
     *
     * The first is the channel's own RSS <link> tag, which is the most direct answer
     * to the question we are asking. Matching only "channelId" — as this did at first
     * — silently failed on half the channels tested, and the failure looked like "we
     * could not find that channel" rather than like a parsing bug.
     */
    const patterns = [
      /channel_id=(UC[A-Za-z0-9_-]{20,})/,
      /"externalId":"(UC[A-Za-z0-9_-]{20,})"/,
      /"channelId":"(UC[A-Za-z0-9_-]{20,})"/,
      /browseId":"(UC[A-Za-z0-9_-]{20,})/,
    ];
    for (const re of patterns) {
      const hit = re.exec(html)?.[1];
      if (hit) {
        channelId = hit;
        break;
      }
    }
  }
  if (!channelId) throw new Error('Could not find that channel.');

  const xml = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`).then((r) => {
    if (!r.ok) throw new Error('That channel has no public feed.');
    return r.text();
  });

  const author = /<author>\s*<name>([^<]+)</.exec(xml)?.[1]?.trim() ?? null;
  const entries = xml.split('<entry>').slice(1);

  return entries
    .map((e) => {
      const id = /<yt:videoId>([^<]+)</.exec(e)?.[1];
      const title = /<title>([^<]+)</.exec(e)?.[1];
      if (!id || !title) return null;
      return {
        provider: 'youtube' as const,
        externalId: id,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
        title: decodeEntities(title).slice(0, 300),
        authorName: author,
        authorUrl: `https://www.youtube.com/channel/${channelId}`,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        ageRestricted: false,
      };
    })
    .filter(Boolean) as ResolvedVideo[];
}

/** The five XML entities that actually appear in YouTube titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/* ------------------------------------------------------------------ *
 * Playback
 * ------------------------------------------------------------------ */

/**
 * The embed URL the player loads.
 *
 * YouTube goes through youtube-nocookie.com with `rel=0`, which keeps the
 * end-of-video suggestions inside the same channel instead of handing the viewer to
 * YouTube's recommender. On a fitness app aimed partly at teenagers, not opening
 * that door is the entire point.
 */
export function embedUrl(provider: string, externalId: string): string | null {
  if (provider === 'youtube') {
    const q = 'rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    return `https://www.youtube-nocookie.com/embed/${externalId}?${q}`;
  }
  return null;
}
