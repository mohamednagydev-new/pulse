import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

/**
 * Custom pull-to-refresh. The app sets `overscroll-behavior-y: none` (needed to
 * stop scroll chaining), which also removes Android's native pull-to-refresh —
 * and iOS standalone never had one. This reimplements the gesture: pull down
 * from the very top, past the threshold, and every query on screen refetches.
 *
 * Excluded surfaces: full-screen gesture UIs where a downward drag means
 * something else (reels swiping, chat scrollback, live group rooms, sessions).
 */
const EXCLUDED = [/^\/reels/, /^\/session\//, /^\/chat\//, /^\/group\//, /^\/admin/, /^\/onboarding/, /^\/challenge\//];

const MAX_PULL = 110; // px of indicator travel
const TRIGGER = 64; // indicator px needed to fire (≈145px of finger travel)

export default function PullToRefresh() {
  const qc = useQueryClient();
  const location = useLocation();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const gesture = useRef({ startY: 0, active: false, pull: 0 });
  const excluded = EXCLUDED.some((r) => r.test(location.pathname));

  useEffect(() => {
    if (excluded) return;

    const setPullBoth = (v: number) => {
      gesture.current.pull = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || gesture.current.active) return;
      gesture.current = { startY: e.touches[0].clientY, active: true, pull: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!gesture.current.active) return;
      const dy = e.touches[0].clientY - gesture.current.startY;
      // Page scrolled or finger moved up — this is a scroll, not a pull.
      if (window.scrollY > 0 || dy <= 0) {
        if (gesture.current.pull) setPullBoth(0);
        return;
      }
      setPullBoth(Math.min(dy * 0.45, MAX_PULL)); // resistance curve
    };
    const onEnd = () => {
      if (!gesture.current.active) return;
      const fired = gesture.current.pull >= TRIGGER;
      gesture.current.active = false;
      if (!fired) return setPullBoth(0);
      setBusy(true);
      setPullBoth(TRIGGER);
      qc.refetchQueries({ type: 'active' })
        .catch(() => {})
        .finally(() => {
          setBusy(false);
          setPullBoth(0);
        });
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [excluded, qc]);

  if (excluded || (pull <= 0 && !busy)) return null;

  const progress = Math.min(pull / TRIGGER, 1);
  return (
    <div
      aria-hidden={!busy}
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[85] flex justify-center"
      style={{ top: `calc(env(safe-area-inset-top, 0px) + ${Math.max(pull - 44, 6)}px)` }}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-pink shadow-lg ring-1 ring-black/5"
        style={{ opacity: busy ? 1 : 0.35 + progress * 0.65 }}
      >
        <RefreshCw
          size={18}
          className={busy ? 'animate-spin' : ''}
          style={busy ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </span>
    </div>
  );
}
