import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Share, X } from 'lucide-react';
import { api } from '../lib/api';
import { getPushState, enablePush, type PushState } from '../lib/push';
import { toast } from '../lib/toast';
import { pulseChime } from '../lib/chime';

const SNOOZE_KEY = 'pulse_push_nudge_snooze';
// Aggressive mode (owner call, Aug 2026): every 3 days instead of 14 — the
// push-enabled count IS the retainable-user count, so we push harder for it.
const SNOOZE_DAYS = 3;

/**
 * The permission ask, timed to an earned moment: only appears once the user has
 * finished a workout or joined a challenge — people who just did something say
 * yes to "want us to remind you?" far more than cold visitors. Browsers only
 * allow the native prompt after a tap, so a card like this is the only way to
 * get subscribed at scale (the Settings toggle alone converts nobody).
 * On iOS Safari (not installed) push doesn't exist, so it pitches
 * add-to-Home-Screen instead. Dismiss snoozes it for 14 days.
 */
export default function PushNudge() {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  const [snoozed, setSnoozed] = useState(() => {
    const ts = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() - ts < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState(null));
  }, []);

  // Same warm queries GettingStarted uses — no extra network cost.
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const { data: challenges } = useQuery({ queryKey: ['challenges'], queryFn: () => api.get('/api/gamification/challenges'), staleTime: 60_000 });

  // Aggressive mode: any activity counts — a completion, a joined challenge,
  // or simply having the app data loaded on a second visit. The polite
  // earned-moment-only gate left the push count growing too slowly.
  const earned =
    (progress?.totalCompletions ?? 0) > 0 ||
    (Array.isArray(challenges) && challenges.some((c: any) => c.joined)) ||
    progress !== undefined; // data loaded at all = user is here, ask

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  // iOS can only push from the installed app — pitch the install first.
  const iosInstallPitch = state === 'unsupported' && isIos && !standalone;

  if (snoozed || !earned || state === null) return null;
  if (state !== 'default' && !iosInstallPitch) return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setSnoozed(true);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const ok = await enablePush();
      if (ok) {
        pulseChime(); // let them hear the app's sound the moment they opt in
        toast(t('pushNudge.done'), 'success');
      }
      setSnoozed(true); // granted or denied — either way the card's job is over
      if (!ok) localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      toast(t('pushNudge.failed'), 'error');
      snooze();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/25"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          {iosInstallPitch ? <Share size={19} /> : <Bell size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold">
            {t(iosInstallPitch ? 'pushNudge.iosTitle' : 'pushNudge.title')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-white/85">
            {t(iosInstallPitch ? 'pushNudge.iosBody' : 'pushNudge.body')}
          </p>
          {!iosInstallPitch && (
            <button
              onClick={enable}
              disabled={busy}
              className="mt-3 min-h-[40px] rounded-full bg-white px-5 text-sm font-extrabold text-orange-600 shadow disabled:opacity-60"
            >
              {busy ? t('pushNudge.enabling') : t('pushNudge.cta')}
            </button>
          )}
        </div>
        <button onClick={snooze} aria-label={t('common.close', { defaultValue: 'Close' })} className="shrink-0 text-white/60">
          <X size={16} />
        </button>
      </div>
    </motion.section>
  );
}
