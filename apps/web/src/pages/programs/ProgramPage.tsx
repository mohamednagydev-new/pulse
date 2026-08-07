import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Play, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg, MediaImage, formatDuration } from '../../components/ui';
import TopBar from '../../components/TopBar';
import BookmarkButton from '../../components/BookmarkButton';
import RelatedReels from '../../components/RelatedReels';
import { toast } from '../../lib/toast';
import { celebrateFeedback, tapFeedback } from '../../lib/haptics';
import PlanPrompt from '../../components/PlanPrompt';
import { useAuth } from '../../store/auth';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function ProgramPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const authed = useAuth((s) => s.status === 'authed');

  // Authed: /api/path/program/:id (program + this user's completions/status).
  // Guest: the public /api/programs/:id — same program and lessons, no personal
  // fields, so the page renders instead of a red "Unauthorized" box.
  const { data: program, isLoading, error } = useQuery<any>({
    queryKey: ['path-program', id, authed],
    queryFn: () => api.get(authed ? `/api/path/program/${id}` : `/api/programs/${id}`),
  });

  const [askPlan, setAskPlan] = useState(false);

  /** Only used to decide whether to ask for the intake first. A failure here must
   *  never block someone from starting, so it falls back to "they have one". */
  const { data: plan } = useQuery<{ hasPlan: boolean }>({
    queryKey: ['assessment'],
    queryFn: () => api.get('/api/assessment'),
    enabled: authed,
  });
  const needsPlan = plan?.hasPlan === false;

  const start = useMutation({
    mutationFn: () => api.post(`/api/path/program/${id}/start`),
    onSuccess: (res: any) => {
      celebrateFeedback();
      qc.invalidateQueries({ queryKey: ['path-program', id] });
      qc.invalidateQueries({ queryKey: ['path-current'] });
      if (res?.next) navigate(`/lesson/${res.next.id}`);
    },
    onError: (e: any) => toast(e?.message ?? t('common.somethingWrong'), 'error'),
  });

  // Loading/error keep the section shell + a back affordance — no bare screen, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen pb-10">
        <TopBar color="bg-gradient-to-b from-brand-blue to-blue-500" textColor="text-white" curved />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const isYoga = program.coach?.type === 'YOGA';
  const lessons: any[] = program.lessons ?? [];
  const total = program.total ?? lessons.length;
  const done = program.completed ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const started = program.status === 'active' || program.status === 'completed' || done > 0;
  const finished = program.status === 'completed';

  return (
    <div className="min-h-screen pb-10">
      <TopBar
        title={program.coach?.name}
        color={`bg-gradient-to-b ${isYoga ? 'from-brand-pink to-pink-500' : 'from-brand-blue to-blue-500'}`}
        textColor="text-white"
        curved
      />

      <div className="mt-4 px-4">
        <div className="relative">
          <MediaImage path={program.coverImage} label={program.title} className="h-40 w-full rounded-2xl" seed={2} />
          <div className="absolute end-3 top-3"><BookmarkButton type="program" id={program.id} /></div>
        </div>

        {/* Overlaps the cover — needs relative z-10 or the positioned cover paints over it. */}
        <div className={`relative z-10 mx-auto -mt-5 w-[88%] rounded-2xl px-4 py-2.5 text-center shadow-lg ${isYoga ? 'bg-brand-pink' : 'bg-brand-blue'}`}>
          <p className="line-clamp-2 text-base font-bold leading-snug text-white">{program.title}</p>
        </div>

        {program.description && (
          <p className="mt-4 px-2 text-center text-sm leading-relaxed text-gray-500">{program.description}</p>
        )}

        {/* Progress — the thing that makes this a path rather than a list */}
        {started && total > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-gray-500">{t('path.progress')}</span>
              <span className="text-sm font-extrabold tabular-nums">{done}/{total}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full ${finished ? 'bg-brand-green' : 'bg-brand-blue'}`}
              />
            </div>
          </div>
        )}

        {/* One clear action, whatever state they're in */}
        {!started ? (
          <button
            onClick={() => {
              tapFeedback();
              // Guests can look all they want — starting is the moment to join.
              if (!authed) return navigate('/register');
              // The one moment the intake is worth asking for: they are committing to
              // a programme, so the answers would actually change what they get.
              if (needsPlan) setAskPlan(true);
              else start.mutate();
            }}
            disabled={start.isPending || total === 0}
            className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
          >
            <Play size={16} fill="currentColor" /> {start.isPending ? t('path.starting') : t('path.startProgram')}
          </button>
        ) : finished ? (
          <div className="mt-4 flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-600">
            <Sparkles size={16} /> {t('path.programDone')}
          </div>
        ) : program.nextLesson ? (
          <button
            onClick={() => navigate(`/lesson/${program.nextLesson.id}`)}
            className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            <Play size={16} fill="currentColor" /> {t('path.continueWith', { title: program.nextLesson.title })}
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3 px-4">
        {lessons.map((lesson: any, idx: number) => {
          const isNext = program.nextLesson?.id === lesson.id;
          return (
            <Link
              key={lesson.id}
              to={`/lesson/${lesson.id}`}
              className={`flex gap-3 rounded-2xl p-1.5 transition ${isNext ? 'bg-orange-50 ring-1 ring-orange-500/30' : ''}`}
            >
              <div className="relative h-24 w-36 shrink-0">
                <MediaImage path={lesson.thumbnail} label={`Lesson ${idx + 1}`} className="h-24 w-36 rounded-xl" seed={idx} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur ${
                      lesson.completed ? 'bg-brand-green/85' : 'bg-white/40'
                    }`}
                  >
                    {lesson.completed
                      ? <Check size={17} className="text-white" strokeWidth={3} />
                      : <Play size={16} fill="white" className="text-white" />}
                  </div>
                </div>
                {lesson.durationSec ? (
                  <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
                    {formatDuration(lesson.durationSec)}
                  </span>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className={`font-semibold leading-tight line-clamp-2 ${lesson.completed ? 'text-gray-400' : ''}`}>
                  {lesson.title}
                </p>
                {isNext && (
                  <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-orange-500">
                    {t('path.upNext')}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Finished it — hand them the next one instead of a dead end */}
      {program.nextProgram && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mt-6 px-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('path.whatNext')}</p>
          <Link
            to={`/programs/${program.nextProgram.id}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition active:scale-[0.98]"
          >
            <MediaImage path={program.nextProgram.coverImage} label={program.nextProgram.title} className="h-14 w-14 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{program.nextProgram.title}</span>
              <span className="block truncate text-xs text-gray-400">
                {program.nextProgram._count?.lessons ?? 0} {t('path.lessons')}
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
          </Link>
        </motion.div>
      )}

      <RelatedReels
        keyword={program.reelKeyword || (isYoga ? `${program.title} yoga` : `${(program.level || 'beginner').toLowerCase()} workout plan`)}
        className="mt-8 px-4"
      />

      <AnimatePresence>
        {askPlan && (
          <PlanPrompt
            onClose={() => setAskPlan(false)}
            onSkip={() => {
              setAskPlan(false);
              start.mutate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
