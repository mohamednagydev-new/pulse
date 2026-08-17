import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Dumbbell, Trophy, TrendingDown, Moon, Target, Flame, CalendarDays, Check, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, MediaImage, EmptyState, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import Sheet from '../../components/Sheet';
import { toast } from '../../lib/toast';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

interface Detail {
  profile: { id: string; firstName: string; lastName: string; avatarUrl?: string | null; level: number; currentStreak: number; goalText?: string | null };
  lastWorkoutAt: string | null;
  quietDays: number | null;
  week: { day: string; count: number }[];
  weightTrend: { date: string; weightKg: number }[];
  prs: { exercise: string; weightKg: number; reps: number | null; at: string | null }[];
  myPrograms: { id: string; title: string; visibility: string; daysCount: number; completedCount: number; enrolled: boolean; assignedBy: string | null }[];
}

/** One client, one screen: how active they are, where their weight is heading,
 *  their best lifts, and how far they got in MY programs — plus the two coach
 *  actions that matter (assign a program, open the DM). No food data on
 *  purpose: meals stay private to the member. */
export default function CoachClientDetail() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<Detail>({
    queryKey: ['coach-client-detail', id],
    queryFn: () => api.get(`/api/coach/clients/${id}/detail`),
    enabled: !!id,
  });

  // Same get-or-create thread flow UserProfile uses — acceptance already
  // auto-connected the pair, so the DM opens without a gate.
  const openDm = useMutation({
    mutationFn: () => api.post('/api/chat/threads', { userId: id }),
    onSuccess: (thread: any) => navigate(`/chat/${thread.id}`),
    onError: () => toast(L('Could not open the chat', 'مقدرناش نفتح الشات'), 'error'),
  });

  const assign = useMutation({
    mutationFn: (programId: string) => api.post(`/api/coach/programs/${programId}/assign`, { clientId: id }),
    onSuccess: () => {
      setAssignOpen(false);
      qc.invalidateQueries({ queryKey: ['coach-client-detail', id] });
      toast(L('Program sent to your client', 'البرنامج اتبعت لعميلك'), 'success');
    },
    onError: (e: any) => toast(e?.message || L('Could not assign', 'مقدرناش نبعت البرنامج'), 'error'),
  });

  if (isLoading) return <Loader />;
  if (isError || !data) {
    return (
      <div className="min-h-screen">
        <TopBar title={L('Client', 'العميل')} color="fitness-hero" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const { profile, quietDays, lastWorkoutAt, week, weightTrend, prs, myPrograms } = data;
  const maxCount = Math.max(1, ...week.map((w) => w.count));
  const lastWorkoutDays = lastWorkoutAt ? Math.max(0, Math.round((Date.now() - new Date(lastWorkoutAt).getTime()) / 86_400_000)) : null;

  return (
    <div className="min-h-screen pb-28">
      <TopBar title={`${profile.firstName} ${profile.lastName}`} color="fitness-hero" textColor="text-white" />

      {/* Header: who + streak + goal, on the coach gradient. */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mx-4 mt-3">
        <div className="scene-tex rounded-2xl bg-gradient-to-br from-blue-500/90 to-indigo-700/80 p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <MediaImage path={profile.avatarUrl} label={profile.firstName} className="h-14 w-14 rounded-full ring-2 ring-white/40" seed={3} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-white/80">
                <Flame size={11} className="inline -mt-0.5" /> {profile.currentStreak ?? 0} · {L('Level', 'مستوى')} {profile.level ?? 1}
                {lastWorkoutDays !== null && (
                  <span> · {L(`Last workout ${lastWorkoutDays === 0 ? 'today' : `${lastWorkoutDays}d ago`}`, lastWorkoutDays === 0 ? 'اتمرن النهارده' : `آخر تمرين من ${lastWorkoutDays} يوم`)}</span>
                )}
              </p>
            </div>
            {(quietDays ?? 0) >= 4 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/90 px-2 py-1 text-[10px] font-bold text-amber-950">
                <Moon size={11} /> {L(`Quiet ${quietDays}d`, `ساكت من ${quietDays} أيام`)}
              </span>
            )}
          </div>
          {profile.goalText && (
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/15 p-2.5 text-xs leading-snug">
              <Target size={13} className="mt-0.5 shrink-0" /> <span className="min-w-0">{profile.goalText}</span>
            </p>
          )}
        </div>
      </motion.section>

      {/* 14-day activity: the ghosting detector, one bar per day. */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }} className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><CalendarDays size={15} /> {L('Last 14 days', 'آخر ١٤ يوم')}</h2>
        <div className="flex items-end justify-between gap-1" style={{ height: 72 }}>
          {week.map((w) => (
            <div key={w.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="w-full origin-bottom rounded-t-md bg-brand-blue"
                style={{ height: `${(w.count / maxCount) * 56 + 4}px`, opacity: w.count ? 1 : 0.2 }}
                title={`${w.day}: ${w.count}`}
              />
              <span className="text-[9px] text-gray-400">{new Date(w.day).toLocaleDateString(i18n.language, { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Weight trend — same sparkline language as the member's own Progress page. */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }} className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><TrendingDown size={15} /> {t('progress2.weightTrend')}</h2>
        {weightTrend.length > 1 ? (
          <>
            <Sparkline points={weightTrend.map((w) => w.weightKg)} />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>{weightTrend[0].weightKg} {t('session.kg')}</span>
              <span>{weightTrend[weightTrend.length - 1].weightKg} {t('session.kg')}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400">{L('Not enough weigh-ins yet', 'لسه مافيش وزنات كفاية')}</p>
        )}
      </motion.section>

      {/* PRs — best working set per exercise (warm-ups excluded server-side). */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }} className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Trophy size={15} className="text-amber-500" /> {L('Personal records', 'أفضل أرقامه')}</h2>
        {prs.length ? (
          <div className="space-y-2">
            {prs.map((pr) => (
              <div key={pr.exercise} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{pr.exercise}</span>
                <span className="shrink-0 text-sm font-bold text-brand-blue" dir="ltr">
                  {pr.weightKg} {t('session.kg')}{pr.reps ? ` × ${pr.reps}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">{L('No logged lifts yet', 'لسه ماسجّلش أوزان')}</p>
        )}
      </motion.section>

      {/* My programs × this client: adherence bars. */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }} className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Dumbbell size={15} /> {L('My programs with them', 'برامجي معاه')}</h2>
        {myPrograms.length ? (
          <div className="space-y-3">
            {myPrograms.map((p) => {
              const pct = p.daysCount ? Math.round((p.completedCount / p.daysCount) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {p.title}
                      {p.visibility === 'clients' && <Lock size={10} className="ms-1 inline text-violet-500" />}
                    </span>
                    <span className="shrink-0 font-bold text-gray-400">
                      {p.enrolled
                        ? `${p.completedCount}/${p.daysCount}${p.assignedBy ? ` · ${L('assigned', 'متبعت له')}` : ''}`
                        : L('not enrolled', 'مش مشترك')}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.enrolled ? pct : 0}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-blue to-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">{L('You have no programs yet — build one from the dashboard', 'لسه ماعندكش برامج — اعمل واحد من الداشبورد')}</p>
        )}
      </motion.section>

      {/* Sticky actions: assign a program / open the DM. */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] gap-2 bg-gradient-to-t from-white via-white/95 to-transparent p-4 pt-6">
        <button onClick={() => setAssignOpen(true)} className="btn-pill btn-primary flex-1 justify-center">
          <Send size={15} /> {L('Assign program', 'ابعتله برنامج')}
        </button>
        <button onClick={() => openDm.mutate()} disabled={openDm.isPending} className="btn-pill btn-ghost flex-1 justify-center">
          <MessageCircle size={15} /> {L('Message', 'كلمه')}
        </button>
      </div>

      {/* Assign bottom sheet — pick one of MY programs. */}
      <Sheet open={assignOpen} onClose={() => setAssignOpen(false)} label={L('Assign a program', 'ابعتله برنامج')}>
        <div className="p-5 pb-8">
          <h3 className="mb-1 font-bold">{L('Assign a program', 'ابعتله برنامج')}</h3>
          <p className="mb-4 text-xs text-gray-400">{L(`${profile.firstName} gets a notification and the program appears in their app`, `${profile.firstName} هيوصله إشعار والبرنامج هيظهر عنده في الأبلكيشن`)}</p>
          {myPrograms.length ? (
            <div className="space-y-2">
              {myPrograms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => assign.mutate(p.id)}
                  disabled={assign.isPending}
                  className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-start"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Dumbbell size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.title}</span>
                    <span className="block text-xs text-gray-400">
                      {t('coach.daysCount', { n: p.daysCount })}
                      {p.visibility === 'clients' && ` · ${L('clients only', 'للعملاء فقط')}`}
                    </span>
                  </span>
                  {p.enrolled ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700"><Check size={11} /> {L('Enrolled', 'مشترك')}</span>
                  ) : (
                    <Send size={16} className="shrink-0 text-brand-blue" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Dumbbell size={40} />} title={L('No programs yet', 'لسه مافيش برامج')} hint={L('Build one from the coach dashboard first', 'اعمل برنامج الأول من داشبورد الكوتش')} />
          )}
        </div>
      </Sheet>
    </div>
  );
}

/** Same sparkline as Progress.tsx — one polyline, min/max normalized. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const d = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" height={60}>
      <motion.polyline
        points={d}
        fill="none"
        stroke="#00BCD4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
