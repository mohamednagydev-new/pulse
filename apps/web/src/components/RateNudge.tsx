import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storeReviewUrl } from '../lib/install';

/**
 * Store-review ask, fired only on WIN moments (`pulse:win-moment`, dispatched
 * when a workout finishes). Reviews in the first weeks decide store ranking,
 * and asking right after a win is when people actually say yes.
 *
 * Discipline: needs 3 wins before the first ask, 30-day snooze on "later",
 * never again once they tap rate. Shows only where a store exists for this
 * platform (Play now, App Store once APP_STORE_URL is set).
 */
const DONE_KEY = 'pulse_rate_done';
const SNOOZE_KEY = 'pulse_rate_snooze';
const COUNT_KEY = 'pulse_win_count';
const MIN_WINS = 3;
const SNOOZE_DAYS = 30;

function eligible(): boolean {
  try {
    if (!storeReviewUrl()) return false;
    if (localStorage.getItem(DONE_KEY) === '1') return false;
    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (Date.now() - snoozedAt < SNOOZE_DAYS * 86400000) return false;
    const wins = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
    localStorage.setItem(COUNT_KEY, String(wins));
    return wins >= MIN_WINS;
  } catch {
    return false; // private mode — never nag when we can't remember doing so
  }
}

export default function RateNudge() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onWin = () => {
      // Let the confetti/celebration land first — the ask rides the high, not
      // interrupts it.
      if (eligible()) setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener('pulse:win-moment', onWin);
    return () => window.removeEventListener('pulse:win-moment', onWin);
  }, []);

  const later = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* private mode */ }
    setVisible(false);
  };

  const rate = () => {
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* private mode */ }
    setVisible(false);
    const url = storeReviewUrl();
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 z-[70] mx-auto w-[min(92%,420px)]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}
        >
          <div className="rounded-2xl glass-nav p-4 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-ink">{t('rate.title')}</p>
              <button onClick={later} aria-label={t('rate.later')} className="shrink-0 p-1 text-gray-400"><X size={16} /></button>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('rate.desc')}</p>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={rate} className="btn-pill btn-primary flex-1 py-2 text-sm">⭐ {t('rate.cta')}</button>
              <button onClick={later} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {t('rate.later')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
