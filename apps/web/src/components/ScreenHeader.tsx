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

/* Translucent tone gradients instead of the old solid hero blocks: the app
   texture breathes through, matching the glass cards below — each tab still
   owns its color, it just wears it as tinted glass now. */
const TONE_CLASS: Record<HeaderTone, string> = {
  hero: 'bg-gradient-to-b from-orange-600/85 via-rose-700/70 to-rose-900/55',
  blue: 'bg-gradient-to-b from-blue-600/85 to-indigo-900/60',
  pink: 'bg-gradient-to-b from-orange-500/85 to-rose-800/60',
  green: 'bg-gradient-to-b from-green-600/85 to-teal-900/60',
  teal: 'bg-gradient-to-b from-teal-600/85 to-cyan-950/60',
  violet: 'bg-gradient-to-b from-violet-600/85 to-purple-950/60',
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
      className={`scene-tex ${TONE_CLASS[tone]} rounded-b-[28px] border-b border-white/10 px-5 backdrop-blur-sm ${padBottom} text-white ${className}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.25rem)' }}
    >
      {children}
    </header>
  );
}
