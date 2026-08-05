import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone, MonitorX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';

const DISMISS_KEY = 'pulse_desktop_ok';

/** Desktop visitors get a friendly "this is a mobile experience" gate with a QR
 *  to open on their phone. Admins are fully exempt (the dashboard is desktop-first),
 *  admin routes too, and "Continue anyway" is remembered for the session. */
export default function DesktopGate() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    setShow(isDesktop && !isStandalone && !dismissed);
  }, []);

  if (!show || user?.role === 'ADMIN' || location.pathname.startsWith('/admin')) return null;

  const appUrl = window.location.origin;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(appUrl)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0b0a] p-8 text-white">
      <div className="fitness-hero absolute inset-0 opacity-60" aria-hidden />
      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <span className="text-3xl font-extrabold italic tracking-tight">PULSE</span>
        <div className="animate-float mt-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 ring-4 ring-white/10 backdrop-blur">
          <Smartphone size={40} strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">{t('gate.title')}</h1>
        <p className="mt-2 text-white/70">{t('gate.desc')}</p>

        <div className="mt-6 rounded-2xl bg-white p-3 shadow-2xl">
          <img src={qr} alt={`QR code for ${appUrl}`} width={170} height={170} className="rounded-lg" />
        </div>
        <p className="mt-3 text-sm font-semibold text-white/80">{t('gate.scan')}</p>
        <p className="text-xs text-white/50">{appUrl.replace(/^https?:\/\//, '')}</p>

        <button
          onClick={() => { sessionStorage.setItem(DISMISS_KEY, '1'); setShow(false); }}
          className="mt-8 flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
        >
          <MonitorX size={16} /> {t('gate.cont')}
        </button>
      </div>
    </div>
  );
}
