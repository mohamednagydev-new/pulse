import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bluetooth, HeartPulse, X } from 'lucide-react';
import { api } from '../lib/api';
import { connectHr, hrSupported, hrZone, ZONE_COLORS, type HrHandle } from '../lib/bluetoothHr';

/**
 * Live heart-rate pill for the workout session. Self-contained: connect button
 * → live bpm with zone color → avg/max summary while connected. Renders
 * nothing where Web Bluetooth doesn't exist (iOS), so no dead UI ships there.
 */
export default function HrMonitor({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const [state, setState] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [bpm, setBpm] = useState(0);
  const stats = useRef({ sum: 0, n: 0, max: 0 });
  const handle = useRef<HrHandle | null>(null);

  useEffect(() => () => handle.current?.stop(), []);

  if (!hrSupported()) return null;

  const connect = async () => {
    setState('connecting');
    try {
      handle.current = await connectHr(
        (reading) => {
          stats.current.sum += reading;
          stats.current.n += 1;
          stats.current.max = Math.max(stats.current.max, reading);
          setBpm(reading);
          setState('live');
        },
        () => setState('idle'),
      );
    } catch {
      // User cancelled the chooser or the device refused — not an app error.
      setState('idle');
    }
  };

  const disconnect = () => {
    handle.current?.stop();
    handle.current = null;
    setState('idle');
  };

  if (state === 'idle' || state === 'error') {
    return (
      <button
        onClick={connect}
        className={`flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-bold text-white/80 transition active:scale-95 ${className}`}
      >
        <Bluetooth size={13} /> {isAr ? 'نبضك ⌚' : 'HR ⌚'}
      </button>
    );
  }

  if (state === 'connecting') {
    return (
      <span className={`flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-bold text-white/60 ${className}`}>
        <Bluetooth size={13} className="animate-pulse" /> {isAr ? 'بيتوصل…' : 'Connecting…'}
      </span>
    );
  }

  const { zone } = hrZone(bpm, me?.birthYear);
  const avg = stats.current.n ? Math.round(stats.current.sum / stats.current.n) : 0;
  return (
    <span
      className={`flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-bold text-white ${className}`}
      style={{ backgroundColor: `${ZONE_COLORS[zone]}cc` }}
    >
      <HeartPulse size={14} className="animate-pulse" />
      <span dir="ltr" className="tabular-nums text-sm">{bpm}</span>
      <span className="opacity-80">Z{zone}</span>
      <span className="opacity-60" dir="ltr">{isAr ? `متوسط ${avg} · أقصى ${stats.current.max}` : `avg ${avg} · max ${stats.current.max}`}</span>
      <button onClick={disconnect} aria-label={isAr ? 'افصل' : 'Disconnect'} className="rounded-full p-0.5 opacity-70">
        <X size={12} />
      </button>
    </span>
  );
}
