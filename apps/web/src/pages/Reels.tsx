import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Clapperboard, Heart, Loader2, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, uploadWithAuth } from '../lib/api';
import { toast } from '../lib/toast';
import Sheet from '../components/Sheet';
import ReelVideo, { type Reel } from '../components/ReelVideo';

type Topic = 'foryou' | 'workout' | 'yoga';
/** Topics a user can upload to — the For-You feed is server-curated. */
type UploadTopic = 'workout' | 'yoga';

const TOPICS: { id: Topic; labelKey: string }[] = [
  { id: 'foryou', labelKey: 'reels.forYou' },
  { id: 'workout', labelKey: 'reels.workout' },
  { id: 'yoga', labelKey: 'reels.yoga' },
];
const UPLOAD_TOPICS: { id: UploadTopic; labelKey: string }[] = [
  { id: 'workout', labelKey: 'reels.workout' },
  { id: 'yoga', labelKey: 'reels.yoga' },
];

export default function Reels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [topic, setTopic] = useState<Topic>('foryou');
  const [view, setView] = useState<'feed' | 'favorites'>('feed');
  const [muted, setMuted] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const feedQuery = useQuery({
    queryKey: ['reels', topic],
    queryFn: () => api.get(`/api/reels?topic=${topic}`),
    enabled: view === 'feed',
  });
  const favoritesQuery = useQuery({
    queryKey: ['reels', 'favorites'],
    queryFn: () => api.get('/api/reels/favorites'),
    enabled: view === 'favorites',
  });

  const { data, isLoading, isError, error } = view === 'feed' ? feedQuery : favoritesQuery;
  const reels: Reel[] = data?.reels ?? [];

  useEffect(() => {
    if (isError) toast(error instanceof Error ? error.message : 'Failed to load reels', 'error');
  }, [isError, error]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: view === 'feed' ? ['reels', topic] : ['reels', 'favorites'] });
  };

  /** Optimistically flip isFavorite in every cached reels query, then sync with the server. */
  const toggleFavorite = async (reel: Reel) => {
    const setFavorite = (fav: boolean) =>
      qc.setQueriesData({ queryKey: ['reels'] }, (old: { reels?: Reel[] } | undefined) => {
        if (!old?.reels) return old;
        return { ...old, reels: old.reels.map((r) => (r.key === reel.key ? { ...r, isFavorite: fav } : r)) };
      });

    const next = !reel.isFavorite;
    setFavorite(next);
    try {
      await api.post('/api/reels/favorite', {
        key: reel.key,
        source: reel.source,
        topic: reel.topic ?? undefined,
      });
    } catch (e) {
      setFavorite(!next); // rollback
      toast(e instanceof Error ? e.message : 'Could not update favorite', 'error');
    }
  };

  return (
    <div className="relative h-screen bg-black">
      {/* Vertical snap feed */}
      <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
        {isLoading ? (
          <ReelsSkeleton />
        ) : reels.length === 0 ? (
          view === 'favorites' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
              <Heart size={44} className="text-white/30" />
              <p className="font-bold">{t('reels.emptyFavs')}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
              <Clapperboard size={44} className="text-white/30" />
              <p className="font-bold">{t('reels.empty')}</p>
              <button
                onClick={() => setSheetOpen(true)}
                className="mt-1 rounded-full bg-brand-pink px-6 py-2.5 text-sm font-bold text-white transition active:scale-95"
              >
                {t('reels.upload')}
              </button>
            </div>
          )
        ) : (
          reels.map((reel) => (
            <ReelVideo
              key={reel.key}
              reel={reel}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleFavorite={() => toggleFavorite(reel)}
            />
          ))
        )}
      </div>

      {/* Top bar overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent pb-10 pt-12" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <div className="pointer-events-auto flex items-center gap-2 px-4">
          <button
            onClick={() => (view === 'favorites' ? setView('feed') : navigate(-1))}
            aria-label={t('common.back')}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition active:scale-90 rtl:rotate-180"
          >
            <ArrowLeft size={20} />
          </button>

          {view === 'favorites' ? (
            <h1 className="flex-1 text-center text-base font-extrabold text-white">{t('reels.favorites')}</h1>
          ) : (
            <div className="flex flex-1 justify-center gap-1.5">
              {TOPICS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTopic(tab.id)}
                  className={`relative min-h-10 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                    topic === tab.id ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {topic === tab.id && (
                    <motion.span
                      layoutId="reels-tab"
                      className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{t(tab.labelKey)}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={refresh}
            aria-label={t('reels.refresh')}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition active:scale-90"
          >
            <RefreshCw size={18} />
          </button>
          {view === 'feed' ? (
            <button
              onClick={() => setView('favorites')}
              aria-label={t('reels.favorites')}
              className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition active:scale-90"
            >
              <Heart size={18} />
            </button>
          ) : (
            <span className="w-9" aria-hidden />
          )}
        </div>
      </div>

      {/* Floating upload button */}
      {view === 'feed' && !isLoading && reels.length > 0 && (
        <motion.button
          onClick={() => setSheetOpen(true)}
          aria-label={t('reels.upload')}
          className="absolute bottom-6 end-4 z-20 rounded-full bg-brand-pink p-4 text-white shadow-lg shadow-brand-pink/40"
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Plus size={24} />
        </motion.button>
      )}

      <UploadSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultTopic={topic === 'foryou' ? 'workout' : topic}
        onPosted={(t) => {
          setSheetOpen(false);
          setView('feed');
          setTopic(t);
          qc.invalidateQueries({ queryKey: ['reels'] });
        }}
      />
    </div>
  );
}

