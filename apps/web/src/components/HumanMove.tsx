import { canonicalMuscle } from '../lib/muscleNames';

/**
 * A jointed 2D person performing the movement, with the working muscles filled
 * in the accent color — the "how do I do this?" visual for anywhere an exercise
 * appears without (or before) its video. Side view, SMIL-animated, zero deps.
 *
 * Patterns are joint-angle keyframes ("angle; angle; angle" = start; mid; back),
 * tuned visually — geometry constants and specs mirror the design harness, so
 * new patterns should be tried there first.
 */

const HIP = [50, 52] as const;
const SHOULDER = [54, 27] as const;
const ELBOW = [54, 41] as const;
const KNEE = [50, 71] as const;
const EASE = '0.4 0 0.2 1';
const GRAY = 'currentColor';
const HI = '#f97316';

type Part = 'thigh' | 'shin' | 'torso' | 'upperArm' | 'forearm';

interface Spec {
  dur: number;
  body?: string;
  lean?: string;
  shoulder: string;
  elbow: string;
  shoulderF?: string;
  elbowF?: string;
  hip: string;
  knee: string;
  hipF?: string;
  kneeF?: string;
  rootRot?: number;
  bar?: boolean;
  corePulse?: boolean;
  highlight: Part[];
}

export type PatternName =
  | 'squat' | 'lunge' | 'pushup' | 'plank' | 'press' | 'curl'
  | 'row' | 'pullup' | 'jog' | 'breathe' | 'calfraise'
  | 'deadlift' | 'bridge' | 'dip' | 'raise' | 'carry' | 'jump' | 'twist';

const PATTERNS: Record<PatternName, Spec> = {
  squat:  { dur: 1.8, body: '0 0; 0 13; 0 0', lean: '0; 18; 0', shoulder: '15; -70; 15', elbow: '-15; -5; -15',
            hip: '-5; -85; -5', knee: '5; 85; 5',
            highlight: ['thigh', 'shin'] },
  lunge:  { dur: 1.9, body: '0 0; 0 10; 0 0', lean: '0; 4; 0', shoulder: '20', elbow: '-10',
            hip: '0; -55; 0', knee: '0; 55; 0', hipF: '0; 30; 0', kneeF: '0; 55; 0',
            highlight: ['thigh'] },
  pushup: { dur: 1.6, rootRot: 78, body: '0 0; 0 10; 0 0',
            shoulder: '-55; -95; -55', elbow: '55; 95; 55',
            hip: '8', knee: '2',
            highlight: ['upperArm', 'torso'] },
  plank:  { dur: 1.6, rootRot: 78,
            shoulder: '-75', elbow: '75',
            hip: '8', knee: '2',
            corePulse: true, highlight: [] },
  press:  { dur: 1.7, body: '0 0; 0 2; 0 0',
            shoulder: '-160; -178; -160', elbow: '-30; 0; -30',
            hip: '-4', knee: '4', hipF: '4', kneeF: '0',
            highlight: ['upperArm'] },
  curl:   { dur: 1.7,
            shoulder: '10', elbow: '-10; -125; -10',
            hip: '-4', knee: '4', hipF: '4', kneeF: '0',
            highlight: ['upperArm', 'forearm'] },
  row:    { dur: 1.8, lean: '38',
            shoulder: '-45; -100; -45', elbow: '30; 95; 30',
            hip: '-30', knee: '30',
            highlight: ['upperArm', 'torso'] },
  pullup: { dur: 2.0, body: '0 6; 0 -6; 0 6',
            shoulder: '-172; -150; -172', elbow: '-5; -95; -5',
            hip: '-8; -14; -8', knee: '18; 26; 18',
            bar: true, highlight: ['upperArm', 'torso'] },
  jog:    { dur: 0.9, body: '0 2; 0 -2; 0 2', lean: '8',
            shoulder: '35; -35; 35', elbow: '-70', shoulderF: '-35; 35; -35', elbowF: '-70',
            hip: '-40; 30; -40', knee: '30; 65; 30', hipF: '30; -40; 30', kneeF: '65; 30; 65',
            highlight: ['thigh', 'shin'] },
  breathe:{ dur: 4.0, body: '0 0; 0 -2; 0 0',
            shoulder: '12; 40; 12', elbow: '-8; -20; -8',
            hip: '-4', knee: '4', hipF: '4', kneeF: '0',
            highlight: [] },
  calfraise: { dur: 1.6, body: '0 0; 0 -5; 0 0',
            shoulder: '8', elbow: '-6',
            hip: '-4', knee: '4', hipF: '4', kneeF: '0',
            highlight: ['shin'] },
  deadlift: { dur: 2.0, body: '0 0; 0 6; 0 0', lean: '8; 52; 8',
            shoulder: '-4; -12; -4', elbow: '0',
            hip: '-3; -30; -3', knee: '3; 30; 3',
            highlight: ['thigh', 'torso'] },
  bridge: { dur: 1.8, rootRot: -78, body: '0 16', lean: '0; -18; 0',
            shoulder: '-30; -12; -30', elbow: '10',
            hip: '-70; -95; -70', knee: '80; 95; 80',
            highlight: ['thigh', 'torso'] },
  dip:    { dur: 1.6, body: '0 0; 0 9; 0 0',
            shoulder: '12; 42; 12', elbow: '-12; -70; -12',
            hip: '-12; -20; -12', knee: '20; 32; 20',
            highlight: ['upperArm', 'forearm'] },
  raise:  { dur: 1.8,
            shoulder: '8; -95; 8', elbow: '-4',
            hip: '-4', knee: '4', hipF: '4', kneeF: '0',
            highlight: ['upperArm'] },
  carry:  { dur: 1.1, body: '0 1; 0 -1; 0 1', lean: '4',
            shoulder: '6', elbow: '-4',
            hip: '-22; 16; -22', knee: '12; 28; 12', hipF: '16; -22; 16', kneeF: '28; 12; 28',
            highlight: ['forearm', 'torso'] },
  jump:   { dur: 0.9, body: '0 5; 0 -7; 0 5',
            shoulder: '12; -168; 12', elbow: '-6',
            hip: '-8; 10; -8', knee: '6; 14; 6', hipF: '10; -8; 10', kneeF: '14; 6; 14',
            highlight: ['thigh', 'shin'] },
  twist:  { dur: 1.9, lean: '-13; 15; -13',
            shoulder: '-82; -88; -82', elbow: '6',
            hip: '-6', knee: '6', hipF: '6', kneeF: '0',
            corePulse: true, highlight: [] },
};

