import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SNOOZE_KEY = 'pulse_install_snooze';
const SNOOZE_DAYS = 3;

let deferredPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
// Capture as early as module load — the event often fires before React mounts.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as typeof deferredPrompt;
    window.dispatchEvent(new CustomEvent('pulse:installable'));
  });
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
function snoozed() {
  const t = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  return Date.now() - t < SNOOZE_DAYS * 86400000;
}

/** Floating "Install PULSE" banner. Android/desktop: native install prompt.
 *  iOS Safari (no beforeinstallprompt): shows Add-to-Home-Screen steps. */
export default function InstallPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    // Manual trigger (Settings → Install app) always works, even after snoozing.
    const onManual = () => {
      if (isStandalone()) return;
      setVisible(true);
      if (!deferredPrompt && isIOS()) setIosHelp(true);
    };
    window.addEventListener('pulse:install-open', onManual);

    if (isStandalone() || snoozed()) return () => window.removeEventListener('pulse:install-open', onManual);

    const show = () => setVisible(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (deferredPrompt || isIOS()) {
      timer = setTimeout(show, 8000); // let them look around first
    }
    window.addEventListener('pulse:installable', show);
    return () => {
      window.removeEventListener('pulse:install-open', onManual);
      window.removeEventListener('pulse:installable', show);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setVisible(false);
    setIosHelp(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
      deferredPrompt = null;
      if (choice.outcome === 'accepted') setVisible(false);
      else dismiss();
    } else if (isIOS()) {
      setIosHelp(true);
    }
  };

  return (
    <AnimatePresence>
      {visible && !iosHelp && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 z-40 mx-auto w-[min(92%,440px)]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
        >
          <div className="flex items-center gap-3 rounded-2xl glass-nav p-3 shadow-2xl ring-1 ring-black/5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}>
              <Download size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{t('install.title')}</p>
              <p className="truncate text-xs text-gray-500">{t('install.desc')}</p>
            </div>
            <button onClick={install} className="btn-pill btn-primary shrink-0 px-4 py-2 text-sm">{t('install.btn')}</button>
            <button onClick={dismiss} aria-label={t('install.gotIt')} className="shrink-0 p-1 text-gray-400"><X size={18} /></button>
          </div>
        </motion.div>
      )}

      {visible && iosHelp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={dismiss}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="w-full max-w-[480px] rounded-t-3xl bg-white p-6 pb-10 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
            <h2 className="text-lg font-bold">{t('install.iosTitle')}</h2>
            <ol className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-3 text-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"><Share size={16} /></span>
                {t('install.ios1')}
              </li>
              <li className="flex items-center gap-3 text-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><PlusSquare size={16} /></span>
                {t('install.ios2')}
              </li>
              <li className="flex items-center gap-3 text-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500 text-base">✓</span>
                {t('install.ios3')}
              </li>
            </ol>
            <button onClick={dismiss} className="btn-pill btn-primary mt-6 w-full">{t('install.gotIt')}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
