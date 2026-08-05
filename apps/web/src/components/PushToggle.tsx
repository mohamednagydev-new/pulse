import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getPushState, enablePush, type PushState } from '../lib/push';

export default function PushToggle() {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unavailable'));
  }, []);

  // Browser can't do push at all — render nothing.
  if (state === 'unsupported') return null;

  // Server has no VAPID key configured, SW not active yet, etc.
  if (state === 'unavailable') {
    return <p className="text-sm text-gray-400">Push notifications aren't available right now.</p>;
  }

  const label =
    state === 'subscribed'
      ? 'Notifications on'
      : state === 'denied'
        ? 'Notifications blocked'
        : 'Enable notifications';

  const onClick = async () => {
    if (state !== 'default') return;
    setBusy(true);
    try {
      const ok = await enablePush();
      setState(ok ? 'subscribed' : 'denied');
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
        disabled={busy || state !== 'default'}
        className="flex w-full items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 font-semibold disabled:opacity-70"
      >
        {state === 'subscribed' ? (
          <Bell size={18} className="text-brand-green" />
        ) : (
          <BellOff size={18} />
        )}
        {busy ? 'Enabling…' : label}
      </button>
      {state === 'denied' && (
        <p className="text-xs text-gray-400">
          Notifications are blocked in your browser settings. Allow them for this site to turn reminders on.
        </p>
      )}
    </div>
  );
}
