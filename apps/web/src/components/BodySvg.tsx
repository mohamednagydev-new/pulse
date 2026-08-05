/**
 * Stylized front/back body silhouette for the muscle-map. Muscle-group hotspots
 * are overlaid by ExercisesPage/WorkoutHub using posX/posY. Colors come from
 * `currentColor`, so the caller sets the tone (dark silhouette on white cards,
 * light on dark heroes). Swap this for real Canva/SVG art later by replacing the
 * <path> data — the hotspot overlay is independent.
 */
import { canonicalMuscle } from '../lib/muscleNames';
/**
 *
 * Pass `highlight` (a muscle-group name, case-insensitive) to light up the
 * matching anatomical region with a pulsing brand-orange fill.
 */

/** Anatomical region shapes, keyed by lowercase muscle-group name.
 *  Shapes are positioned over the silhouette (viewBox 0 0 200 470) and are
 *  rendered ABOVE it; fill/stroke come from the highlight group. */
const REGIONS: Record<string, JSX.Element> = {
  // ---- front ----
  shoulders: (
    <>
      <ellipse cx="56" cy="86" rx="13" ry="12" />
      <ellipse cx="144" cy="86" rx="13" ry="12" />
    </>
  ),
  chest: (
    <>
      <ellipse cx="82" cy="108" rx="14" ry="10" />
      <ellipse cx="118" cy="108" rx="14" ry="10" />
    </>
  ),
  biceps: (
    <>
      <ellipse cx="46" cy="150" rx="8" ry="22" />
      <ellipse cx="154" cy="150" rx="8" ry="22" />
    </>
  ),
  forearm: (
    <>
      <ellipse cx="48" cy="236" rx="7" ry="26" />
      <ellipse cx="152" cy="236" rx="7" ry="26" />
    </>
  ),
  abs: <rect x="84" y="150" width="32" height="46" rx="10" />,
  obliques: (
    <>
      <ellipse cx="76" cy="170" rx="7" ry="26" />
      <ellipse cx="124" cy="170" rx="7" ry="26" />
    </>
  ),
  quads: (
    <>
      <ellipse cx="76" cy="310" rx="11" ry="40" />
      <ellipse cx="124" cy="310" rx="11" ry="40" />
    </>
  ),
  abductors: (
    <>
      <ellipse cx="66" cy="298" rx="6" ry="30" />
      <ellipse cx="134" cy="298" rx="6" ry="30" />
    </>
  ),
  adductors: (
    <>
      <ellipse cx="86" cy="294" rx="6" ry="28" />
      <ellipse cx="114" cy="294" rx="6" ry="28" />
    </>
  ),
  cardio: (
    // Heart centered around (100,115)
    <path d="M100 130 C85 117 84 104 92 101 C97 99 100 103 100 107 C100 103 103 99 108 101 C116 104 115 117 100 130 Z" />
  ),
  // ---- back ----
  triceps: (
    <>
      <ellipse cx="47" cy="152" rx="8" ry="23" />
      <ellipse cx="153" cy="152" rx="8" ry="23" />
    </>
  ),
  traps: (
    <>
      <ellipse cx="86" cy="80" rx="11" ry="12" />
      <ellipse cx="114" cy="80" rx="11" ry="12" />
    </>
  ),
  lats: (
    <>
      <ellipse cx="80" cy="150" rx="10" ry="35" />
      <ellipse cx="120" cy="150" rx="10" ry="35" />
    </>
  ),
  'lower back': <rect x="86" y="195" width="28" height="40" rx="8" />,
  glutes: (
    <>
      <ellipse cx="86" cy="258" rx="12" ry="12" />
      <ellipse cx="114" cy="258" rx="12" ry="12" />
    </>
  ),
  hamstrings: (
    <>
      <ellipse cx="78" cy="320" rx="10" ry="38" />
      <ellipse cx="122" cy="320" rx="10" ry="38" />
    </>
  ),
  calves: (
    <>
      <ellipse cx="78" cy="405" rx="9" ry="28" />
      <ellipse cx="122" cy="405" rx="9" ry="28" />
    </>
  ),
};

