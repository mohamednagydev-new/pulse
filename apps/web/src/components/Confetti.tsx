import { useEffect, useMemo } from 'react';

const COLORS = ['#F97316', '#22C55E', '#2563EB', '#0D9488', '#F59E0B', '#E11D48', '#FB923C'];

/** One-shot celebration burst. Renders ~44 falling pieces, then calls onDone. */
export default function Confetti({ onDone }: { onDone?: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.25,
        dur: 1.3 + Math.random() * 0.9,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 8,
      })),
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] mx-auto max-w-[480px] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
