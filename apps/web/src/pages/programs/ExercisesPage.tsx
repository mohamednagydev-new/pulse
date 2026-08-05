import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Flame, ChevronRight } from 'lucide-react';
import { sameMuscle } from '../../lib/muscleNames';
import { api } from '../../lib/api';
import { Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import BodySvg from '../../components/BodySvg';

type Group = { id: string; name: string; bodySide: 'front' | 'back'; posX?: number | null; posY?: number | null };

export default function ExercisesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [active, setActive] = useState<Group | null>(null);
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['muscle-groups'],
    queryFn: () => api.get('/api/muscle-groups'),
  });

  // Loading/error keep the dark shell + a back affordance — no white flash, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-700 to-gray-900 pb-10 text-white">
        <TopBar title={t('exercises.title')} color="bg-transparent" textColor="text-white" />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const all: Group[] = groups ?? [];
  const visible = all.filter((g) => g.bodySide === side);
  const cardio = all.find((g) => sameMuscle(g.name, 'cardio'));

  const flip = () => {
    setActive(null);
    setSide((s) => (s === 'front' ? 'back' : 'front'));
  };

  const pick = (g: Group) => {
    if (active?.id === g.id) navigate(`/exercises/${g.id}`);
    else setActive(g);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-700 to-gray-900 pb-10 text-white">
      <TopBar title={t('exercises.title')} color="bg-transparent" textColor="text-white" />

      {cardio && (
        <button
          onClick={() => {
            if (cardio.bodySide !== side) setSide(cardio.bodySide);
            pick(cardio);
          }}
          className="absolute end-4 top-16 z-10 flex flex-col items-center gap-1"
        >
          <span className={`rounded-full border p-2 backdrop-blur transition-colors ${active?.id === cardio.id ? 'border-orange-400/60 bg-orange-500 text-white' : 'border-white/15 bg-white/10 text-orange-400'}`}>
            <Flame size={22} />
          </span>
          <span className="text-[11px] text-white/70">{t('exercises.cardio')}</span>
        </button>
      )}

      <div className="relative mx-auto mt-4 h-[520px] w-full max-w-[360px]" style={{ perspective: 900 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={side}
            initial={{ opacity: 0, rotateY: -70 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 70 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <BodySvg
              side={side}
              highlight={active?.bodySide === side ? active.name : undefined}
              className="absolute left-1/2 top-1/2 h-[500px] -translate-x-1/2 -translate-y-1/2"
            />

            {visible.map((g) => {
              const isActive = active?.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => pick(g)}
                  onMouseEnter={() => setActive(g)}
                  style={{ left: `${(g.posX ?? 0.5) * 100}%`, top: `${(g.posY ?? 0.5) * 100}%` }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <span
                    className={`block h-2.5 w-2.5 animate-pulse rounded-full transition-all ${
                      isActive ? 'bg-orange-400 ring-4 ring-orange-400/40' : 'bg-orange-500/80 ring-2 ring-orange-500/25'
                    }`}
                  />
                  <span
                    className={`absolute start-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur transition-colors ${
                      isActive ? 'border-orange-400/60 bg-orange-500/25 text-orange-100' : 'border-white/15 bg-white/10 text-white/85'
                    }`}
                  >
                    {g.name}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Info chip for the active group */}
        <AnimatePresence>
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 ps-4 pe-1.5 shadow-lg backdrop-blur-md"
            >
              <span className="whitespace-nowrap text-sm font-semibold">{active.name}</span>
              <button
                onClick={() => navigate(`/exercises/${active.id}`)}
                className="flex items-center gap-0.5 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white active:scale-95"
              >
                {t('exercises.view')} <ChevronRight size={13} className="rtl:rotate-180" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-center px-8">
        <button onClick={flip} className="flex flex-col items-center gap-1 active:scale-95">
          <span className="rounded-full bg-orange-500 p-2 text-white shadow-lg shadow-orange-500/30">
            <RotateCw size={22} />
          </span>
          <span className="text-[11px] capitalize text-white/70">{side === 'front' ? t('exercises.back') : t('exercises.front')}</span>
        </button>
      </div>
    </div>
  );
}
