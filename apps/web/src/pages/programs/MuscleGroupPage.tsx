import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Dumbbell } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import ExerciseVisual from '../../components/ExerciseVisual';
import ContentVideo from '../../components/ContentVideo';
import RelatedReels from '../../components/RelatedReels';

export default function MuscleGroupPage() {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const [open, setOpen] = useState<string | null>(null);
  const { data: group, isLoading, error } = useQuery({
    queryKey: ['muscle-group', groupId],
    queryFn: () => api.get(`/api/muscle-groups/${groupId}`),
  });

  // Loading/error keep the dark shell + a back affordance — no white flash, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-gray-900 pb-10 text-white">
        <TopBar title={t('exercises.title')} color="bg-transparent" textColor="text-white" />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-10 text-white">
      <TopBar title={t('exercises.title')} color="bg-transparent" textColor="text-white" />
      <div className="mb-4 inline-block max-w-[80%] break-words rounded-e-full bg-gradient-to-r from-teal-600 to-teal-500 py-2 ps-6 pe-10 text-lg font-bold">
        {group.name}
      </div>

      <div className="space-y-3 px-4">
        {(group.exercises ?? []).map((ex: any, idx: number) => {
          const isOpen = open === ex.id;
          const chips = [ex.sets, ex.reps, ex.level].filter(Boolean) as string[];
          return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.2) }}
              className="overflow-hidden rounded-2xl bg-white/5"
            >
              <button onClick={() => setOpen(isOpen ? null : ex.id)} className="flex w-full items-center gap-3 p-3 text-start">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-teal-500/10 text-teal-300">
                  <ExerciseVisual name={ex.name || group.name} videoUrl={ex.videoUrl} className="h-14 w-14" animClassName="h-10 w-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{ex.name}</p>
                  {chips.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {chips.map((c, i) => <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-300">{c}</span>)}
                    </div>
                  )}
                </div>
                <ChevronDown className={`shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="space-y-4 p-4 text-sm">
                      {/* Expanded is where someone is actually deciding how to do it,
                          so give them the whole demo rather than a still. */}
                      {ex.videoUrl || ex.videoId ? (
                        <ContentVideo videoId={ex.videoId} videoUrl={ex.videoUrl} label={ex.name} />
                      ) : (
                        <div className="mx-auto h-28 w-28 overflow-hidden rounded-3xl bg-teal-500/10 text-teal-300">
                          <ExerciseVisual name={ex.name || group.name} className="h-28 w-28" animClassName="h-20 w-20" />
                        </div>
                      )}

                      {ex.caution && (
                        <p className="rounded-xl bg-amber-400/15 p-3 text-xs leading-relaxed text-amber-100">
                          {t('session.careArea', { areas: (ex.flaggedFor ?? []).join(', ') })}
                          {ex.saferAlternative ? ` ${t('session.trySafer', { name: ex.saferAlternative })}` : ''}
                        </p>
                      )}
                      {ex.description && <p className="text-center leading-relaxed text-gray-300">{ex.description}</p>}
                      {Array.isArray(ex.equipment) && ex.equipment.length > 0 && (
                        <p className="flex items-center justify-center gap-2 text-gray-400"><Dumbbell size={14} /> {ex.equipment.join(', ')}</p>
                      )}
                      {Array.isArray(ex.instructions) && ex.instructions.length > 0 && (
                        <div className="space-y-2">
                          {ex.instructions.map((step: string, i: number) => (
                            <div key={i} className="flex gap-3 rounded-xl bg-white/5 p-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300">{i + 1}</span>
                              <span className="leading-relaxed text-gray-200">{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <RelatedReels keyword={group.reelKeyword || `${group.name} workout`} className="mt-8 px-4" />
    </div>
  );
}
