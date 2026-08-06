import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { api } from '../lib/api';
import { MediaImage } from './ui';

interface Program {
  id: string;
  title: string;
  titleAr?: string | null;
  coverImage?: string | null;
  level?: string | null;
  coach?: { name: string; type: string } | null;
}
interface Current {
  enrolled: boolean;
  program?: Program;
  total?: number;
  completed?: number;
  next?: { id: string; title: string; titleAr?: string | null } | null;
  justFinished?: Program;
  next_?: Program | null;
}

/** Where the user is in their programme — the piece that turns a library of
 *  programs into somewhere to come back to. Shows nothing until they start one. */
export default function PathCard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');

  const { data } = useQuery<Current>({
    queryKey: ['path-current'],
    queryFn: () => api.get('/api/path/current'),
    staleTime: 60_000,
  });
  if (!data) return null;

  // Just finished one — celebrate it and hand over the next, rather than dropping
  // them back to a generic "pick a program" prompt.
  if (!data.enrolled && data.justFinished) {
    const nextP = (data as any).next as Program | null;
    return (
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm"
      >
        <div className="flex items-center gap-3 p-4">
          <span className="text-2xl" aria-hidden>🏆</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{t('path.programDone')}</p>
            <p className="truncate text-sm font-bold">
              {(isAr && data.justFinished.titleAr) || data.justFinished.title}
            </p>
          </div>
        </div>
        {nextP && (
          <button
            onClick={() => navigate(`/programs/${nextP.id}`)}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 border-t border-white/20 text-sm font-bold transition active:scale-[0.98]"
          >
            {t('path.whatNext')}: {(isAr && nextP.titleAr) || nextP.title}
            <ArrowRight size={15} className="rtl:rotate-180" />
          </button>
        )}
      </motion.section>
    );
  }

  // Not mid-program: the "get my plan" / "pick a program" next steps now live
  // as chips inside the Today strip — one hero, not a stack of CTA cards.
  if (!data.enrolled) return null;

  const p = data.program!;
  const total = data.total ?? 0;
  const done = data.completed ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const title = (isAr && p.titleAr) || p.title;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 p-3">
        <MediaImage path={p.coverImage} label={title} className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-blue">{t('path.continuing')}</p>
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-xs text-gray-400">
            {t('path.dayOf', { n: Math.min(done + 1, total), total })}
          </p>
        </div>
      </div>

      <div className="px-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-brand-blue"
          />
        </div>
      </div>

      <button
        onClick={() => navigate(data.next ? `/lesson/${data.next.id}` : `/programs/${p.id}`)}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 border-t border-gray-100 text-sm font-bold text-brand-blue transition active:scale-[0.98]"
      >
        <Play size={15} fill="currentColor" />
        {data.next ? (isAr && data.next.titleAr) || data.next.title : t('path.viewProgram')}
      </button>
    </motion.section>
  );
}
