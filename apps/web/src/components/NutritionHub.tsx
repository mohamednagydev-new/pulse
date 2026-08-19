import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import Confetti from './Confetti';

/** Shape of GET /api/tracker/diet-journey — the same payload the old thin
 *  banner on the Tracker consumed. The hub now owns that data. */
export type DietJourney = {
  active: boolean;
  startWeightKg?: number;
  targetWeightKg?: number;
  currentWeightKg?: number;
  pct?: number;
  onTrack?: boolean;
  etaWeeks?: number;
  weeksIn?: number;
};

/**
 * The "Nutrition" hub of the Food tab. Three products that used to blur into
 * each other are named by FUNCTION, one line each:
 *   1. Weight goal (diet journey) — the HEADLINE card, with live progress and
 *      the weight quick-log right where a weigh-in changes the needle.
 *   2. Your daily meal plan  -> /meals
 *   3. Group commitment      -> /diet-programs
 * plus a small front door to the wellness kitchen & articles.
 */
export default function NutritionHub({ journey }: { journey?: DietJourney }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  return (
    <div className="mx-4 mt-6">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{isAr ? 'التغذية' : 'Nutrition'}</p>

      {/* HEADLINE — the weight goal owns the diet journey now. */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-extrabold">
            <span className="text-lg">🎯</span> {isAr ? 'هدف الوزن' : 'Weight goal'}
          </p>
          {journey?.active ? (
            <span className={`text-[11px] font-bold ${journey.onTrack ? 'text-emerald-500' : 'text-amber-500'}`}>
              {journey.onTrack ? t('diet.onTrack') : t('diet.behind')}
            </span>
          ) : (
            <Link to="/progress" className="text-[11px] font-bold text-brand-blue">
              {isAr ? 'ابدأ رحلة' : 'Start a journey'}
            </Link>
          )}
        </div>

        {journey?.active ? (
          <Link to="/progress" className="mt-3 block">
            <span className="flex items-end justify-between text-xs text-gray-400">
              <span>
                <span className="block text-2xl font-extrabold text-ink">{journey.currentWeightKg} {t('session.kg')}</span>
                {isAr ? 'دلوقتي' : 'now'}
              </span>
              <span className="text-end">
                <span className="block text-base font-extrabold text-gray-500">{journey.targetWeightKg} {t('session.kg')} 🏁</span>
                {isAr ? 'الهدف' : 'target'}
              </span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-100">
              <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-600" style={{ width: `${journey.pct ?? 0}%` }} />
            </span>
          </Link>
        ) : (
          <Link to="/progress" className="mt-1 block text-xs text-gray-400">
            {t('diet.trackerCtaSub')}
          </Link>
        )}

        {/* A weigh-in is what moves the needle above — so the quick-log lives here. */}
        <div className="mt-3 border-t border-gray-50 pt-3">
          <WeightQuickLog />
        </div>
      </div>

      {/* The two other diet products, clearly told apart by what they DO. */}
      <Link
        to="/meals"
        className="mt-2 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm transition active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg">🍽️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{isAr ? 'خطة أكل يومك' : 'Your daily meal plan'}</span>
          <span className="block truncate text-xs text-gray-400">{isAr ? 'متظبطة على هدف سعراتك' : 'Built from your calorie target'}</span>
        </span>
      </Link>

      <Link
        to="/diet-programs"
        className="mt-2 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm transition active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">🥗</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{isAr ? 'التزام جماعي' : 'Group commitment'}</span>
          <span className="block truncate text-xs text-gray-400">{isAr ? 'تحديات متتبعة من ١٤ لـ٣٠ يوم' : '14–30 day tracked challenges'}</span>
        </span>
      </Link>

      {/* Wellness is leaving the tab bar — this row is one of its new front doors. */}
      <Link
        to="/wellness"
        className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white/70 px-3.5 py-3 text-sm shadow-sm transition active:scale-[0.98]"
      >
        <span className="text-lg">🥣</span>
        <span className="min-w-0 flex-1 truncate font-bold text-gray-600">{isAr ? 'مطبخ العافية والمقالات' : 'Wellness kitchen & articles'}</span>
        <span className="shrink-0 text-xs text-gray-300">{isAr ? '‹' : '›'}</span>
      </Link>
    </div>
  );
}

/** One number, one tap — same writer Progress uses; a weigh-in here updates the
 *  journey needle directly above it (and can even finish the journey). */
function WeightQuickLog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [kg, setKg] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const save = useMutation({
    mutationFn: () => api.post('/api/tracker/weight', { weightKg: Number(kg) }),
    onSuccess: (r: any) => {
      setKg('');
      qc.invalidateQueries({ queryKey: ['progress'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['diet-journey'] });
      if (r?.journeyCompleted) {
        setCelebrate(true);
        toast(t('diet.completed'), 'success');
      } else {
        toast(t('progress2.weightSaved'), 'success');
      }
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const n = Number(kg);
  const valid = Number.isFinite(n) && n >= 20 && n <= 400;
  return (
    <div className="flex items-center gap-2">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
      <input
        inputMode="decimal"
        className="input-field min-w-0 flex-1"
        placeholder={t('progress2.weightPh')}
        value={kg}
        onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ''))}
      />
      <button
        onClick={() => valid && save.mutate()}
        disabled={!valid || save.isPending}
        className="btn-pill btn-primary min-h-[42px] shrink-0 px-5 text-sm disabled:opacity-50"
      >
        {t('common.save')}
      </button>
    </div>
  );
}
