import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useSignedMedia } from '../lib/media';
import { MediaImage } from './ui';
import { useAuth } from '../store/auth';

type Reel =
  | {
      id: string;
      key: string;
      source: 'curated'; // downloaded to our storage — plays via signed URL
      title: string;
      videoId: string;
      poster?: string | null;
      topic?: string | null;
    }
  | {
      id: string;
      key: string;
      source: 'embed';
      provider: 'youtube';
      title: string;
      embedUrl: string;
      authorName?: string | null;
      coverUrl?: string | null;
      topic?: string | null;
    };

/** Build a poster URL from a local image path (same normalization as MediaImage). */
const posterSrc = (p: string) =>
  p.startsWith('http') || p.startsWith('/media') ? p : `/media/image/${p.replace(/^images\//, '')}`;

/** Resolves the signed URL for a curated clip and plays it. */
function CuratedPlayer({ videoId, poster, title }: { videoId: string; poster?: string | null; title: string }) {
  const signed = useSignedMedia('video', videoId);
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Playback error — fall back to the poster (themed art when none exists).
    return <MediaImage path={poster} label={title} className="h-full w-full" />;
  }
  if (!signed) {
    // Signed URL still loading.
    return <div className="h-full w-full animate-pulse bg-gradient-to-b from-zinc-800 to-zinc-900" />;
  }
  return (
    <video
      controls
      playsInline
      autoPlay
      src={signed}
      poster={poster ? posterSrc(poster) : undefined}
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
}

/** Plays a provider embed. No signed URL, so nothing to expire or refresh. */
function EmbedPlayer({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <iframe
      src={embedUrl}
      title={title}
      loading="lazy"
      allow="encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="h-full w-full border-0"
    />
  );
}

export default function RelatedReels({ keyword, className = '' }: { keyword?: string | null; className?: string }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<Reel | null>(null);

  // Reels are an authed API — guests browsing content pages skip the rail
  // entirely instead of firing a guaranteed 401 on every page view.
  const authed = useAuth((s) => s.status === 'authed');
  const { data } = useQuery({
    queryKey: ['related-reels', keyword],
    queryFn: () => api.get(`/api/reels/related?q=${encodeURIComponent(keyword!)}`),
    enabled: !!keyword && authed,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const reels: Reel[] = data?.reels ?? [];
  if (!keyword || reels.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <div className="mb-2 flex items-center gap-2">
        <Clapperboard size={16} className="text-brand-pink" />
        <h2 className="text-sm font-bold">{t('reels.related')}</h2>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {reels.map((reel) => (
          <button
            key={reel.id}
            onClick={() => setActive(reel)}
            className="relative h-52 w-32 shrink-0 snap-start overflow-hidden rounded-2xl bg-black/40 text-start"
          >
            <div className="absolute inset-0">
              {reel.source === 'embed' && reel.coverUrl ? (
                <img src={reel.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <MediaImage path={reel.source === 'curated' ? reel.poster : undefined} label={reel.title} className="h-full w-full" />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                <Play size={15} fill="white" className="text-white" />
              </div>
            </div>
            <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-2 text-[11px] font-medium leading-tight text-white">
              {reel.title}
            </p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onClick={() => setActive(null)}
          >
            <button
              onClick={() => setActive(null)}
              aria-label={t('common.close')}
              className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
            >
              <X size={18} />
            </button>
            <div className="h-full max-h-full w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              {active.source === 'curated' ? (
                <CuratedPlayer videoId={active.videoId} poster={active.poster} title={active.title} />
              ) : (
                <EmbedPlayer embedUrl={active.embedUrl} title={active.title} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
