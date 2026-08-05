import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/** Animated number that counts up to `value` on mount / value change. */
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    // font-display = Fraunces: every counted stat gets the serif numeral voice.
    <span ref={ref} className={`font-display ${className ?? ''}`}>
      {value}
    </span>
  );
}
