import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * "See it, don't read it": a swipeable rail of real app screenshots with
 * captions. Tap any frame to view it full-size. Reuses the chip-row edge fade
 * so the rail advertises its own scrollability.
 */

export interface Shot {
  src: string;
  ar: string;
  en: string;
}

/** The current-UI walkthrough, shared by Landing, Help and the feature map. */
export const APP_SHOTS: Shot[] = [
  { src: '/landing/shots/s-home.jpg', ar: 'يومك في شاشة هادية', en: 'Your day, one calm screen' },
  { src: '/landing/shots/s-muscles.jpg', ar: 'دوس على العضلة وخد جلسة', en: 'Tap a muscle, get a session' },
  { src: '/landing/shots/s-tracker.jpg', ar: 'سعرات بالأكل المصري', en: 'Calories with Egyptian food' },
  { src: '/landing/shots/s-meals.jpg', ar: 'خطة أكل بتشرح نفسها', en: 'A meal plan that explains itself' },
  { src: '/landing/shots/s-progress.jpg', ar: 'تقدمك ورحلة الدايت', en: 'Progress & your diet journey' },
  { src: '/landing/shots/s-group.jpg', ar: 'حصص لايف مع الناس', en: 'Live classes together' },
  { src: '/landing/shots/s-wellness.jpg', ar: 'مكتبة صحتك بالعربي', en: 'Wellness library in Arabic' },
  { src: '/landing/shots/s-features.jpg', ar: 'كنوز PULSE كلها', en: 'All the PULSE treasures' },
];

export default function ScreenshotRail({ shots = APP_SHOTS, className = '' }: { shots?: Shot[]; className?: string }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [zoom, setZoom] = useState<Shot | null>(null);

  return (
    <div className={className}>
      <div className="chip-row flex gap-3 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar">
        {shots.map((s) => (
          <button key={s.src} onClick={() => setZoom(s)} className="w-36 shrink-0 text-center">
            <img
              src={s.src}
              alt={isAr ? s.ar : s.en}
              loading="lazy"
              className="w-36 rounded-2xl shadow-lg ring-2 ring-white/15 transition active:scale-95"
            />
            <p className="mt-1.5 truncate px-1 text-xs font-semibold opacity-70">{isAr ? s.ar : s.en}</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          >
            <motion.img
              src={zoom.src}
              alt=""
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="max-h-[80dvh] rounded-3xl shadow-2xl ring-4 ring-white/20"
            />
            <p className="mt-3 text-sm font-bold text-white">{isAr ? zoom.ar : zoom.en}</p>
            <button aria-label="close" className="absolute right-5 top-5 rounded-full bg-white/15 p-2 text-white">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
