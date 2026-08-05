import BodySvg, { hasRegion } from './BodySvg';
import {
  RowAnim, PullAnim, TricepsAnim, CalfAnim, SideLyingAnim, CarryAnim, TwistAnim, WristAnim,
} from './MoveAnims';
import { canonicalMuscle } from '../lib/muscleNames';

type AnimProps = { className?: string };
const EASE = '0.4 0 0.2 1';

/** Animated dumbbell curl — arms / biceps. */
export function CurlAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <circle cx="50" cy="28" r="4.5" fill="currentColor" />
      <line x1="50" y1="30" x2="50" y2="58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 50 58; -115 50 58; 0 50 58" keyTimes="0;0.5;1" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="50" y1="58" x2="50" y2="84" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <g transform="translate(50 86)">
          <rect x="-12" y="-3.5" width="24" height="7" rx="2.5" fill="currentColor" />
          <rect x="-15" y="-8" width="5.5" height="16" rx="2" fill="currentColor" />
          <rect x="9.5" y="-8" width="5.5" height="16" rx="2" fill="currentColor" />
        </g>
      </g>
    </svg>
  );
}

/** Barbell squat — legs / glutes (body drops, knees bend, then drive up). */
export function SquatAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="88" x2="82" y2="88" stroke="currentColor" strokeWidth="4" opacity="0.35" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 16; 0 0" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="28" y1="30" x2="72" y2="30" stroke="currentColor" strokeWidth="5" />
        <circle cx="50" cy="24" r="5" fill="currentColor" />
        <line x1="50" y1="30" x2="50" y2="52" stroke="currentColor" strokeWidth="6" />
      </g>
      <polyline points="50,52 45,70 44,86" stroke="currentColor" strokeWidth="6" fill="none">
        <animate attributeName="points" values="50,52 45,70 44,86; 50,68 38,74 44,86; 50,52 45,70 44,86" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
      </polyline>
      <polyline points="50,52 55,70 56,86" stroke="currentColor" strokeWidth="6" fill="none">
        <animate attributeName="points" values="50,52 55,70 56,86; 50,68 62,74 56,86; 50,52 55,70 56,86" keyTimes="0;0.5;1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
      </polyline>
    </svg>
  );
}

/** Push-up — chest (body lowers to the floor and presses back up). */
export function PushUpAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="14" y1="84" x2="90" y2="84" stroke="currentColor" strokeWidth="4" opacity="0.35" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 12; 0 0" keyTimes="0;0.5;1" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <circle cx="26" cy="52" r="5" fill="currentColor" />
        <line x1="31" y1="54" x2="82" y2="62" stroke="currentColor" strokeWidth="6" />
        <line x1="82" y1="62" x2="90" y2="64" stroke="currentColor" strokeWidth="6" />
        <line x1="36" y1="55" x2="36" y2="80" stroke="currentColor" strokeWidth="5" />
        <line x1="64" y1="59" x2="64" y2="80" stroke="currentColor" strokeWidth="5" />
      </g>
    </svg>
  );
}

/** Overhead press — shoulders (barbell drives up overhead and back down). */
export function PressAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="30" r="5" fill="currentColor" />
      <line x1="50" y1="36" x2="50" y2="64" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="64" x2="42" y2="86" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="64" x2="58" y2="86" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -14; 0 0" keyTimes="0;0.5;1" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines={`${EASE}; ${EASE}`} />
        <line x1="30" y1="46" x2="70" y2="46" stroke="currentColor" strokeWidth="5" />
        <line x1="40" y1="52" x2="40" y2="46" stroke="currentColor" strokeWidth="5" />
        <line x1="60" y1="52" x2="60" y2="46" stroke="currentColor" strokeWidth="5" />
      </g>
    </svg>
  );
}

/** Plank — core (steady hold with a pulsing, engaged midsection). */
export function PlankAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="14" y1="84" x2="90" y2="84" stroke="currentColor" strokeWidth="4" opacity="0.35" />
      <circle cx="24" cy="52" r="5" fill="currentColor" />
      <line x1="29" y1="54" x2="84" y2="64" stroke="currentColor" strokeWidth="6" />
      <line x1="34" y1="55" x2="34" y2="82" stroke="currentColor" strokeWidth="5" />
      <line x1="84" y1="64" x2="90" y2="82" stroke="currentColor" strokeWidth="5" />
      <circle cx="56" cy="60" r="6" fill="currentColor" opacity="0.5">
        <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Jumping jack — cardio (arms and legs open and close). */
export function JumpAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" strokeLinecap="round">
      <circle cx="50" cy="26" r="5" fill="currentColor" />
      <line x1="50" y1="32" x2="50" y2="58" stroke="currentColor" strokeWidth="6" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="38 50 36; -22 50 36; 38 50 36" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite" />
        <line x1="50" y1="36" x2="34" y2="56" stroke="currentColor" strokeWidth="5" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-38 50 36; 22 50 36; -38 50 36" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite" />
        <line x1="50" y1="36" x2="66" y2="56" stroke="currentColor" strokeWidth="5" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="10 50 58; -18 50 58; 10 50 58" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite" />
        <line x1="50" y1="58" x2="42" y2="86" stroke="currentColor" strokeWidth="6" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-10 50 58; 18 50 58; -10 50 58" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite" />
        <line x1="50" y1="58" x2="58" y2="86" stroke="currentColor" strokeWidth="6" />
      </g>
    </svg>
  );
}

