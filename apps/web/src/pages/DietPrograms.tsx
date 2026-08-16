import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Users, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { celebrateFeedback, tapFeedback } from '../lib/haptics';
import { Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

interface Program {
  id: string;
  title: string;
  description?: string | null;
  days: number;
  kind: string;
  emoji: string;
  participants: number;
  enrollment: { doneCount: number; dayIndex: number; todayDone: boolean; pct: number; finishedAt: string | null } | null;
  todayTip: { en: string; ar: string } | null;
}

/**
 * Global diet programs — shared commitments anyone can join, tracked for real:
 * a day only counts when food was actually logged that day. One active program
 * at a time; finishing pays XP and a milestone push.
 */
export default function DietPrograms() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');

  const { data, isLoading } = useQuery<Program[]>({
    queryKey: ['diet-programs'],
    queryFn: () => api.get('/api/meals/diet-programs'),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['diet-programs'] });

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/api/meals/diet-programs/${id}/join`),
    onSuccess: () => { tapFeedback(); toast(t('dietProg.joined'), 'success'); refresh(); },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const dayDone = useMutation({
    mutationFn: (id: string) => api.post(`/api/meals/diet-programs/${id}/day-done`),
    onSuccess: (r: any) => {
      if (r.finished) { celebrateFeedback(); toast(t('dietProg.finished'), 'success'); }
      else { tapFeedback(); toast(t('dietProg.dayDone'), 'success'); }
      refresh();
    },
    onError: (e: any) => {
      if (e?.code === 'log-first' || /log/i.test(e?.message ?? '')) {
        toast(t('dietProg.logFirst'), 'error');
        navigate('/tracker');
      } else toast(e?.message ?? 'Failed', 'error');
    },
  });
  const leave = useMutation({
    mutationFn: (id: string) => api.post(`/api/meals/diet-programs/${id}/leave`),
    onSuccess: () => { toast(t('dietProg.left'), 'info'); refresh(); },
  });

  if (isLoading) return <Loader />;
  const programs = data ?? [];
  const activeId = programs.find((p) => p.enrollment && !p.enrollment.finishedAt)?.id ?? null;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="green" />
      <TopBar title={t('dietProg.title')} color="bg-gradient-to-b from-emerald-600 to-teal-700" textColor="text-white" />
      <p className="px-5 pt-3 text-sm text-gray-500">{t('dietProg.sub')}</p>

      <div className="mt-3 space-y-4 px-4">
        {programs.map((p, i) => {
          const e = p.enrollment;
          const active = !!e && !e.finishedAt;
          const finished = !!e?.finishedAt;
          return (
            <motion.section
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: i * 0.05 }}
              className={`overflow-hidden rounded-2xl bg-white shadow-sm ${active ? 'ring-2 ring-emerald-400' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden>{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-extrabold">{p.title}</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{p.description}</p>
                    <p className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-gray-400">
                      <span>📅 {t('dietProg.days', { n: p.days })}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {p.participants}</span>
                      {finished && <span className="text-emerald-500">✓ {t('dietProg.completed')}</span>}
                    </p>
                  </div>
                </div>

                {active && e && (
                  <>
                    <div className="mt-3 flex items-baseline justify-between text-xs font-bold">
                      <span className="text-gray-500">{t('dietProg.progress', { done: e.doneCount, total: p.days })}</span>
                      <span className="text-emerald-600">{e.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${e.pct}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-600"
                      />
                    </div>
                    {p.todayTip && (
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
                        💡 {isAr ? p.todayTip.ar : p.todayTip.en}
                      </p>
                    )}
                  </>
                )}
              </div>

              {active && e ? (
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => leave.mutate(p.id)}
                    disabled={leave.isPending}
                    className="flex min-h-[46px] items-center justify-center gap-1.5 px-5 text-xs font-bold text-gray-400"
                  >
                    <LogOut size={13} className="rtl:rotate-180" /> {t('dietProg.leave')}
                  </button>
                  <button
                    onClick={() => !e.todayDone && dayDone.mutate(p.id)}
                    disabled={dayDone.isPending || e.todayDone}
                    className={`flex min-h-[46px] flex-1 items-center justify-center gap-1.5 border-s border-gray-100 text-sm font-extrabold ${
                      e.todayDone ? 'text-emerald-500' : 'text-white'
                    } ${e.todayDone ? 'bg-emerald-50' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}
                  >
                    <Check size={16} strokeWidth={3} /> {e.todayDone ? t('dietProg.todayDone') : t('dietProg.markToday')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => join.mutate(p.id)}
                  disabled={join.isPending || (!!activeId && activeId !== p.id)}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 border-t border-gray-100 text-sm font-extrabold text-emerald-600 transition active:scale-[0.98] disabled:opacity-40"
                >
                  {finished ? t('dietProg.restart') : t('dietProg.join')}
                </button>
              )}
            </motion.section>
          );
        })}
      </div>

      {activeId && (
        <p className="mt-4 px-5 text-center text-[11px] text-gray-400">{t('dietProg.oneAtATime')}</p>
      )}
    </div>
  );
}
