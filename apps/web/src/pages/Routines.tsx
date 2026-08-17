import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, Copy, Dumbbell, Globe, ListChecks, Lock, Pencil, Play, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { Loader, EmptyState, ErrorMsg } from '../components/ui';
import ScreenHeader from '../components/ScreenHeader';
import WaShareButton from '../components/WaShare';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type RoutineExercise = { name: string; sets: number; reps: number; weightKg?: number };
type Routine = {
  id: string;
  title: string;
  exercises: RoutineExercise[];
  muscleFocus?: string | null;
  isPublic: boolean;
  sourceId?: string | null;
  copies: number;
  createdAt: string;
};

export default function Routines() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['routines'],
    queryFn: () => api.get('/api/routines'),
  });
  const routines: Routine[] = Array.isArray(data) ? data : [];

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; isPublic?: boolean }) =>
      api.patch(`/api/routines/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
    onError: (e: any) => toast(e?.message || L('Could not update', 'معرفناش نعدّله'), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/routines/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routines'] }); toast(L('Routine deleted', 'الروتين اتمسح'), 'success'); },
    onError: (e: any) => toast(e?.message || L('Could not delete', 'معرفناش نمسحه'), 'error'),
  });

  const rename = (r: Routine) => {
    const title = window.prompt(L('Routine name', 'اسم الروتين'), r.title)?.trim();
    if (title && title !== r.title) patch.mutate({ id: r.id, title });
  };

  /** The whole routine as plain text — travels on WhatsApp, no account needed to read it. */
  const shareText = (r: Routine) => {
    const lines = r.exercises.map(
      (e) => `• ${e.name} — ${e.sets}×${e.reps}${e.weightKg ? ` @ ${e.weightKg} ${L('kg', 'كجم')}` : ''}`,
    );
    return isAr
      ? `روتين «${r.title}» بتاعي على PULSE 💪\n${lines.join('\n')}\nجرّبه — التطبيق مجاني ١٠٠٪:\n${window.location.origin}`
      : `My "${r.title}" routine on PULSE 💪\n${lines.join('\n')}\nTry it — the app is 100% free:\n${window.location.origin}`;
  };

  return (
    <div className="min-h-screen pb-10">
      <ScreenHeader tone="hero" padBottom="pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
              if (idx > 0) navigate(-1);
              else navigate('/workout', { replace: true });
            }}
            aria-label={t('common.back', { defaultValue: 'Back' })}
            className="-ms-2 flex min-h-11 min-w-11 items-center justify-center"
          >
            <ChevronLeft size={26} className="rtl:rotate-180" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">{L('My Routines', 'روتيناتي')}</h1>
          <span className="h-11 w-11" aria-hidden />
        </div>
        <p className="mt-1 text-center text-xs text-white/75">
          {L('Your saved workouts — start one anytime', 'تماريتك المحفوظة — ابدأ واحد في أي وقت')}
        </p>
      </ScreenHeader>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg onRetry={() => refetch()} />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={44} />}
          title={L('No routines yet', 'لسه مفيش روتينات')}
          hint={L(
            'Finish any workout and tap "Save as routine" on the celebration screen — it lands here, with your real weights.',
            'خلص أي تمرين ودوس «احفظه روتين» في شاشة النهاية — هتلاقيه هنا بأوزانك الحقيقية.',
          )}
          action={
            <button onClick={() => navigate('/workout')} className="btn-pill btn-primary px-6">
              <Dumbbell size={16} /> {L('Start a workout', 'ابدأ تمرين')}
            </button>
          }
        />
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {routines.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: Math.min(i, 5) * 0.05 }}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                    {r.muscleFocus && <span className="font-semibold text-brand-pink">{r.muscleFocus}</span>}
                    <span>{r.exercises.length} {L('exercises', 'تمرين')}</span>
                    {r.copies > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Copy size={11} /> {r.copies} {L('copies', 'نسخة')}
                      </span>
                    )}
                  </p>
                  {r.exercises.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {r.exercises.slice(0, 3).map((e) => e.name).join(' · ')}
                      {r.exercises.length > 3 ? ' …' : ''}
                    </p>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  transition={spring}
                  onClick={() => navigate(`/session/r/${r.id}`)}
                  aria-label={L('Start', 'ابدأ')}
                  className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                >
                  <Play size={18} />
                </motion.button>
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-2.5">
                {/* Public routines show on your profile so buddies can copy them. */}
                <button
                  onClick={() => patch.mutate({ id: r.id, isPublic: !r.isPublic })}
                  className={`flex min-h-[32px] items-center gap-1 rounded-full px-3 text-[11px] font-bold transition active:scale-95 ${
                    r.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {r.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  {r.isPublic ? L('Public', 'للكل') : L('Private', 'ليا بس')}
                </button>
                <button
                  onClick={() => rename(r)}
                  aria-label={L('Rename', 'غيّر الاسم')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition active:scale-90"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => window.confirm(L('Delete this routine?', 'تمسح الروتين ده؟')) && remove.mutate(r.id)}
                  aria-label={L('Delete', 'امسح')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 transition active:scale-90"
                >
                  <Trash2 size={13} />
                </button>
                <div className="ms-auto">
                  <WaShareButton text={shareText(r)} />
                </div>
              </div>
            </motion.div>
          ))}
          <p className="px-2 pt-1 text-center text-[11px] leading-relaxed text-gray-400">
            {L(
              'Tip: finish a workout and tap "Save as routine" to capture the weights you actually lifted.',
              'نصيحة: خلص تمرين ودوس «احفظه روتين» عشان تحفظ الأوزان اللي شلتها فعلًا.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
