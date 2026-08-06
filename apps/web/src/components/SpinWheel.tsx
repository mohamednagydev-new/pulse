import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { celebrateFeedback, tapFeedback } from '../lib/haptics';
import Confetti from './Confetti';

interface Slice { key: string; en: string; ar: string; icon: string }
interface SpinPayload { day: string; spun: boolean; prize: string | null; slices: Slice[] }

/** Slice fills, alternating so neighbours never blend into each other. */
const FILLS = ['#F97316', '#FDBA74', '#22C55E', '#38BDF8', '#A855F7', '#94A3B8'];

/** One free spin a day — the cheapest reason to open the app before you've trained. */
export default function SpinWheel() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Slice | null>(null);
  const [party, setParty] = useState(false);

  const { data } = useQuery<SpinPayload>({
    queryKey: ['spin'],
    queryFn: () => api.get('/api/daily/spin'),
    staleTime: 60_000,
  });

  const spin = useMutation({
    mutationFn: () => api.post('/api/daily/spin'),
    onSuccess: (res: any) => {
      const slices = data?.slices ?? [];
      const n = Math.max(1, slices.length);
      const seg = 360 / n;
      // Land the winning slice under the pointer at 12 o'clock, after 5 full turns.
      const target = 360 * 5 + (360 - (res.index * seg + seg / 2));
      setSpinning(true);
      setAngle((a) => a + target - (a % 360));
      setTimeout(() => {
        setSpinning(false);
        const slice = slices[res.index] ?? null;
        setWon(slice);
        if (res.xp > 0 || res.prize === 'freeze') {
          celebrateFeedback();
          setParty(true);
        }
        qc.invalidateQueries({ queryKey: ['spin'] });
        qc.invalidateQueries({ queryKey: ['me'] });
        qc.invalidateQueries({ queryKey: ['progress'] });
      }, 3800);
    },
    onError: (err: any) => {
      setSpinning(false);
      toast(err?.message ?? t('fun.alreadySpun'), 'error');
      qc.invalidateQueries({ queryKey: ['spin'] });
    },
  });

  if (!data || !data.slices?.length) return null;

  const slices = data.slices;
  const seg = 360 / slices.length;
  const alreadyDone = data.spun && !won;
  const label = won ? (isAr ? won.ar : won.en) : null;

  // Spun already (and not mid-celebration) → one slim row instead of the full
  // wheel card taking Home real estate for the rest of the day.
  if (alreadyDone && !spinning) {
    return (
      <section className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#1B1330] to-[#2C1A3D] px-4 py-3 text-white shadow-sm">
        <Sparkles size={16} className="shrink-0 text-amber-300" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{t('fun.spinTitle')}</p>
        <p className="shrink-0 text-xs text-white/60">{t('fun.comeBackTomorrow')}</p>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B1330] to-[#2C1A3D] p-4 text-white shadow-sm"
    >
      {party && <Confetti onDone={() => setParty(false)} />}

      <div className="flex items-center gap-4">
        <div className="relative h-[112px] w-[112px] shrink-0">
          {/* pointer */}
          <div className="absolute left-1/2 top-[-2px] z-10 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[12px] border-x-transparent border-t-white drop-shadow" />
          <motion.div
            animate={{ rotate: angle }}
            transition={{ duration: 3.6, ease: [0.12, 0.8, 0.15, 1] }}
            className="h-full w-full rounded-full ring-4 ring-white/15"
            style={{
              background: `conic-gradient(${slices
                .map((_, i) => `${FILLS[i % FILLS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
                .join(',')})`,
            }}
          >
            {slices.map((s, i) => (
              <span
                key={s.key}
                className="absolute left-1/2 top-1/2 text-base leading-none"
                style={{
                  transform: `rotate(${i * seg + seg / 2}deg) translate(-50%, -44px)`,
                  transformOrigin: '0 0',
                }}
                aria-hidden
              >
                {s.icon}
              </span>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 shadow" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Sparkles size={15} className="text-amber-300" /> {t('fun.spinTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-white/60">
            {label ?? (alreadyDone ? t('fun.comeBackTomorrow') : t('fun.spinSub'))}
          </p>

          {alreadyDone || won ? (
            <div className="mt-3 flex min-h-[40px] items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-bold text-white/70">
              {t('fun.spunToday')}
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { tapFeedback(); spin.mutate(); }}
              disabled={spinning || spin.isPending}
              className="mt-3 min-h-[40px] w-full rounded-xl bg-amber-400 px-4 text-sm font-extrabold text-[#2C1A3D] shadow transition disabled:opacity-60"
            >
              {spinning ? t('fun.spinning') : t('fun.spinNow')}
            </motion.button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
