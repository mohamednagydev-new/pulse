import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPushState, enablePush, disablePush, type PushState } from '../lib/push';

export default function PushToggle() {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unavailable'));
  }, []);

  // Browser can't do push at all — render nothing.
  if (state === 'unsupported') return null;

  // Server has no VAPID key configured, SW not active yet, etc.
  if (state === 'unavailable') {
    return <p className="text-sm text-gray-400">{t('reminders.unavailable')}</p>;
  }

  const label =
    state === 'subscribed'
      ? t('reminders.on')
      : state === 'denied'
        ? t('reminders.blocked')
        : t('reminders.enable');

  const onClick = async () => {
    if (state !== 'default' && state !== 'subscribed') return;
    setBusy(true);
    try {
      if (state === 'subscribed') {
        await disablePush();
        setState('default');
      } else {
        const ok = await enablePush();
        setState(ok ? 'subscribed' : 'denied');
      }
    } catch {
      setState('unavailable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={onClick}
        disabled={busy || state === 'denied'}
        className={`flex w-full items-center gap-2 rounded-2xl border p-4 font-semibold disabled:opacity-70 ${
          state === 'subscribed'
            ? 'border-brand-green/40 bg-brand-green/5 text-brand-green'
            : 'border-gray-200 bg-white'
        }`}
      >
        {state === 'subscribed' ? (
          <Bell size={18} className="text-brand-green" />
        ) : (
          <BellOff size={18} />
        )}
        {busy
          ? state === 'subscribed'
            ? t('reminders.disabling')
            : t('reminders.enabling')
          : label}
      </button>
      {state === 'subscribed' && !busy && (
        <p className="text-xs text-gray-400">{t('reminders.tapOff')}</p>
      )}
      {state === 'denied' && (
        <p className="text-xs text-gray-400">{t('reminders.blockedHint')}</p>
      )}
    </div>
  );
}
