import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, MoreVertical, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Sheet from './Sheet';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { getDeferredPrompt, clearDeferredPrompt, isIOS, isInAppBrowser, isStandalone, markInstalled } from '../lib/install';

const SNOOZE_KEY = 'pulse_install_snooze';
const SNOOZE_DAYS = 3;

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

  // Day-one grace: never auto-nag a brand-new account with the install banner.
  // The cached ['me'] query the whole app shares tells us how old the account is.
  const status = useAuth((s) => s.status);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/me'),
    enabled: status === 'authed',
  });
  const seasoned =
    !!me &&
    (Date.now() - new Date(me.createdAt).getTime() > 86400000 ||
      (me.currentStreak ?? 0) > 0 ||
      (me.xp ?? 0) > 50);

  useEffect(() => {
    // Manual trigger (Settings → Install app) always works, even after snoozing.
    const onManual = () => {
      if (isStandalone()) return;
      setVisible(true);
      // No native prompt available → straight to the platform guide (iOS share
      // steps, browser-menu steps, or escape-the-webview steps).
      if (!getDeferredPrompt()) setIosHelp(true);
    };
    window.addEventListener('pulse:install-open', onManual);
    return () => window.removeEventListener('pulse:install-open', onManual);
  }, []);

  useEffect(() => {
    if (!seasoned || isStandalone() || snoozed()) return;

    const show = () => setVisible(true);
    const timer = setTimeout(show, 8000); // let them look around first
    window.addEventListener('pulse:installable', show);
    return () => {
      window.removeEventListener('pulse:installable', show);
      clearTimeout(timer);
    };
  }, [seasoned]);

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setVisible(false);
    setIosHelp(false);
  };

  const install = async () => {
    const prompt = getDeferredPrompt();
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
      clearDeferredPrompt();
      if (choice.outcome === 'accepted') setVisible(false);
      else dismiss();
    } else {
      // No install API here (iOS, Firefox, in-app webviews) — show the guide
      // for this platform instead of a button that silently does nothing.
      setIosHelp(true);
    }
  };

  return (
    <>
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
      </AnimatePresence>

      <Sheet open={visible && iosHelp} onClose={dismiss} label={t('install.iosTitle')}>
        <InstallGuide
          onDone={() => {
            // Walking the guide is the best signal we will ever get on iOS
            // (no appinstalled event exists there) — stop nagging with the
            // floating button; the Profile/Settings entries remain.
            markInstalled();
            dismiss();
          }}
        />
      </Sheet>
    </>
  );
}

/** Platform-appropriate manual install steps. Three cases:
 *  in-app webview (can't install at all — escape to a real browser first),
 *  iOS (share-menu steps — Apple exposes no install API, by design),
 *  everything else (browser-menu steps, e.g. Firefox Android). */
function InstallGuide({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const kind = isInAppBrowser() ? 'webview' : isIOS() ? 'ios' : 'menu';
  const steps: { icon: ReactNode; text: string }[] =
    kind === 'webview'
      ? [
          { icon: <MoreVertical size={16} />, text: t('install.escape1') },
          { icon: <Compass size={16} />, text: t('install.escape2') },
          { icon: <Share size={16} />, text: t('install.ios1') },
        ]
      : kind === 'ios'
        ? [
            { icon: <Share size={16} />, text: t('install.ios1') },
            { icon: <PlusSquare size={16} />, text: t('install.ios2') },
            { icon: <span className="text-base">✓</span>, text: t('install.ios3') },
          ]
        : [
            { icon: <MoreVertical size={16} />, text: t('install.menu1') },
            { icon: <PlusSquare size={16} />, text: t('install.menu2') },
            { icon: <span className="text-base">✓</span>, text: t('install.ios3') },
          ];
  const title = kind === 'webview' ? t('install.escapeTitle') : kind === 'ios' ? t('install.iosTitle') : t('install.menuTitle');
  const tones = ['bg-brand-blue/10 text-brand-blue', 'bg-brand-green/10 text-brand-green', 'bg-orange-100 text-orange-500'];
  return (
    <div className="px-6 pb-8 pt-3 text-ink">
      <h2 className="text-lg font-bold">{title}</h2>
      <ol className="mt-4 space-y-3 text-sm text-gray-600">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-start">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[i] ?? tones[0]}`}>{s.icon}</span>
            {s.text}
          </li>
        ))}
      </ol>
      <button onClick={onDone} className="btn-pill btn-primary mt-6 w-full">{t('install.gotIt')}</button>
    </div>
  );
}
