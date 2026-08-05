/**
 * The coaching engine.
 *
 * Turns intake answers into a plan: a level, a program, the days to train, why we
 * chose it, and what to be careful of. Deliberately rule-based rather than a model
 * call — a plan a user is asked to follow for weeks should be explainable, the same
 * inputs should always give the same answer, and it must work with no API key and
 * no network.
 *
 * Every decision returns its reason, because "do this" without "because" is what
 * makes people abandon a plan.
 */

export type Answers = {
  goal: string;
  experience: string;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: string;
  activityLevel: string;
  limitations: string[];
  preferMornings: boolean;
};

export type Bilingual = { en: string; ar: string };

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type Level = (typeof LEVELS)[number];

/* ------------------------------- Level ------------------------------- */

/**
 * Experience dominates, then how much they already move, then how much they can
 * commit. Someone who trains regularly but only twice a week is still intermediate;
 * someone brand new who picks five days a week is still a beginner. Volume does not
 * buy you technique.
 */
export function decideLevel(a: Answers): { level: Level; why: Bilingual } {
  let score = 0;

  score += { none: 0, some: 2, regular: 4, advanced: 6 }[a.experience] ?? 0;
  score += { sedentary: 0, light: 1, moderate: 2, active: 3 }[a.activityLevel] ?? 0;
  if (a.daysPerWeek >= 4) score += 1;
  if (a.minutesPerSession >= 45) score += 1;
  // Working around an injury means starting more conservatively, whatever the history.
  if (a.limitations.length > 0) score -= 1;

  let level: Level = score >= 8 ? 'ADVANCED' : score >= 4 ? 'INTERMEDIATE' : 'BEGINNER';

  // Availability must not buy you a level. Someone who trains most weeks is
  // intermediate however many days they can spare; only real training history
  // unlocks advanced. Without this cap, "5 days free" reads as "ready for heavy
  // singles", which is how people get hurt.
  const ceiling: Record<string, Level> = {
    none: 'BEGINNER',
    some: 'INTERMEDIATE',
    regular: 'INTERMEDIATE',
    advanced: 'ADVANCED',
  };
  const cap = ceiling[a.experience] ?? 'BEGINNER';
  if (LEVELS.indexOf(level) > LEVELS.indexOf(cap)) level = cap;

  // Two or more things that already hurt: start a level lower whatever the history.
  if (a.limitations.length >= 2 && level !== 'BEGINNER') {
    level = LEVELS[LEVELS.indexOf(level) - 1];
  }

  const why: Record<Level, Bilingual> = {
    BEGINNER: {
      en: 'Starting at beginner so the movements are learned properly before the weight goes up.',
      ar: 'هنبدأ من المستوى المبتدئ عشان تتعلم الحركة صح قبل ما توزن.',
    },
    INTERMEDIATE: {
      en: 'You already train, so we start at intermediate rather than repeating the basics.',
      ar: 'انت بتتمرن أصلاً، فهنبدأ من المستوى المتوسط بدل ما نعيد الأساسيات.',
    },
    ADVANCED: {
      en: 'Years of training behind you, so we start at advanced.',
      ar: 'عندك سنين تمرين، فهنبدأ من المستوى المتقدم.',
    },
  };

  // When an injury pulled the level down, say so — otherwise it reads as the app
  // underestimating them.
  if (a.limitations.length >= 2) {
    return {
      level,
      why: {
        en: 'Starting one level below your experience while we work around what hurts — we can move up once it settles.',
        ar: 'هنبدأ مستوى أقل من خبرتك لحد ما نلف حوالين اللي بيوجعك — ونطلع بعدين لما يهدى.',
      },
    };
  }
  return { level, why: why[level] };
}

/* ------------------------------- Schedule ------------------------------- */

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Spread sessions as evenly as the week allows, so nobody ends up training four
 * days back to back and then resting three. Starts on Saturday to match the local week.
 */
export function spreadDays(daysPerWeek: number): string[] {
  const n = Math.min(Math.max(daysPerWeek, 1), 6);
  const step = DAYS.length / n;
  const picked: string[] = [];
  for (let i = 0; i < n; i++) picked.push(DAYS[Math.floor(i * step)]);
  return picked;
}

/* ------------------------------- Cautions ------------------------------- */

const CAUTION: Record<string, Bilingual> = {
  knee: {
    en: 'Knees: keep lunges and deep squats shallow at first, and stop short of any pinch.',
    ar: 'الركبة: خلي الطعنات والسكوات مش عميقة في الأول، ولو حسيت بوجع خفيف قف.',
  },
  back: {
    en: 'Lower back: brace before every lift, and swap deadlifts for hip thrusts while it settles.',
    ar: 'أسفل الضهر: شدّ بطنك قبل أي رفعة، وبدّل الديدليفت بهيب ثراست لحد ما يهدى.',
  },
  shoulder: {
    en: 'Shoulders: press in front of you rather than behind the neck, and warm up the rotator cuff.',
    ar: 'الكتف: اضغط قدامك مش ورا رقبتك، وسخّن أوتار الكتف الأول.',
  },
  wrist: {
    en: 'Wrists: use dumbbells over a straight bar, and push up on your fists or handles.',
    ar: 'الرسغ: استخدم دمبلز بدل البار المستقيم، واعمل الضغط على قبضتك أو على مقابض.',
  },
  neck: {
    en: 'Neck: keep your chin tucked in every core move — never pull on your head.',
    ar: 'الرقبة: خلي دقنك للداخل في تمارين البطن — وماتشدش راسك بإيدك أبداً.',
  },
};

