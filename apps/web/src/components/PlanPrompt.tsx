import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CalendarDays, ClipboardList, Target, X } from 'lucide-react';

/**
 * Asked once, at the moment it matters: someone is about to start a programme.
 *
 * The intake used to be a wall in front of the whole app. Now it is a question asked
 * when the answer would actually change something — which is also the only moment
 * the user has any reason to care. Before this point, "what hurts?" is an
 * interrogation; here, it is the difference between the right programme and a guess.
 *
 * "Start anyway" is a real option and not a dark pattern. Someone who wants to try a
 * programme cold should be able to, and pretending otherwise only teaches people to
 * distrust the buttons.
 */
export default function PlanPrompt({
  onClose,
  onSkip,
}: {
  onClose: () => void;
  /** Proceed without a plan. */
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const reasons = [
    { icon: Target, text: t('planPrompt.r1') },
    { icon: AlertTriangle, text: t('planPrompt.r2') },
    { icon: CalendarDays, text: t('planPrompt.r3') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-auto rounded-t-3xl bg-white p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-snug">{t('planPrompt.title')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('planPrompt.sub')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="-me-1 -mt-1 shrink-0 p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-2.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                <r.icon size={14} />
              </span>
              <span className="text-[13px] leading-relaxed text-gray-600">{r.text}</span>
            </li>
          ))}
        </ul>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/my-plan')}
          className="btn-pill btn-primary mt-5 flex min-h-[50px] w-full items-center justify-center gap-2"
        >
          <ClipboardList size={17} /> {t('planPrompt.build')}
          <ArrowRight size={15} className="rtl:rotate-180" />
        </motion.button>

        <button
          onClick={onSkip}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-2xl text-sm font-semibold text-gray-500 active:scale-[0.98]"
        >
          {t('planPrompt.skip')}
        </button>
      </motion.div>
    </motion.div>
  );
}