/** True when a muscle-group name maps to an anatomical region overlay.
 *  canonicalMuscle translates Arabic names — the API localises `name`, and
 *  without this every Arabic muscle map fell back to the generic dot. */
export function hasRegion(name?: string | null): boolean {
  return !!name && !!REGIONS[canonicalMuscle(name)];
}

export default function BodySvg({
  side,
  highlight,
  className = '',
}: {
  side: 'front' | 'back';
  highlight?: string;
  className?: string;
}) {
  const region = highlight ? REGIONS[canonicalMuscle(highlight)] : undefined;

  return (
    <svg viewBox="0 0 200 470" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Silhouette — inherits color from the parent via currentColor */}
      <g fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1">
        {/* Head */}
        <ellipse cx="100" cy="30" rx="19" ry="23" />
        {/* Neck */}
        <rect x="90" y="50" width="20" height="16" rx="6" />
        {/* Torso */}
        <path d="M62 74 C74 66 126 66 138 74 C146 80 150 96 150 120 L146 190 C146 210 132 226 128 250 L72 250 C68 226 54 210 54 190 L50 120 C50 96 54 80 62 74 Z" />
        {/* Shoulders / deltoids */}
        <ellipse cx="56" cy="86" rx="16" ry="15" />
        <ellipse cx="144" cy="86" rx="16" ry="15" />
        {/* Arms */}
        <path d="M46 90 C38 96 34 120 34 150 C34 175 38 196 44 210 L56 206 C52 188 50 168 52 150 C54 128 56 108 60 96 Z" />
        <path d="M154 90 C162 96 166 120 166 150 C166 175 162 196 156 210 L144 206 C148 188 150 168 148 150 C146 128 144 108 140 96 Z" />
        {/* Forearms */}
        <path d="M40 206 C38 228 40 250 46 268 L58 264 C54 246 54 226 56 208 Z" />
        <path d="M160 206 C162 228 160 250 154 268 L142 264 C146 246 146 226 144 208 Z" />
        {/* Legs */}
        <path d="M74 252 C72 300 74 350 80 400 C82 424 84 446 84 462 L70 462 C64 430 58 380 58 330 C58 300 62 274 70 252 Z" />
        <path d="M126 252 C128 300 126 350 120 400 C118 424 116 446 116 462 L130 462 C136 430 142 380 142 330 C142 300 138 274 130 252 Z" />
      </g>

      {side === 'front' ? (
        <g stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.2" fill="none">
          {/* pecs */}
          <path d="M74 108 C86 100 98 100 100 112 C102 100 114 100 126 108" />
          {/* sternum + abs */}
          <line x1="100" y1="112" x2="100" y2="196" />
          <line x1="82" y1="150" x2="118" y2="150" />
          <line x1="84" y1="168" x2="116" y2="168" />
          <line x1="86" y1="186" x2="114" y2="186" />
        </g>
      ) : (
        <g stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.2" fill="none">
          {/* spine */}
          <line x1="100" y1="80" x2="100" y2="240" />
          {/* lats / traps hint */}
          <path d="M72 96 C82 120 84 160 92 190" />
          <path d="M128 96 C118 120 116 160 108 190" />
          {/* glutes */}
          <path d="M78 250 C90 262 110 262 122 250" />
        </g>
      )}

      {/* Highlighted muscle region — brand-orange pulse above the silhouette */}
      {region && (
        <g fill="#f97316" opacity="0.55" stroke="#fdba74" strokeOpacity="0.9" strokeWidth="1">
          <animate attributeName="opacity" values="0.35;0.7;0.35" dur="1.6s" repeatCount="indefinite" />
          {region}
        </g>
      )}
    </svg>
  );
}
