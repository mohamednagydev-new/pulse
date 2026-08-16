import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ChevronRight, ClipboardList, Dumbbell, Trophy, HeartHandshake, X, HelpCircle, Gift } from 'lucide-react';
import { waOpen } from './WaShare';
import { api } from '../lib/api';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const DISMISS_KEY = 'pulse_gs_dismissed';

/**
 * First-session orientation. New users said they land on Home and don't know
 * what the app has or where to start — a checklist fixes that better than a
 * tour: every row is a real action, progress is visible, and it disappears
 * forever once life has started (or on dismiss).
 */
export default function GettingStarted() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  // Collapsed by default — a one-line summary bar. The full checklist was the
  // single biggest block on Home; opening it is now the user's decision.
  const [open, setOpen] = useState(false);

  // All signals are queries other cards already keep warm.
  const { data: plan } = useQuery({ queryKey: ['assessment'], queryFn: () => api.get('/api/assessment'), staleTime: 5 * 60_000 });
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const { data: buddies } = useQuery({ queryKey: ['buddies'], queryFn: () => api.get('/api/social/buddies') });
  const { data: challenges } = useQuery({ queryKey: ['challenges'], queryFn: () => api.get('/api/gamification/challenges'), staleTime: 60_000 });
  const { data: referral } = useQuery({ queryKey: ['referral'], queryFn: () => api.get('/api/me/referral'), staleTime: Infinity });

  // Invite goes straight to WhatsApp with the personal link — referral was
  // buried in Settings, and friends-who-train-together is the stickiest
  // configuration this app has.
  const inviteNow = () => {
    if (!referral?.link) return navigate('/info');
    waOpen(t('gs.inviteMsg', { link: referral.link }));
  };

  const steps = [
    { key: 'plan', icon: ClipboardList, done: plan?.hasPlan === true, action: () => navigate('/my-plan'), label: t('gs.plan') },
    { key: 'workout', icon: Dumbbell, done: (progress?.totalCompletions ?? 0) > 0, action: () => navigate('/workout'), label: t('gs.workout') },
    { key: 'challenge', icon: Trophy, done: Array.isArray(challenges) && challenges.some((c: any) => c.joined), action: () => navigate('/achievements'), label: t('gs.challenge') },
    { key: 'buddy', icon: HeartHandshake, done: Array.isArray(buddies) && buddies.length > 0, action: () => navigate('/people'), label: t('gs.buddy') },
    { key: 'invite', icon: Gift, done: (referral?.invited ?? 0) > 0, action: inviteNow, label: t('gs.invite') },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  // Vanish when finished, dismissed, or before data lands (no flash for veterans).
  if (dismissed || !progress || doneCount === steps.length) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 p-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
          <span aria-hidden>🚀</span>
          <span className="min-w-0 flex-1 truncate text-base font-bold">{t('gs.title')}</span>
          <span className="font-display shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-600">
            {doneCount}/{steps.length}
          </span>
          <ChevronRight size={17} className={`shrink-0 text-gray-300 transition-transform ${open ? 'rotate-90' : 'rtl:rotate-180'}`} />
        </button>
        <button onClick={dismiss} aria-label={t('common.close', { defaultValue: 'Close' })} className="shrink-0 p-1 text-gray-300">
          <X size={16} />
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.25 }}>
          <p className="px-4 pb-1 text-xs text-gray-400">{t('gs.sub')}</p>
          <div className="px-2 pb-2">
            {steps.map(({ key, icon: Icon, done, action, label }, i) => (
              <button
                key={key}
                onClick={() => !done && action()}
                disabled={done}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start transition active:bg-gray-50"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    done ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <Icon size={17} className={`shrink-0 ${done ? 'text-gray-300' : 'text-gray-500'}`} />
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${done ? 'text-gray-400 line-through' : ''}`}>
                  {label}
                </span>
                {!done && <ChevronRight size={16} className="shrink-0 text-gray-300 rtl:rotate-180" />}
              </button>
            ))}
          </div>

          {/* "What is all this?" — the full guide, one tap, for the still-lost. */}
          <button
            onClick={() => navigate('/help')}
            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 border-t border-gray-100 text-xs font-bold text-brand-blue"
          >
            <HelpCircle size={14} /> {t('gs.whatIsThis')}
          </button>
        </motion.div>
      )}
    </motion.section>
  );
}
