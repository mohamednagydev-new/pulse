import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

export default function TopBar({
  title,
  color = 'bg-white',
  textColor = 'text-ink',
  curved = false,
  fallback = '/',
}: {
  title?: string;
  color?: string;
  textColor?: string;
  curved?: boolean;
  /** Where Back goes when there is nothing behind this screen. */
  fallback?: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  /**
   * Back must never leave the site.
   *
   * Screens reached by a redirect — the coaching intake, the login bounce, a shared
   * link opened cold — have no history entry behind them, because those redirects use
   * `replace`. `navigate(-1)` there walks straight out of the app, which reads as the
   * site crashing rather than as navigation.
   *
   * React Router keeps its position in `history.state.idx`. Zero means this is the
   * first entry in the session, so we send them somewhere real instead.
   */
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };

  return (
    <header
      className={`${color} ${textColor} ${color !== 'bg-white' ? 'scene-tex' : ''} sticky top-0 z-30 flex items-center px-4 py-4 ${
        curved ? 'rounded-b-[32px] pb-8' : 'mb-4'
      }`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      {/* min 44px target; rtl:rotate-180 so the arrow points "back" in Arabic too —
          this header is on 40+ screens, so a wrong-way arrow here is app-wide. */}
      <button onClick={goBack} aria-label={t('common.back')} className="-ms-2 flex min-h-11 min-w-11 items-center justify-center">
        <ChevronLeft size={26} className="rtl:rotate-180" />
      </button>
      {title && <h1 className="mx-auto pe-8 text-lg font-bold uppercase tracking-wide">{title}</h1>}
    </header>
  );
}
