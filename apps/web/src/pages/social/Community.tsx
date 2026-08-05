import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Send, ImagePlus, X, Award, Clapperboard } from 'lucide-react';
import { api, getAccessToken } from '../../lib/api';
import { trackAd } from '../../lib/ads';
import { getSocket } from '../../lib/socket';
import { Loader, MediaImage } from '../../components/ui';
import MenuDrawer from '../../components/MenuDrawer';
import ScreenHeader from '../../components/ScreenHeader';
import PostCard from '../../components/PostCard';

const FEED_KEY = ['feed'];
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function Community() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ mediaType: string; mediaUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: feed, isLoading } = useQuery({ queryKey: FEED_KEY, queryFn: () => api.get('/api/social/feed') });
  const { data: unread } = useQuery({ queryKey: ['chat-unread'], queryFn: () => api.get('/api/chat/unread'), refetchInterval: 20000 });
  const { data: ads } = useQuery({ queryKey: ['feed-ad'], queryFn: () => api.get('/api/banners?section=feed_ad') });
  const ad = ads?.[0];

  const post = useMutation({
    mutationFn: () => api.post('/api/social/posts', { text, ...(media ?? {}) }),
    onSuccess: () => {
      setText('');
      setMedia(null);
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/social/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
        body: fd,
      });
      if (res.ok) setMedia(await res.json());
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (ad) trackAd(ad.id, 'impression');
  }, [ad?.id]);

  // Live feed updates
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => qc.invalidateQueries({ queryKey: FEED_KEY });
    socket.on('feed:new', onNew);
    return () => {
      socket.off('feed:new', onNew);
    };
  }, [qc]);

  return (
    <div className="min-h-screen pb-6">
      {/* Section tone: Community owns violet. */}
      <ScreenHeader tone="violet" padBottom="pb-6" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Drawer on every tab, not just Home. */}
          <MenuDrawer />
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl font-extrabold"
          >
            {t('nav.community')}
          </motion.h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/coaches-community')} aria-label="Coaches" className="flex h-10 w-10 items-center justify-center rounded-full"><Award size={24} /></button>
          <button onClick={() => navigate('/people')} aria-label="People" className="flex h-10 w-10 items-center justify-center rounded-full"><Users size={24} /></button>
          <button onClick={() => navigate('/chat')} aria-label="Messages" className="relative flex h-10 w-10 items-center justify-center rounded-full">
            <MessageSquare size={24} />
            {unread?.unread > 0 && <span className="absolute end-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-pink">{unread.unread}</span>}
          </button>
        </div>
      </ScreenHeader>

      {/* Feed | Reels switcher — Reels opens the full-screen vertical player */}
      <div className="mx-4 -mt-3 mb-3 flex rounded-full glass p-1 text-sm font-bold">
        {/* Active tab is a solid explicit gradient — white-on-glass was near
            invisible on light backgrounds (same fix as the Help tab pill). */}
        <button
          className="flex-1 rounded-full py-2 text-white shadow-sm"
          style={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}
        >
          Feed
        </button>
        <button onClick={() => navigate('/reels')} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-gray-500">
          <Clapperboard size={15} /> Reels
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="mx-4 rounded-2xl glass p-3"
      >
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder={t('community.sharePh')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (text.trim() || media) && post.mutate()}
          />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-gray-400" aria-label={t('community.addMedia')}>
            <ImagePlus size={20} />
          </button>
          <button onClick={() => (text.trim() || media) && post.mutate()} disabled={post.isPending || uploading} className="rounded-full btn-primary p-2 disabled:opacity-60">
            <Send size={16} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
        {uploading && <p className="mt-2 text-xs text-gray-400">Uploading…</p>}
        {media && (
          <div className="relative mt-2 w-fit">
            {media.mediaType === 'image' ? (
              <MediaImage path={media.mediaUrl} className="h-24 w-24 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">Video ready</div>
            )}
            <button onClick={() => setMedia(null)} aria-label="Remove media" className="absolute -end-2 -top-2 rounded-full bg-black/70 p-1.5 text-white"><X size={12} /></button>
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="mt-4 space-y-3 px-4">
          {ad && (
            <motion.a
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              whileTap={{ scale: 0.97 }}
              href={ad.url ?? undefined}
              target="_blank"
              rel="noreferrer sponsored"
              className="card-hover block rounded-2xl bg-gradient-to-r from-brand-blue to-cyan-500 p-4 text-white"
            >
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Sponsored</div>
              <div className="truncate font-bold">{ad.title}</div>
              {ad.subtitle && <div className="line-clamp-2 text-sm opacity-90">{ad.subtitle}</div>}
            </motion.a>
          )}
          {(feed ?? []).map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: Math.min(i, 3) * 0.05 }}
            >
              <PostCard post={p} queryKey={FEED_KEY} />
            </motion.div>
          ))}
          {!feed?.length && (
            <div className="py-16 text-center text-gray-400">
              <p>{t('community.quiet')}</p>
              <button onClick={() => navigate('/people')} className="mt-2 font-semibold text-brand-pink">{t('community.findPeople')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
