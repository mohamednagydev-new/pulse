import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

/** Persistent signup bar shown under every guest-browsable screen. Guests can
 *  look at everything content — this is the standing invitation to join, and
 *  the only chrome that distinguishes guest mode from the real app. */
export default function GuestBar() {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs font-semibold text-gray-500">
          <Sparkles size={13} className="mb-0.5 me-1 inline text-brand-pink" />
          {t('guest.bar')}
        </p>
        <Link to="/register" className="btn-pill btn-primary flex min-h-[40px] shrink-0 items-center px-5 text-sm">
          {t('guest.cta')}
        </Link>
      </div>
    </div>
  );
}
