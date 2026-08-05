import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { BreatheAnim } from '../../components/TrainingAnim';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function YogaHub() {
  const { t } = useTranslation();
  const { data: coaches, isLoading } = useQuery({ queryKey: ['coaches', 'YOGA'], queryFn: () => api.get('/api/coaches?type=YOGA') });
  const coachId = coaches?.[0]?.id;
  const { data: coach } = useQuery({ queryKey: ['coach', coachId], queryFn: () => api.get(`/api/coaches/${coachId}`), enabled: !!coachId });

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen overflow-x-hidden pb-10">
      <div className="fitness-hero relative flex flex-col items-center rounded-b-[28px] px-5 pb-8 pt-14 text-center text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
        <TopBar title={t('programs.yoga')} color="bg-transparent" textColor="text-white" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="animate-float"
        >
          <BreatheAnim className="h-24 w-24 text-white/90" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 text-white/70"
        >
          {t('programs.yogaTagline')}
        </motion.p>
      </div>

      <div className="mt-5 px-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('today.explore')}</p>
        <h2 className="mb-3 text-lg font-bold">{t('nav.programs')}</h2>
      </div>
      <div className="space-y-3 px-4">
        {(coach?.programs ?? []).map((p: any, idx: number) => (
          <MotionLink
            key={p.id}
            to={`/programs/${p.id}`}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ ...spring, delay: Math.min(idx, 4) * 0.05 }}
            whileTap={{ scale: 0.96 }}
            className="card-hover flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-50/80 to-white p-3 shadow-sm ring-1 ring-brand-pink/10"
          >
            <MediaImage path={p.coverImage} seed={idx} label={p.title} className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-brand-pink">{p.title}</p>
              {p.description && <p className="line-clamp-1 text-xs text-gray-500">{p.description}</p>}
            </div>
            <ChevronRight className="shrink-0 text-gray-300 rtl:rotate-180" />
          </MotionLink>
        ))}
        {!coach?.programs?.length && <p className="py-10 text-center text-gray-400">{t('programs.noYoga')}</p>}
      </div>
    </div>
  );
}
