import { AnimatePresence, motion } from 'framer-motion';
import { useToasts } from '../lib/toast';

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    // role=status + aria-live: toasts are the app's primary error channel, and
    // without this every failure is silent to a screen reader. Safe-area top so
    // they clear the notch in installed/standalone mode.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[90] mx-auto flex max-w-[480px] flex-col items-center gap-2 px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className={`pointer-events-auto rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
              t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-brand-green' : 'bg-ink'
            }`}
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
