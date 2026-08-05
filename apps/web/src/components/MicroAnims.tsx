/**
 * Micro-animations for non-training surfaces.
 *
 * The exercise figures fixed the workout screens, but quests, habits and
 * milestones were still walls of text with an emoji at best. These are the
 * everyday moments — drink, eat, walk, stretch, streak, win — drawn in the same
 * language as the movement patterns: `currentColor` so the caller sets the tone,
 * SMIL rather than JS so they cost nothing to run, one clear moving part each.
 */

type AnimProps = { className?: string };
const EASE = '0.4 0 0.2 1';

/** Water glass — the level rises and falls, bubbles drifting up through it. */
export function WaterAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <clipPath id="micro-water-glass">
        <path d="M32 20 L36 85 Q36 90 41 90 H59 Q64 90 64 85 L68 20 Z" />
      </clipPath>
      <g clipPath="url(#micro-water-glass)">
        <rect x="28" y="34" width="44" height="60" fill="currentColor" opacity="0.35">
          <animate attributeName="y" values="84;34;84" keyTimes="0;0.5;1" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        </rect>
        <circle cx="45" r="2.5" fill="currentColor" opacity="0">
          <animate attributeName="cy" values="84;50" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.55;0" keyTimes="0;0.5;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="56" r="2" fill="currentColor" opacity="0">
          <animate attributeName="cy" values="86;58" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.5;0" keyTimes="0;0.6;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>
      <path d="M32 20 L36 85 Q36 90 41 90 H59 Q64 90 64 85 L68 20 Z" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}

/** Flickering flame — layered tongues breathing at slightly different rates. */
export function FlameAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* base sits at the group origin so SMIL scale flickers from the ground up */}
      <g transform="translate(50 88)">
        <path d="M0 0 C-17 -5 -18 -27 0 -50 C18 -27 17 -5 0 0 Z" fill="currentColor" opacity="0.35">
          <animateTransform attributeName="transform" type="scale" values="1 1; 1.07 0.94; 0.96 1.05; 1 1" keyTimes="0;0.35;0.7;1" dur="1.9s" repeatCount="indefinite" />
        </path>
        <path d="M0 0 C-11 -4 -12 -19 0 -35 C12 -19 11 -4 0 0 Z" fill="currentColor" opacity="0.65">
          <animateTransform attributeName="transform" type="scale" values="1 1; 0.93 1.08; 1.05 0.95; 1 1" keyTimes="0;0.4;0.75;1" dur="1.6s" repeatCount="indefinite" />
        </path>
        <path d="M0 0 C-5 -3 -6 -10 0 -18 C6 -10 5 -3 0 0 Z" fill="currentColor">
          <animate attributeName="opacity" values="1;0.75;1" dur="1.5s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}

/** Side-view walk — legs scissor, arms counter-swing, a small bob on each step. */
export function WalkAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="14" y1="90" x2="86" y2="90" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 2.5; 0 0" keyTimes="0;0.5;1" dur="0.45s" repeatCount="indefinite" />
        <circle cx="50" cy="24" r="5" fill="currentColor" />
        <line x1="50" y1="30" x2="50" y2="58" stroke="currentColor" strokeWidth="6" />
        <g>
          <animateTransform attributeName="transform" type="rotate" values="26 50 36; -26 50 36; 26 50 36" keyTimes="0;0.5;1" dur="0.9s" repeatCount="indefinite" />
          <line x1="50" y1="36" x2="50" y2="55" stroke="currentColor" strokeWidth="5" opacity="0.6" />
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-26 50 36; 26 50 36; -26 50 36" keyTimes="0;0.5;1" dur="0.9s" repeatCount="indefinite" />
          <line x1="50" y1="36" x2="50" y2="55" stroke="currentColor" strokeWidth="5" />
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-27 50 58; 27 50 58; -27 50 58" keyTimes="0;0.5;1" dur="0.9s" repeatCount="indefinite" />
          <polyline points="50,58 52,74 50,88" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="27 50 58; -27 50 58; 27 50 58" keyTimes="0;0.5;1" dur="0.9s" repeatCount="indefinite" />
          <polyline points="50,58 52,74 50,88" stroke="currentColor" strokeWidth="6" fill="none" />
        </g>
      </g>
    </svg>
  );
}

/** Standing side-bend — one arm reaching overhead, torso swaying side to side. */
export function StretchAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="90" x2="84" y2="90" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <line x1="50" y1="58" x2="43" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="58" x2="57" y2="88" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-16 50 58; 16 50 58; -16 50 58" keyTimes="0;0.5;1" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <circle cx="50" cy="28" r="5" fill="currentColor" />
        <line x1="50" y1="34" x2="50" y2="58" stroke="currentColor" strokeWidth="6" />
        <path d="M50 38 C58 32 64 24 66 14" stroke="currentColor" strokeWidth="5" />
        <line x1="50" y1="40" x2="42" y2="52" stroke="currentColor" strokeWidth="5" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Warm plate — food dome on a plate, steam wisps drifting up and fading. */
export function MealAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 74 A18 18 0 0 1 68 74" fill="currentColor" opacity="0.35" />
      <line x1="24" y1="74" x2="76" y2="74" stroke="currentColor" strokeWidth="5" />
      <path d="M32 74 Q50 84 68 74" stroke="currentColor" strokeWidth="4" opacity="0.5" />
      <path d="M42 52 C40 48 44 44 42 38" stroke="currentColor" strokeWidth="4" opacity="0">
        <animateTransform attributeName="transform" type="translate" values="0 6; 0 -10" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.6;0" keyTimes="0;0.4;1" dur="2.2s" repeatCount="indefinite" />
      </path>
      <path d="M58 52 C56 48 60 44 58 38" stroke="currentColor" strokeWidth="4" opacity="0">
        <animateTransform attributeName="transform" type="translate" values="0 6; 0 -10" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.55;0" keyTimes="0;0.6;1" dur="2.2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** Trophy — floating gently, a glint sweeping across the cup. */
export function TrophyAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -3.5; 0 0" keyTimes="0;0.5;1" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <path d="M33 20 H67 V38 A17 17 0 0 1 33 38 Z" stroke="currentColor" strokeWidth="5" />
        <path d="M33 25 H24 A12 12 0 0 0 36 45" stroke="currentColor" strokeWidth="4" opacity="0.6" />
        <path d="M67 25 H76 A12 12 0 0 1 64 45" stroke="currentColor" strokeWidth="4" opacity="0.6" />
        <line x1="50" y1="55" x2="50" y2="66" stroke="currentColor" strokeWidth="6" />
        <rect x="37" y="66" width="26" height="8" rx="3" fill="currentColor" />
        <line x1="46" y1="26" x2="41" y2="40" stroke="currentColor" strokeWidth="4" opacity="0">
          <animate attributeName="opacity" values="0;0.7;0" keyTimes="0;0.5;1" dur="2.4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="-5 0; 16 0" dur="2.4s" repeatCount="indefinite" />
        </line>
      </g>
    </svg>
  );
}