function ReelsSkeleton() {
  return (
    <div className="relative h-full animate-pulse bg-gradient-to-b from-zinc-900 to-black">
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-white/10" />
          <div className="h-3 w-28 rounded-full bg-white/10" />
        </div>
        <div className="h-3 w-3/4 rounded-full bg-white/10" />
        <div className="h-3 w-1/2 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

/** Bottom-sheet composer: pick a video, optional caption, post to /api/reels. */
function UploadSheet({
  open,
  onClose,
  defaultTopic,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  defaultTopic: UploadTopic;
  onPosted: (topic: UploadTopic) => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [topic, setTopic] = useState<UploadTopic>(defaultTopic);
  const [uploading, setUploading] = useState(false);

  // Reset the form each time the sheet opens, defaulting topic to the active tab.
  useEffect(() => {
    if (open) {
      setTopic(defaultTopic);
      setFile(null);
      setCaption('');
    }
  }, [open, defaultTopic]);

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (!res.ok) throw new Error('Upload failed — try a smaller video.');
      const { mediaUrl } = await res.json();
      await api.post('/api/reels', { topic, mediaUrl, text: caption.trim() });
      toast(t('reels.posted'), 'success');
      onPosted(topic);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onClose={() => !uploading && onClose()} label={t('reels.upload')}>
      {/* Dark composer inside the shared white shell: the wrapper pulls itself up
          over the sheet's own handle and paints the whole panel zinc-900. */}
      <div
        className="-mt-[14px] rounded-t-[28px] bg-zinc-900 px-5 pt-3 text-white"
        style={{
          marginBottom: 'calc(env(safe-area-inset-bottom, 0px) * -1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('reels.upload')}</h2>
              <button onClick={onClose} disabled={uploading} aria-label={t('common.close')} className="text-white/60">
                <X size={20} />
              </button>
            </div>

            {/* Video picker */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-semibold transition ${
                file ? 'border-brand-pink/60 bg-brand-pink/10 text-brand-pink' : 'border-white/15 text-white/60'
              }`}
            >
              <Upload size={18} />
              <span className="truncate">{file ? file.name : t('reels.pickVideo')}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />

            <input
              className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40"
              placeholder={t('reels.caption')}
              value={caption}
              maxLength={200}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
            />

            {/* Topic pills */}
            <div className="mt-3 flex gap-2">
              {UPLOAD_TOPICS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTopic(tab.id)}
                  disabled={uploading}
                  className={`min-h-10 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                    topic === tab.id ? 'bg-brand-pink text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!file || uploading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-pink py-3.5 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
                </>
              ) : (
                t('reels.post')
              )}
            </button>
      </div>
    </Sheet>
  );
}
