import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Send, ImagePlus, X, Award, Clapperboard, BarChart3 } from 'lucide-react';
import { api, uploadWithAuth } from '../../lib/api';
import { trackAd, pickAd } from '../../lib/ads';
import { getSocket } from '../../lib/socket';
import { MediaImage } from '../../components/ui';
import MenuDrawer from '../../components/MenuDrawer';
import ScreenHeader from '../../components/ScreenHeader';
import PostCard from '../../components/PostCard';

const FEED_KEY = ['feed'];
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/** The daily conversation starter — an empty feed never fills itself. One tap
 *  drops the question into the composer with the user's answer to finish. */
const PROMPTS: { ar: string; en: string }[] = [
  { ar: 'أطول سلسلة أيام وصلتلها كام؟ 🔥', en: 'What is your longest streak ever? 🔥' },
  { ar: 'أكلة صحية مصرية تنصح بيها الكل؟ 🍽', en: 'One healthy Egyptian dish everyone should try?' },
  { ar: 'بتتمرن الصبح ولا بليل؟ ولي؟ ⏰', en: 'Morning or night workouts — and why? ⏰' },
  { ar: 'إيه أصعب تمرينة جربتها في التطبيق؟ 😤', en: 'Hardest exercise you tried in the app? 😤' },
  { ar: 'مين صاحبك اللي المفروض يشترك معانا؟ منشن 👇', en: 'Which friend should join us? Tag them 👇' },
  { ar: 'إيه الأغنية اللي بتولعك في التمرين؟ 🎵', en: 'What song fires you up mid-workout? 🎵' },
  { ar: 'وزنك النهارده أحسن ولا زي الأسبوع اللي فات؟ ⚖️', en: 'Weight better this week or the same? ⚖️' },
  { ar: 'نصيحة واحدة لأي حد لسه بادئ؟ 🌱', en: 'One tip for anyone just starting? 🌱' },
  { ar: 'فطارك النهارده كان إيه؟ صوره لو تقدر 📸', en: 'What was your breakfast today? Photo if you can 📸' },
  { ar: 'هدفك الأسبوع ده إيه؟ اكتبه والتزم 💪', en: 'Your goal this week? Write it and own it 💪' },
];

export default function Community() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ mediaType: string; mediaUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  // Admin surveys: a poll rides on the post («التحدي الجاي يبقى إيه؟»).
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data: feed, isLoading } = useQuery({ queryKey: FEED_KEY, queryFn: () => api.get('/api/social/feed') });
  const { data: unread } = useQuery({ queryKey: ['chat-unread'], queryFn: () => api.get('/api/chat/unread'), refetchInterval: 20000 });
  const { data: ads } = useQuery({ queryKey: ['feed-ad'], queryFn: () => api.get('/api/banners?section=feed_ad') });
  const ad = pickAd<any>(ads);

  const post = useMutation({
    mutationFn: () => {
      const poll = pollOptions?.map((o) => o.trim()).filter(Boolean);
      return api.post('/api/social/posts', { text, ...(media ?? {}), ...(poll && poll.length >= 2 ? { poll } : {}) });
    },
    onSuccess: () => {
      setText('');
      setMedia(null);
      setPollOptions(null);
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
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
        {/* Daily conversation starter — tap to answer it as your post. */}
        {!text && (() => {
          const day = Math.floor(Date.now() / 86400000);
          const prompt = PROMPTS[day % PROMPTS.length];
          const isArNow = document.documentElement.dir === 'rtl';
          const q = isArNow ? prompt.ar : prompt.en;
          return (
            <button
              onClick={() => setText(`${q}\n`)}
              className="mb-2 flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500/15 to-purple-500/10 px-3 py-2.5 text-start"
            >
              <span className="text-base" aria-hidden>💬</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-violet-400">{t('community.promptLabel')}</span>
                <span className="block text-sm font-bold">{q}</span>
              </span>
              <span className="shrink-0 rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-bold text-white">{t('community.promptAnswer')}</span>
            </button>
          );
        })()}
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
          {me?.role === 'ADMIN' && (
            <button
              onClick={() => setPollOptions(pollOptions ? null : ['', ''])}
              className={pollOptions ? 'text-violet-500' : 'text-gray-400'}
              aria-label={t('community.addPoll')}
            >
              <BarChart3 size={20} />
            </button>
          )}
          <button onClick={() => (text.trim() || media) && post.mutate()} disabled={post.isPending || uploading} className="rounded-full btn-primary p-2 disabled:opacity-60">
            <Send size={16} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
        {uploading && <p className="mt-2 text-xs text-gray-400">Uploading…</p>}
        {pollOptions && (
          <div className="mt-2 space-y-1.5">
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                className="w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none"
                placeholder={`${t('community.pollOption')} ${i + 1}`}
                value={opt}
                maxLength={80}
                onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))}
              />
            ))}
            {pollOptions.length < 4 && (
              <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-violet-500">
                + {t('community.pollAddOption')}
              </button>
            )}
          </div>
        )}
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
        /* Skeleton posts instead of a bare spinner: the screen keeps its shape
           and feels a beat faster while the feed arrives. */
        <div className="mx-4 mt-3 space-y-3">
          {[0, 1, 2].map((k) => (
            <div key={k} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="h-2.5 w-16 rounded bg-gray-100" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-3/4 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3 px-4">
          {ad && (
            <motion.a
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              whileTap={{ scale: 0.97 }}
              href={ad.url ?? undefined}
              target={ad.url ? '_blank' : undefined}
              rel="noreferrer sponsored"
              onClick={() => ad.url && trackAd(ad.id, 'click')}
              className="card-hover block overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              {/* White card like every post around it — the old blue gradient
                  block looked like a foreign banner, not part of the feed. */}
              {ad.image && <MediaImage path={ad.image} label={ad.title} className="h-40 w-full" />}
              <div className="p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-orange-500">{t('ads.sponsored')}</div>
                <div className="mt-0.5 truncate font-bold">{ad.title}</div>
                {ad.subtitle && <div className="line-clamp-2 text-sm text-gray-500">{ad.subtitle}</div>}
              </div>
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