/** Multi-keyframe SMIL rotate/translate around a fixed local pivot. */
function AnimGroup({
  type, values, dur, cx = 0, cy = 0, opacity, children,
}: {
  type: 'rotate' | 'translate';
  values: string;
  dur: number;
  cx?: number;
  cy?: number;
  opacity?: number;
  children: React.ReactNode;
}) {
  if (!values.includes(';')) {
    const tf = type === 'rotate' ? `rotate(${values} ${cx} ${cy})` : `translate(${values})`;
    return <g opacity={opacity} transform={tf}>{children}</g>;
  }
  const frames = values.split(';').map((v) => v.trim());
  const vals = type === 'rotate' ? frames.map((v) => `${v} ${cx} ${cy}`).join('; ') : values;
  const keyTimes = frames.length === 3 ? '0;0.5;1' : '0;1';
  const splines = Array(frames.length - 1).fill(EASE).join('; ');
  return (
    <g opacity={opacity}>
      <animateTransform
        attributeName="transform"
        type={type}
        values={vals}
        keyTimes={keyTimes}
        dur={`${dur}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keySplines={splines}
      />
      {children}
    </g>
  );
}

function Seg({ x1, y1, x2, y2, w, color }: { x1: number; y1: number; x2: number; y2: number; w: number; color: string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />;
}

function Arm({ p, far }: { p: Spec; far: boolean }) {
  const sh = far ? (p.shoulderF ?? p.shoulder) : p.shoulder;
  const el = far ? (p.elbowF ?? p.elbow) : p.elbow;
  const upper = p.highlight.includes('upperArm') ? HI : GRAY;
  const fore = p.highlight.includes('forearm') || p.highlight.includes('upperArm') ? HI : GRAY;
  return (
    <AnimGroup type="rotate" values={sh} dur={p.dur} cx={SHOULDER[0]} cy={SHOULDER[1]} opacity={far ? 0.4 : undefined}>
      <Seg x1={SHOULDER[0]} y1={SHOULDER[1]} x2={ELBOW[0]} y2={ELBOW[1]} w={6.5} color={upper} />
      <AnimGroup type="rotate" values={el} dur={p.dur} cx={ELBOW[0]} cy={ELBOW[1]}>
        <Seg x1={ELBOW[0]} y1={ELBOW[1]} x2={54} y2={53} w={6} color={fore} />
        <circle cx={54} cy={55} r={2.6} fill={fore} />
      </AnimGroup>
    </AnimGroup>
  );
}

function Leg({ p, far }: { p: Spec; far: boolean }) {
  const hip = far ? (p.hipF ?? p.hip) : p.hip;
  const knee = far ? (p.kneeF ?? p.knee) : p.knee;
  const thigh = p.highlight.includes('thigh') ? HI : GRAY;
  const shin = p.highlight.includes('shin') ? HI : GRAY;
  return (
    <AnimGroup type="rotate" values={hip} dur={p.dur} cx={HIP[0]} cy={HIP[1]} opacity={far ? 0.4 : undefined}>
      <Seg x1={HIP[0]} y1={HIP[1]} x2={KNEE[0]} y2={KNEE[1]} w={8} color={thigh} />
      <AnimGroup type="rotate" values={knee} dur={p.dur} cx={KNEE[0]} cy={KNEE[1]}>
        <Seg x1={KNEE[0]} y1={KNEE[1]} x2={50} y2={88} w={6.5} color={shin} />
        <Seg x1={50} y1={89} x2={57} y2={89} w={4.5} color={shin} />
      </AnimGroup>
    </AnimGroup>
  );
}

export default function HumanMove({ pattern, className = '' }: { pattern: PatternName; className?: string }) {
  const p = PATTERNS[pattern];
  const torso = p.highlight.includes('torso') ? HI : GRAY;
  const grounded = p.rootRot !== undefined;
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden>
      {!p.bar && (
        <line
          x1={grounded ? 10 : 16} y1={grounded ? 83 : 92} x2={grounded ? 92 : 84} y2={grounded ? 83 : 92}
          stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.25}
        />
      )}
      {p.bar && <Seg x1={20} y1={6} x2={80} y2={6} w={3.5} color={GRAY} />}
      <AnimGroup type="translate" values={p.body ?? '0 0'} dur={p.dur}>
        <g transform={p.rootRot ? `rotate(${p.rootRot} 50 62)` : undefined}>
          <Leg p={p} far />
          <Arm p={p} far />
          <AnimGroup type="rotate" values={p.lean ?? '0'} dur={p.dur} cx={HIP[0]} cy={HIP[1]}>
            <Seg x1={54} y1={26} x2={HIP[0]} y2={HIP[1]} w={11} color={torso} />
            <circle cx={56} cy={15} r={6.5} fill={GRAY} />
            {p.corePulse && (
              <circle cx={52} cy={42} r={5} fill={HI} opacity={0.6}>
                <animate attributeName="r" values="3.5;6.5;3.5" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.25;0.7" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
          </AnimGroup>
          <Arm p={p} far={false} />
          <Leg p={p} far={false} />
        </g>
      </AnimGroup>
    </svg>
  );
}

/** Best pattern for an exercise (or muscle-group) name — EN + AR keywords,
 *  most specific first, mirroring the discipline of exerciseAnim(). */
export function patternFor(text?: string): PatternName {
  const t = `${canonicalMuscle(text)} ${text || ''}`.toLowerCase();

  if (/calf raise|calf|سمانة/.test(t)) return 'calfraise';
  if (/pull-?up|chin-?up|pulldown|face pull|عقلة|سحب لأعلى|سحب علوي/.test(t)) return 'pullup';
  if (/wrist|forearm|curl|رسغ|معصم|مرجحة/.test(t)) return 'curl';
  if (/tricep|skull ?crusher|pushdown|dip|متوازي|فرنساوي/.test(t)) return 'dip';
  if (/lateral raise|front raise|y raise|رفرفة/.test(t)) return 'raise';
  if (/carry|farmer|shrug|dead ?hang|حمل المزارع|هز الكتف|هز الأكتاف|تعليق/.test(t)) return 'carry';
  if (/deadlift|rdl|romanian|good ?morning|رفعة|ديدليفت/.test(t)) return 'deadlift';
  if (/bridge|hip thrust|glute|kickback|جسر|مؤخرة/.test(t)) return 'bridge';
  if (/twist|chop|woodchopper|russian|oblique|side bend|حطاب|لف الجذع|تدوير روسي/.test(t)) return 'twist';
  if (/row|bent-?over|تجديف/.test(t)) return 'row';
  if (/lunge|step-?up|split squat|طعن|اندفاع/.test(t)) return 'lunge';
  if (/(jump|jack|burpee|thruster|rope|skip|نط|قفز)/.test(t)) return 'jump';
  if (/(squat|leg|quad|hamstring|hip|thigh|سكوات|قرفصاء|فخد|فخذ|رجل)/.test(t)) return 'squat';
  if (/(plank|core|abs?|crunch|hollow|sit-?up|dead ?bug|superman|bird ?dog|بلانك|كرنش|طحن|سوبرمان|بطن)/.test(t)) return 'plank';
  if (/(run|sprint|mountain|high ?knee|hiit|cardio|rowing machine|cycl|جري|دراجة|هيت)/.test(t)) return 'jog';
  if (/(bench|push-?up|chest|fly|pec|ضغط|بنش|تفتيح)/.test(t)) return 'pushup';
  if (/(overhead|shoulder|press|delt|arnold|علوي بالدمبل)/.test(t)) return 'press';
  if (/(yoga|breath|stretch|mobility|flow|meditat|pose|cobra|warrior|pigeon|يوجا|تنفس|إطالة|تأمل|استرخاء)/.test(t)) return 'breathe';
  return 'curl';
}
