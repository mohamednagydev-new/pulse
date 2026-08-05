import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Slim connectivity banner. The app has no offline mode — without this, a lost
 * connection just looks like every screen silently emptied.
 * Language read directly from storage: this must render even before i18n loads.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  const ar = (localStorage.getItem('fitit_lang') || 'en') === 'ar';
  return (
    <div
      role="status"
      className="fixed inset-x-0 z-[95] mx-auto flex max-w-[480px] items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-xs font-semibold text-white"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <WifiOff size={14} aria-hidden />
      {ar ? 'النت مقطوع — هنكمّل أول ما يرجع' : "You're offline — we'll catch up when you're back"}
    </div>
  );
}
