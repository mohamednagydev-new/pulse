import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Share2, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useSignedMedia } from '../lib/media';
import { toast } from '../lib/toast';
import { MediaImage } from './ui';

export type Reel =
  | {
      id: string;
      key: string;
      isFavorite: boolean;
      source: 'curated';
      topic?: string | null;
      title: string;
      videoId: string;
      poster?: string | null;
    }
  | {
      id: string;
      key: string;
      isFavorite: boolean;
      source: 'community';
      topic?: string | null;
      title: string;
      videoId: string;
      user: { id: string; firstName: string; lastName?: string | null; avatarUrl?: string | null; level?: string | null };
      createdAt: string;
    }
  | {
      /** A YouTube player addressed by video id, so there is no signed URL and
       *  nothing that can expire. */
      id: string;
      key: string;
      isFavorite: boolean;
      source: 'embed';
      provider: 'youtube';
      topic?: string | null;
      title: string;
      embedUrl: string;
      sourceUrl?: string | null;
      authorName?: string | null;
      coverUrl?: string | null;
    };

/** Build a poster URL from a local image path (same normalization as MediaImage). */
const posterSrc = (p: string) =>
  p.startsWith('http') || p.startsWith('/media') ? p : `/media/image/${p.replace(/^images\//, '')}`;

