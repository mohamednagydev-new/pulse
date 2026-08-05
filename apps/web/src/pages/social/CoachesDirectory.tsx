import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Flame, Dumbbell, UserPlus, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, Loader, EmptyState } from '../../components/ui';
import CoachBadge from '../../components/CoachBadge';
import TopBar from '../../components/TopBar';
import AmbientBg from '../../components/AmbientBg';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function CoachesDirectory() {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const { t } = useTranslation();
  // The meal plan links here with ?specialty=nutrition, so someone asking about food
  // lands on the people who answer that rather than on the full trainer list.
  const [params] = useSearchParams();
  const specialty = params.get('specialty') ?? '';
  const { data: coaches, isLoading } = useQuery({
    queryKey: ['coach-directory', q, specialty],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (specialty) qs.set('specialty', specialty);
      const s = qs.toString();
      return api.get(`/api/social/coaches${s ? `?${s}` : ''}`);
    },
  });

  const follow = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on ? api.post(`/api/social/users/${id}/follow`) : api.del(`/api/social/users/${id}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-directory'] }),
  });

  return (
    <div className="relative min-h-screen pb-8">
      <AmbientBg tone="warm" />
      <TopBar title={t('home.coaches')} color="fitness-hero" textColor="text-white" />
      <div className="px-4">
        <div className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input className="w-full min-w-0 bg-transparent outline-none" placeholder={`${t('common.search')}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="mt-4 space-y-2 px-4">
          {(coaches ?? []).map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(i, 5) * 0.04 }}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
            >
              <Link to={`/u/${c.id}`}><MediaImage path={c.avatarUrl} label={c.firstName} className="h-14 w-14 rounded-full" seed={c.id.length} /></Link>
              <Link to={`/u/${c.id}`} className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">{c.firstName} {c.lastName} <CoachBadge verified={c.coachVerified} />{c.coachFeatured && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">★ Featured</span>}</p>
                {c.coachHeadline && <p className="truncate text-xs text-gray-500">{c.coachHeadline}</p>}
                <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                  <span className="rounded-full bg-brand-blue/10 px-2 font-bold text-brand-blue">{t('common.lv', { n: c.level })}</span>
                  <span className="flex items-center gap-0.5"><Flame size={11} /> {c.currentStreak}</span>
                </p>
              </Link>
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={tapSpring}
                onClick={() => follow.mutate({ id: c.id, on: !c.isFollowing })}
                className={`btn-pill flex min-h-[40px] shrink-0 items-center gap-1.5 px-4 py-2 text-sm ${c.isFollowing ? 'btn-ghost text-gray-500' : 'btn-primary'}`}
              >
                {c.isFollowing ? <Check size={14} className="text-brand-green" /> : <UserPlus size={14} />}
                {c.isFollowing ? t('social2.following') : t('social2.follow')}
              </motion.button>
            </motion.div>
          ))}
          {!coaches?.length && (
            <EmptyState icon={<Dumbbell size={40} />} title={t('coaches.empty')} hint={t('coaches.emptyHint')} />
          )}
        </div>
      )}
    </div>
  );
}
