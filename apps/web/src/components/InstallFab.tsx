import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { installAvailable, openInstall } from '../lib/install';

/**
 * Small persistent install button, floating above the tab bar until the app is
 * actually installed. The banner (InstallPrompt) snoozes for days after a
 * dismissal — this stays, so the install path is never more than one tap away.
 */
export default function InstallFab() {
  const { t } = useTranslation();
  const [show, setShow] = useState(installAvailable());

  useEffect(() => {
    const update = () => setShow(installAvailable());
    window.addEventListener('pulse:installable', update);
    window.addEventListener('pulse:installed', update);
    return () => {
      window.removeEventListener('pulse:installable', update);
      window.removeEventListener('pulse:installed', update);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          whileTap={{ scale: 0.9 }}
          onClick={openInstall}
          aria-label={t('install.title')}
          className="fixed end-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-orange-500/30"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
            backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)',
          }}
        >
          <Download size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
