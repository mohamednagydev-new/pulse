import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, MessageSquare, ImagePlus, AtSign, Award, Clapperboard, Radio } from 'lucide-react';
import { api } from '../../lib/api';
import Avatar from '../../components/Avatar';
import PostComposer from '../../components/PostComposer';
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
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Feed lens: everything, only real posts, or only buddies' progress.
  const [feedFilter, setFeedFilter] = useState<'all' | 'posts' | 'progress'>('all');
  // Composer sheet — draft carries the daily prompt in when tapped.
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data: feed, isLoading } = useQuery({
    queryKey: [...FEED_KEY, feedFilter],
    queryFn: () => api.get(`/api/social/feed?filter=${feedFilter}`),
  });
  const { data: unread } = useQuery({ queryKey: ['chat-unread'], queryFn: () => api.get('/api/chat/unread'), refetchInterval: 20000 });
  const { data: ads } = useQuery({ queryKey: ['feed-ad'], queryFn: () => api.get('/api/banners?section=feed_ad') });
  const ad = pickAd<any>(ads);

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
          {/* Live groups as a header icon, same visual weight as friends/chat,
              with a pulsing red dot so it still reads as LIVE. */}
          <button
            onClick={() => navigate('/group')}
            aria-label={L('Live group sessions', 'جلسات لايف جماعية')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full"
          >
            <Radio size={24} />
            <span className="absolute end-0.5 top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
            </span>
          </button>
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
          {L('Feed', 'الفيد')}
        </button>
        <button onClick={() => navigate('/reels')} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-gray-500">
          <Clapperboard size={15} /> {L('Reels', 'ريلز')}
        </button>
      </div>

      {/* Feed lenses — real posts vs. buddies' progress (mixed view default).
          Splitting them answers "the community is only nudges". */}
      <div className="mx-4 mb-3 flex gap-1.5 text-xs font-bold">
        {([
          ['all', L('All', 'الكل')],
          ['posts', L('Posts', 'بوستات')],
          ['progress', L("Buddies' progress", 'تقدّم أصحابي')],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFeedFilter(k)}
            className={`rounded-full px-3 py-1.5 transition ${
              feedFilter === k ? 'bg-ink text-white shadow-sm' : 'glass text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="mx-4 rounded-2xl glass p-3"
      >
        {/* Daily conversation starter — tap to answer it in the composer. */}
        {(() => {
          const day = Math.floor(Date.now() / 86400000);
          const prompt = PROMPTS[day % PROMPTS.length];
          const q = isAr ? prompt.ar : prompt.en;
          return (
            <button
              onClick={() => { setDraft(`${q}\n`); setComposerOpen(true); }}
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
        {/* Fake-input trigger — the real composer is a full bottom sheet with
            room to type, upload, tag friends. The strip was too cramped. */}
        <button
          onClick={() => { setDraft(''); setComposerOpen(true); }}
          className="flex w-full items-center gap-2.5 text-start"
        >
          <Avatar path={me?.avatarUrl ?? undefined} name={me?.firstName} className="h-9 w-9 shrink-0" />
          <span className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-400">{t('community.sharePh')}</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"><ImagePlus size={17} /></span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"><AtSign size={17} /></span>
        </button>
      </motion.div>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        draft={draft}
        isAdmin={me?.role === 'ADMIN'}
        onPosted={() => setComposerOpen(false)}
      />

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
