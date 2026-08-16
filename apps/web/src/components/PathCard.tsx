import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

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

  // Enrolled mid-program: render NOTHING. The Today strip already shows the
  // next lesson with the same Start action — this card was the same info and
  // the same navigation twice on one screen (user feedback). The strip's
  // subtitle carries the day-N-of-M progress now.
  return null;
}