export function cautionsFor(limitations: string[]): Bilingual[] {
  return limitations.map((l) => CAUTION[l]).filter(Boolean);
}

/* ------------------------------- Rationale ------------------------------- */

const GOAL_LINE: Record<string, Bilingual> = {
  lose_weight: {
    en: 'Built around full-body sessions and conditioning, which burn the most per minute.',
    ar: 'معمولة حوالين تمارين الجسم كامل والكارديو، اللي بتحرق أكتر في نفس الوقت.',
  },
  build_muscle: {
    en: 'Split by muscle group so each one gets real volume and time to recover.',
    ar: 'مقسّمة على العضلات عشان كل واحدة تاخد حقها ووقت ترتاح فيه.',
  },
  stay_fit: {
    en: 'A balance of movement, mobility and calm rather than pure strength work.',
    ar: 'توازن بين الحركة والمرونة والهدوء، مش حديد وبس.',
  },
  get_strong: {
    en: 'Centred on the big compound lifts, where strength actually comes from.',
    ar: 'مركزة على الحركات المركبة الكبيرة، اللي القوة بتيجي منها فعلاً.',
  },
  more_energy: {
    en: 'Short, frequent sessions — the fastest route to feeling less drained.',
    ar: 'تمرينات قصيرة ومتكررة — أسرع طريق تحس إنك مش مرهق.',
  },
};

export function rationaleFor(a: Answers, level: Level, levelWhy: Bilingual, days: string[]): Bilingual[] {
  const out: Bilingual[] = [levelWhy];

  const goal = GOAL_LINE[a.goal];
  if (goal) out.push(goal);

  out.push({
    en: `${days.length} sessions a week, spaced out — ${days.join(', ')}.`,
    ar: `${days.length} تمرينات في الأسبوع، موزعة — ${days.join('، ')}.`,
  });

  if (a.minutesPerSession <= 20) {
    out.push({
      en: 'Sessions are kept short, so nothing gets skipped for lack of time.',
      ar: 'التمرينات قصيرة، عشان مفيش حاجة تتلغي بحجة الوقت.',
    });
  }

  if (a.equipment === 'none') {
    out.push({
      en: 'Bodyweight only — nothing here needs a gym or a single dumbbell.',
      ar: 'وزن جسمك بس — مفيش حاجة هنا محتاجة جيم ولا حتى دمبل.',
    });
  } else if (a.equipment === 'full_gym') {
    out.push({
      en: 'Assumes full gym access, so machines and barbells are in play.',
      ar: 'على أساس إن عندك جيم كامل، يعني الأجهزة والبار متاحين.',
    });
  }

  if (a.activityLevel === 'sedentary' && level === 'BEGINNER') {
    out.push({
      en: 'Starting light on purpose — consistency first, intensity later.',
      ar: 'بنبدأ خفيف بنية — الانتظام الأول، والشدة بعدين.',
    });
  }

  return out;
}

/* ------------------------------- Program choice ------------------------------- */

export type ProgramLike = {
  id: string;
  title: string;
  level: string | null;
  /** prenatal | postnatal | senior | rehab — null means suitable for everyone. */
  audience?: string | null;
  coach: { type: string } | null;
  _count: { lessons: number };
};

/** Goals that are better served by yoga/mobility content than by lifting. */
const YOGA_GOALS = new Set(['stay_fit', 'more_energy']);

/**
 * Score every program against the plan and take the best. Scoring rather than
 * filtering, so a thin catalogue always returns something rather than nothing.
 */
export function pickProgram(programs: ProgramLike[], a: Answers, level: Level): ProgramLike | null {
  const wantYoga = YOGA_GOALS.has(a.goal);

  const scored = programs
    // Specialised content is opt-in, never recommended. Prenatal yoga was ranking
    // fourth for any beginner who asked for something calm — including men.
    .filter((p) => p._count.lessons > 0 && !p.audience)
    .map((p) => {
      let score = 0;
      if (p.level === level) score += 5;
      else if (p.level === null) score += 2;
      // One level either side is workable; two is not.
      else if (Math.abs(LEVELS.indexOf(p.level as Level) - LEVELS.indexOf(level)) === 1) score += 1;

      const isYoga = p.coach?.type === 'YOGA';
      if (wantYoga === isYoga) score += 3;

      // With no equipment, prefer programs that read as bodyweight/home.
      if (a.equipment === 'none' && /home|bodyweight|no equipment|calm|foundations/i.test(p.title)) score += 2;

      // Match the length of the commitment to how many days they can give.
      const ideal = a.daysPerWeek * 2;
      score -= Math.min(3, Math.abs(p._count.lessons - ideal) / 3);

      return { p, score };
    })
    .sort((x, y) => y.score - x.score);

  return scored[0]?.p ?? null;
}

/* ------------------------------- Re-check ------------------------------- */

/** Four weeks is long enough to show progress, short enough to catch a bad fit. */
export function nextCheckDate(fromISO: string): string {
  const d = new Date(`${fromISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 28);
  return d.toISOString().slice(0, 10);
}
