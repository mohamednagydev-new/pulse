import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

/** Home countdown for the next flagship LIVE class (a scheduled group session
 *  with a coach stream attached). Renders nothing when none is coming — the
 *  card only exists when there is a real event to rally around. */
export default function LiveClassCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  const { data } = useQuery<{ session: { id: string; title: string; scheduledAt: string; muscleFocus?: string | null } | null }>({
    queryKey: ['next-live-class'],
    queryFn: () => api.get('/api/group/next-live'),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
  const s = data?.session;

  useEffect(() => {
    if (!s) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [s?.id]);

  if (!s) return null;
  const at = new Date(s.scheduledAt).getTime();
  const diff = at - now;
  const live = diff <= 0; // within the post-start window the API already filters
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  const countdown =
    h > 24
      ? L(`in ${Math.ceil(h / 24)} days`, `بعد ${Math.ceil(h / 24)} يوم`)
      : h > 0
        ? `${h}${L('h', 'س')} ${m}${L('m', 'د')}`
        : `${m}:${String(sec).padStart(2, '0')}`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/group/${s.id}`)}
      className="scene-tex mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-3.5 text-start text-white shadow-md shadow-rose-500/30"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg" aria-hidden>
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/30" />}
        🔴
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{s.title}</span>
        <span className="block truncate text-[11px] text-white/85">
          {live ? L('LIVE NOW — jump in!', 'لايف دلوقتي — ادخل!') : `${L('Live class starts in', 'الحصة اللايف هتبدأ بعد')} ${countdown}`}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold tabular-nums text-rose-600">
        {live ? L('Join', 'ادخل') : countdown}
      </span>
    </motion.button>
  );
}
