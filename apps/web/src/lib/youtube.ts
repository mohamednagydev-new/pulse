import { API_BASE } from './api';

/** Video id from a watch URL, youtu.be link, Shorts link or embed URL. */
export function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

/**
 * YouTube embed via our own wrapper page (/yt.html) instead of embedding
 * youtube.com directly. Reason: the native app's internal origin
 * (capacitor://localhost) is rejected by YouTube's player — error 153 on
 * every video. The wrapper is served from pulse.geddo.online, so the player
 * always sees a real https origin. On the website API_BASE is '' and the
 * wrapper is same-origin — one code path everywhere.
 */
export function ytEmbedSrc(
  id: string,
  opts: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean } = {},
): string {
  const q = new URLSearchParams({ v: id });
  if (opts.autoplay) q.set('autoplay', '1');
  if (opts.mute) q.set('mute', '1');
  if (opts.loop) q.set('loop', '1');
  if (opts.controls === false) q.set('controls', '0');
  return `${API_BASE}/yt.html?${q.toString()}`;
}
