import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Dumbbell, Play } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import ExerciseVisual from '../../components/ExerciseVisual';
import ContentVideo from '../../components/ContentVideo';
import RelatedReels from '../../components/RelatedReels';

export default function MuscleGroupPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [open, setOpen] = useState<string | null>(null);
  /** null = follow the user's intake answer; true/false = they chose here. */
  const [params] = useSearchParams();
  const [homeFilter, setHomeFilter] = useState<boolean | null>(params.get('home') === '1' ? true : null);
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

  const all: any[] = group.exercises ?? [];
  const noKitCount = all.filter((e) => e.equipmentTier === 0).length;
  // Someone who told us they own nothing shouldn't have to filter every time —
  // default to their answer, but let anyone flip it.
  const homeOnly = homeFilter ?? group.myEquipmentTier === 0;
  const shown = homeOnly ? all.filter((e) => e.equipmentTier === 0) : all;

  return (
    <div className="min-h-screen bg-gray-900 pb-10 text-white">
      <TopBar title={t('exercises.title')} color="bg-transparent" textColor="text-white" />
      <div className="mb-4 inline-block max-w-[80%] break-words rounded-e-full bg-gradient-to-r from-teal-600 to-teal-500 py-2 ps-6 pe-10 text-lg font-bold">
        {group.name}
      </div>

      {/* Browse by what you actually own — the intake answer was invisible
          until now, and "no equipment" users had to guess which rows applied. */}
      {noKitCount > 0 && noKitCount < all.length && (
        <div className="mb-3 flex gap-2 px-4">
          <button
            onClick={() => setHomeFilter(false)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${!homeOnly ? 'bg-white text-gray-900' : 'bg-white/10 text-white/70'}`}
          >
            {isAr ? `الكل (${all.length})` : `All (${all.length})`}
          </button>
          <button
            onClick={() => setHomeFilter(true)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${homeOnly ? 'bg-emerald-400 text-gray-900' : 'bg-white/10 text-white/70'}`}
          >
            🏠 {isAr ? `من غير معدات (${noKitCount})` : `No equipment (${noKitCount})`}
          </button>
        </div>
      )}

      <div className="space-y-3 px-4">
        {shown.map((ex: any, idx: number) => {
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
                      {/* Say plainly whether they can do this TODAY with what
                          they told us they own — the intake asked, so the app
                          owes them the answer. */}
                      {ex.equipmentTier === 0 ? (
                        <p className="flex items-center justify-center gap-2 font-semibold text-emerald-300">
                          🏠 {isAr ? 'من غير أي معدات' : 'No equipment needed'}
                        </p>
                      ) : Array.isArray(ex.equipment) && ex.equipment.length > 0 ? (
                        <p className={`flex items-center justify-center gap-2 ${ex.fitsEquipment === false ? 'text-amber-300' : 'text-gray-400'}`}>
                          <Dumbbell size={14} /> {ex.equipment.join(', ')}
                          {ex.fitsEquipment === false && <span className="font-semibold">· {isAr ? 'محتاج معدات مش عندك' : 'needs kit you don’t have'}</span>}
                        </p>
                      ) : null}
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

      {/* Sticky start CTA — browsing the list used to dead-end here; this hands
          the whole group straight to the guided session player. */}
      <div
        className="sticky bottom-0 z-20 mt-6 border-t border-white/10 bg-gray-900/90 p-4 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <button onClick={() => navigate(`/session/${groupId}`)} className="btn-pill btn-primary w-full">
          <Play size={18} /> {isAr ? 'ابدأ التمرين ده' : 'Start this workout'} <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