/** One full-screen snap slide. Autoplays when ≥60% visible, pauses otherwise. */
export default function ReelVideo({
  reel,
  muted,
  onToggleMute,
  onToggleFavorite,
}: {
  reel: Reel;
  muted: boolean;
  onToggleMute: () => void;
  onToggleFavorite: () => void;
}) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  // --- Watch-time telemetry (no UI impact) ---------------------------------
  // Accumulated seconds actually watched, completion flag, and the last
  // currentTime seen (for timeupdate deltas). All refs so renders are untouched.
  const watchSecRef = useRef(0);
  const completedRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const reelRef = useRef(reel);
  reelRef.current = reel;

  /** Report the accumulated viewing once, then reset so a re-view starts fresh.
   *  Resetting BEFORE the async send guards against double-fire (e.g. observer
   *  switch-away followed by unmount). Fire-and-forget: errors are swallowed. */
  const flushRef = useRef<() => void>(() => {});
  flushRef.current = () => {
    const watchedSec = Math.round(watchSecRef.current);
    const completed = completedRef.current;
    watchSecRef.current = 0;
    completedRef.current = false;
    lastTimeRef.current = null;
    const r = reelRef.current;
    const topic = r.topic ?? undefined;
    if (watchedSec < 2 || !topic) return;
    api.post('/api/reels/watch', { key: r.key, topic, watchedSec, completed }).catch(() => {});
  };

  /** Count playback via timeupdate deltas — only while this reel is the active
   *  slide, the video is playing, and the page is visible. Also detects a
   *  completed loop (near the end → wrapped back near the start). */
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const last = lastTimeRef.current;
    lastTimeRef.current = t;
    if (last == null) return;
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    // Loop wrap: we were ≥90% through and jumped back toward the start.
    if (dur > 0 && last >= dur * 0.9 && t < last - dur * 0.5) completedRef.current = true;
    const delta = t - last;
    // Ignore seeks/resets (negative or implausibly large jumps) and any time
    // when we're not the active, playing, foreground reel.
    if (delta > 0 && delta < 1.5 && active && !v.paused && !document.hidden) {
      watchSecRef.current += delta;
      if (dur > 0 && t >= dur * 0.9) completedRef.current = true;
    }
  };

  // Flush when this reel stops being the active slide (fires with active=false
  // on mount too, which is a harmless no-op since nothing has accumulated).
  useEffect(() => {
    if (!active) flushRef.current();
  }, [active]);

  // Flush when the page is hidden/left, and on unmount.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) flushRef.current();
    };
    const onPageHide = () => flushRef.current();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      flushRef.current();
    };
  }, []);
  // -------------------------------------------------------------------------

  // Curated + community videos are local files that need a signed URL; legacy
  // TikTok favorites are direct MP4s. Embeds use neither — they are handled by their
  // own branch below, before any of this runs.
  // Curated and community reels are local files behind a signed URL. Embeds need
  // neither — they are handled by their own branch below, before any of this runs.
  const localVideoId =
    reel.source === 'curated' || reel.source === 'community' ? reel.videoId : undefined;
  const src = useSignedMedia('video', localVideoId);
  const poster =
    reel.source === 'embed'
      ? reel.coverUrl ?? undefined
      : reel.source === 'curated' && reel.poster
        ? posterSrc(reel.poster)
        : undefined;

  // Autoplay the reel currently in view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src || failed) return;
    if (active && !userPaused) {
      v.play().catch(() => {});
    } else {
      v.pause();
      if (!active) {
        v.currentTime = 0;
        setUserPaused(false);
      }
    }
  }, [active, userPaused, src, failed]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !src) return;
    setUserPaused((p) => !p);
  };

  const share = async () => {
    // Share the creator's own page for embeds, so credit goes where it belongs;
    // everything else shares our feed.
    const url =
      reel.source === 'embed' && reel.sourceUrl
        ? reel.sourceUrl
        : window.location.origin + '/reels';
    if (navigator.share) {
      try {
        await navigator.share({ title: reel.title, url });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied', 'success');
      } catch {
        toast(t('common.copyFailed'), 'error');
      }
    }
  };

  /**
   * Provider embeds get their own branch and their own frame.
   *
   * The player runs inside the provider's iframe, so our autoplay-on-scroll, mute and
   * scrubbing controls do not apply to it — trying to fake them would only produce
   * controls that lie. In exchange the video never expires, which is the trade that
   * matters.
   */
  if (reel.source === 'embed') {
    return (
      <section ref={sectionRef} className="relative h-full snap-start overflow-hidden bg-black">
        <iframe
          src={reel.embedUrl}
          title={reel.title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
        {/* Attribution sits above the frame — the creator made this, not us. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-24">
          <p className="line-clamp-2 text-sm font-semibold text-white">{reel.title}</p>
          {reel.authorName && (
            <p className="mt-0.5 text-xs text-white/70">{reel.authorName}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative h-full snap-start overflow-hidden bg-black">
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          loop
          muted={muted}
          preload="metadata"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        // Signed URL still loading — shimmer placeholder.
        <div className="h-full w-full animate-pulse bg-gradient-to-b from-zinc-800 to-zinc-900" />
      )}

      {/* Tap-to-play indicator */}
      <AnimatePresence>
        {userPaused && (
          <motion.button
            key="play"
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="rounded-full bg-black/50 p-5 text-white backdrop-blur-sm"
            >
              <Play size={36} fill="currentColor" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Side rail: favorite / share / mute (TikTok-style vertical stack, end side) */}
      <div className="absolute bottom-28 end-3 z-10 flex flex-col items-center gap-4">
        <motion.button
          onClick={onToggleFavorite}
          aria-label={t('reels.favorites')}
          aria-pressed={reel.isFavorite}
          className="rounded-full bg-white/15 p-3 backdrop-blur-sm"
          whileTap={{ scale: 0.85 }}
        >
          <motion.span
            className="block"
            animate={reel.isFavorite ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, duration: 0.35 }}
          >
            <Heart
              size={22}
              fill={reel.isFavorite ? 'currentColor' : 'none'}
              className={reel.isFavorite ? 'text-red-500' : 'text-white'}
            />
          </motion.span>
        </motion.button>

        <button
          onClick={share}
          aria-label="Share"
          className="rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition active:scale-90"
        >
          <Share2 size={22} />
        </button>

        <button
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition active:scale-90"
        >
          {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      </div>

      {/* Bottom gradient overlay */}
      {/* pb clears the upload FAB (bottom-6), pe clears the side rail */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pb-24 pt-24">
        <div className="pointer-events-auto flex items-end px-4 pe-16 text-start">
          <div className="min-w-0 flex-1 text-start text-white">
            {reel.source === 'community' ? (
              <div className="mb-2 flex items-center gap-2.5">
                <MediaImage
                  path={reel.user.avatarUrl}
                  label={reel.user.firstName}
                  className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/40"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {reel.user.firstName} {reel.user.lastName ?? ''}
                  </p>
                  {reel.user.level != null && <p className="text-[11px] text-white/60">{t('common.lv', { n: reel.user.level })}</p>}
                </div>
              </div>
            ) : null}
            {reel.title && <p className="line-clamp-2 text-sm leading-snug text-white/90">{reel.title}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
