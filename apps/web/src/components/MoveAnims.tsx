/**
 * Hand-drawn movement patterns.
 *
 * Six figures could not carry eighty-five exercises — a bicep curl was standing in
 * for rows, pulldowns, dips, calf raises, carries and twists. These are the patterns
 * that were missing, drawn in the same language as the originals: one stroke figure,
 * one clear moving part, `currentColor` so the caller sets the tone, and SMIL rather
 * than JS so they cost nothing to run.
 */

type AnimProps = { className?: string };
const EASE = '0.4 0 0.2 1';

/** Bent-over row — torso hinged, elbow drives back. */
export function RowAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="14" y1="90" x2="88" y2="90" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <circle cx="30" cy="34" r="5" fill="currentColor" />
      <line x1="34" y1="38" x2="62" y2="52" stroke="currentColor" strokeWidth="6" />
      <line x1="62" y1="52" x2="60" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="62" y1="52" x2="72" y2="88" stroke="currentColor" strokeWidth="5" opacity="0.6" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -13; 0 0" keyTimes="0;0.5;1" dur="1.6s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="44" y1="44" x2="44" y2="70" stroke="currentColor" strokeWidth="5" />
        <rect x="34" y="68" width="20" height="6" rx="3" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Vertical pull — pull-up, chin-up, lat pulldown: the body rises to the bar. */
export function PullAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="16" x2="82" y2="16" stroke="currentColor" strokeWidth="5" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -14; 0 0" keyTimes="0;0.5;1" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="38" y1="16" x2="46" y2="42" stroke="currentColor" strokeWidth="5" />
        <line x1="62" y1="16" x2="54" y2="42" stroke="currentColor" strokeWidth="5" />
        <circle cx="50" cy="36" r="5" fill="currentColor" />
        <line x1="50" y1="42" x2="50" y2="66" stroke="currentColor" strokeWidth="6" />
        <line x1="50" y1="66" x2="43" y2="88" stroke="currentColor" strokeWidth="6" />
        <line x1="50" y1="66" x2="57" y2="88" stroke="currentColor" strokeWidth="6" />
      </g>
    </svg>
  );
}

/** Triceps extension — upper arm pinned, forearm swings from the elbow. */
export function TricepsAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="26" r="5" fill="currentColor" />
      <line x1="50" y1="32" x2="50" y2="62" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="62" x2="43" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="62" x2="57" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="40" x2="64" y2="52" stroke="currentColor" strokeWidth="5" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-58 64 52; 4 64 52; -58 64 52" keyTimes="0;0.5;1" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="64" y1="52" x2="64" y2="76" stroke="currentColor" strokeWidth="5" />
        <rect x="57" y="74" width="14" height="6" rx="3" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Calf raise — heels lift, whole body rises a little. */
export function CalfAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="90" x2="84" y2="90" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -9; 0 0" keyTimes="0;0.5;1" dur="1.4s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <circle cx="50" cy="28" r="5" fill="currentColor" />
        <line x1="50" y1="34" x2="50" y2="60" stroke="currentColor" strokeWidth="6" />
        <line x1="50" y1="40" x2="38" y2="56" stroke="currentColor" strokeWidth="5" opacity="0.7" />
        <line x1="50" y1="40" x2="62" y2="56" stroke="currentColor" strokeWidth="5" opacity="0.7" />
        <line x1="50" y1="60" x2="45" y2="84" stroke="currentColor" strokeWidth="6" />
        <line x1="50" y1="60" x2="55" y2="84" stroke="currentColor" strokeWidth="6" />
        <path d="M40 84 L45 90 M60 84 L55 90" stroke="currentColor" strokeWidth="5" />
      </g>
    </svg>
  );
}

/** Side-lying raise, clamshell, banded abduction — the top leg opens. */
export function SideLyingAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="82" x2="92" y2="82" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <circle cx="24" cy="60" r="5" fill="currentColor" />
      <line x1="29" y1="62" x2="60" y2="70" stroke="currentColor" strokeWidth="6" />
      <line x1="60" y1="70" x2="86" y2="76" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 60 70; -34 60 70; 0 60 70" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="60" y1="70" x2="88" y2="66" stroke="currentColor" strokeWidth="5" />
      </g>
    </svg>
  );
}

/** Loaded carry or dead hang — braced and still, the load swaying slightly. */
export function CarryAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="92" x2="84" y2="92" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <circle cx="50" cy="24" r="5" fill="currentColor" />
      <line x1="50" y1="30" x2="50" y2="58" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="58" x2="44" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="58" x2="56" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="36" y1="36" x2="36" y2="62" stroke="currentColor" strokeWidth="5" />
      <line x1="64" y1="36" x2="64" y2="62" stroke="currentColor" strokeWidth="5" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 3; 0 0" keyTimes="0;0.5;1" dur="1.9s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <rect x="28" y="60" width="16" height="7" rx="3" fill="currentColor" />
        <rect x="56" y="60" width="16" height="7" rx="3" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Standing rotation — woodchopper, side bend, Russian twist. */
export function TwistAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16" y1="90" x2="84" y2="90" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <line x1="50" y1="58" x2="43" y2="88" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="58" x2="57" y2="88" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-24 50 58; 24 50 58; -24 50 58" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <circle cx="50" cy="28" r="5" fill="currentColor" />
        <line x1="50" y1="34" x2="50" y2="58" stroke="currentColor" strokeWidth="6" />
        <line x1="50" y1="40" x2="70" y2="34" stroke="currentColor" strokeWidth="5" />
        <circle cx="72" cy="33" r="4.5" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Wrist curl / forearm work — small, fast flexion at the wrist. */
export function WristAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="62" x2="58" y2="62" stroke="currentColor" strokeWidth="6" opacity="0.45" />
      <line x1="26" y1="54" x2="58" y2="54" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="18 58 54; -22 58 54; 18 58 54" keyTimes="0;0.5;1" dur="1.1s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="58" y1="54" x2="76" y2="54" stroke="currentColor" strokeWidth="5" />
        <rect x="72" y="47" width="7" height="15" rx="3" fill="currentColor" />
      </g>
    </svg>
  );
}