/** Slow breathing pulse — for yoga / meditation. */
export function BreatheAnim({ className = '' }: AnimProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2" opacity="0.5">
        <animate attributeName="r" values="20;34;20" dur="4.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="4.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.9">
        <animate attributeName="r" values="12;16;12" dur="4.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Pick the animation that best matches an exercise (or muscle-group) name. */
export function exerciseAnim(text?: string): (p: AnimProps) => JSX.Element {
  // canonicalMuscle folds Arabic group names into their English form so the
  // regexes below match in both languages — in Arabic, every quick-session
  // card used to fall through to the same default curl icon. The raw text is
  // kept alongside so Arabic *exercise* names still hit the Arabic keywords.
  const t = `${canonicalMuscle(text)} ${text || ''}`.toLowerCase();

  // Most specific first: a name can contain several of these words, and the first
  // match wins. "Standing Calf Raise" is a calf raise, not a lateral raise; a
  // "Bent-Over Barbell Row" is a row, not a bench movement.
  if (/wrist curl|reverse wrist|forearm/.test(t)) return WristAnim;
  if (/calf raise|calf/.test(t)) return CalfAnim;
  if (/tricep|skull ?crusher|pushdown|dip/.test(t)) return TricepsAnim;
  if (/pull-?up|chin-?up|pulldown|face pull/.test(t)) return PullAnim;
  if (/row|row$|bent-?over.*row/.test(t)) return RowAnim;
  if (/carry|farmer|dead ?hang|shrug/.test(t)) return CarryAnim;
  if (/side-?lying|clamshell|abduct|adduct|lateral walk|inner thigh|side bend/.test(t)) return SideLyingAnim;
  if (/woodchopper|russian twist|twist|chop/.test(t)) return TwistAnim;

  if (/(squat|lunge|leg|glute|quad|hamstring|deadlift|rdl|step-?up|hip|kickback|thigh|bridge)/.test(t)) return SquatAnim;
  if (/(plank|core|abs?|crunch|hollow|sit-?up|dead ?bug|oblique|superman|bird ?dog|back extension)/.test(t)) return PlankAnim;
  if (/(run|sprint|jump|burpee|jack|mountain|high ?knee|hiit|interval training|cardio|skip|thruster|rope|rowing machine|cycl)/.test(t)) return JumpAnim;
  if (/(bench|push-?up|chest|fly|pec)/.test(t)) return PushUpAnim;
  if (/(overhead|shoulder|press|lateral raise|front raise|delt|arnold|y raise)/.test(t)) return PressAnim;
  if (/(yoga|breath|stretch|mobility|flow|meditat|pose|cobra|warrior|pigeon)/.test(t)) return BreatheAnim;

  // Arabic exercise names (the API localises `name` when the app runs in Arabic).
  // Same most-specific-first discipline as the English block above.
  if (/رسغ|معصم/.test(t)) return WristAnim;
  if (/سمانة/.test(t)) return CalfAnim;
  if (/متوازي|فرنساوي/.test(t)) return TricepsAnim;
  if (/عقلة|سحب لأعلى|سحب علوي/.test(t)) return PullAnim;
  if (/تجديف/.test(t)) return RowAnim;
  if (/حمل المزارع|هز الكتف|هز الأكتاف|تعليق/.test(t)) return CarryAnim;
  if (/صدفة|مبعدات|مقربات|رفع جانبي للرجل|جانبي وانت نايم/.test(t)) return SideLyingAnim;
  if (/حطاب|لف الجذع|تدوير روسي/.test(t)) return TwistAnim;
  if (/سكوات|قرفصاء|طعن|اندفاع|رفعة|ديدليفت|جسر|فخد|فخذ|مؤخرة|رجل/.test(t)) return SquatAnim;
  if (/بلانك|كرنش|طحن|سوبرمان|بطن/.test(t)) return PlankAnim;
  if (/جري|نط الحبل|قفز|دراجة|هيت/.test(t)) return JumpAnim;
  if (/رفرفة|علوي بالدمبل/.test(t)) return PressAnim;
  if (/ضغط|بنش|تفتيح/.test(t)) return PushUpAnim;
  if (/يوجا|تنفس|إطالة|تأمل|استرخاء/.test(t)) return BreatheAnim;
  return CurlAnim; // curls and anything else arm-flexion shaped
}

/** Mini muscle-map: the body silhouette with the target muscle pulsing.
 *  Pass `name` to light up the anatomical region; the posX/posY dot is kept
 *  only as a fallback when the name has no region match.
 *  Defaults to a soft slate tone so it reads on white cards; pass a text-* class to recolor. */
export function MuscleFigure({
  side,
  posX,
  posY,
  name,
  className = '',
}: {
  side: 'front' | 'back';
  posX?: number | null;
  posY?: number | null;
  name?: string;
  className?: string;
}) {
  const showDot = posX != null && posY != null && !hasRegion(name);
  return (
    // No colour of its own: the silhouette draws with currentColor, so the caller
    // owns the tone. Hardcoding one here would collide with an override, and which
    // of two text-* utilities wins is decided by stylesheet order, not source order.
    <div className={`relative ${className}`}>
      <BodySvg side={side} highlight={name} className="h-full w-full" />
      {showDot && (
        <span
          className="live-dot absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-pink text-brand-pink"
          style={{ left: `${posX! * 100}%`, top: `${posY! * 100}%` }}
        />
      )}
    </div>
  );
}
