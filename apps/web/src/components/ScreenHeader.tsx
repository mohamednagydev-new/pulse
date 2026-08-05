import type { ReactNode } from 'react';

/**
 * The one header container every top-level screen uses. Before this, each tab
 * hand-rolled its own hero: different curves (28px vs 40%), different bottom
 * paddings, and almost everything in the same orange. Now the shape, curve and
 * safe-area math are identical everywhere and only the TONE changes — each tab
 * owns a color: Home orange, Programs blue, Community violet, Wellness green,
 * Profile teal (matching the section-color idea from the original design PDF).
 */

export type HeaderTone = 'hero' | 'blue' | 'pink' | 'green' | 'teal' | 'violet';

const TONE_CLASS: Record<HeaderTone, string> = {
  hero: 'fitness-hero',
  blue: 'hero-blue',
  pink: 'hero-pink',
  green: 'hero-green',
  teal: 'hero-teal',
  violet: 'hero-violet',
};

export default function ScreenHeader({
  tone = 'hero',
  padBottom = 'pb-7',
  className = '',
  children,
}: {
  tone?: HeaderTone;
  /** Tailwind pb-* utility — screens with overlapping content (Profile avatar) pass a bigger one. */
  padBottom?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <header
      className={`relative ${TONE_CLASS[tone]} rounded-b-[28px] px-5 ${padBottom} text-white ${className}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
    >
      {children}
    </header>
  );
}
