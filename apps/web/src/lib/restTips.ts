/**
 * Rest-timer micro-education. Hand-written bilingual tips (Egyptian عامية on the
 * Arabic side) shown under the rest countdown — one small idea per rest, never
 * a lecture. Rotation is deterministic by exercise index so a given session
 * shows a steady, non-repeating sequence.
 */

export interface RestTip {
  en: string;
  ar: string;
}

/** General training-science tips — apply to any session. */
const GENERAL: RestTip[] = [
  {
    en: 'On heavy compound lifts, rest 2–3 minutes — your strength recovers, so every set stays a quality set.',
    ar: 'في التمارين المركبة التقيلة، ارتاح دقيقتين لتلاتة — قوتك بترجع وكل مجموعة تبقى بجد.',
  },
  {
    en: "The 30-minute 'anabolic window' is mostly a myth — total daily protein matters way more than timing.",
    ar: 'قصة الـ٣٠ دقيقة بروتين بعد التمرين دي أسطورة — المهم إجمالي البروتين في يومك مش التوقيت.',
  },
  {
    en: 'Add a little weight or one extra rep each week — tiny jumps are how muscle is actually built.',
    ar: 'زوّد وزن صغير أو عدة زيادة كل أسبوع — القفزات الصغيرة هي اللي بتبني العضل بجد.',
  },
  {
    en: 'Perfect form with a lighter weight beats sloppy reps with a heavy one, every single time.',
    ar: 'فورمة مظبوطة بوزن أخف أحسن ألف مرة من عدات مكسّرة بوزن تقيل.',
  },
  {
    en: 'Muscle grows while you sleep, not while you lift — aim for 7–9 hours a night.',
    ar: 'العضل بيكبر وانت نايم مش وانت بتتمرن — حاول تنام من ٧ لـ٩ ساعات.',
  },
  {
    en: 'Even mild dehydration cuts your strength — keep sipping water between sets.',
    ar: 'قلة المية حتى لو بسيطة بتنزّل قوتك — خد شوية مية بين المجموعات.',
  },
  {
    en: "Warm-up sets aren't wasted time — they prime your nervous system to lift heavier, safely.",
    ar: 'مجموعات التسخين مش مضيعة وقت — بتجهّز جسمك يشيل أتقل من غير إصابة.',
  },
  {
    en: 'Brace and breathe: inhale on the way down, exhale as you push — it keeps your core tight.',
    ar: 'خد نفسك وانت نازل واطلّعه وانت بتدفع — كده جسمك بيفضل متماسك.',
  },
  {
    en: "Soreness isn't proof of growth — progress in your log is. No pain needed, just progress.",
    ar: 'التكسير مش دليل إن العضل بيكبر — التقدم في أوزانك هو الدليل الحقيقي.',
  },
  {
    en: 'The best program is the one you keep showing up for — consistency beats perfection.',
    ar: 'أحسن برنامج هو اللي بتلتزم بيه — الاستمرارية أهم من الكمال.',
  },
  {
    en: 'On isolation moves, 60–90 seconds of rest is plenty — keep the pump going.',
    ar: 'في تمارين العزل، من ٦٠ لـ٩٠ ثانية راحة كفاية — خلّي الضخ شغال.',
  },
  {
    en: "Think about the muscle you're working — the mind-muscle connection is real and measurable.",
    ar: 'ركّز في العضلة اللي بتشتغل — التركيز ده بيفرق فعلاً مش كلام.',
  },
  {
    en: 'Feeling beat up? An easy week now means bigger lifts later — recovery is part of training.',
    ar: 'حاسس إنك مهلك؟ أسبوع خفيف دلوقتي يعني أوزان أكبر بعدين — الراحة جزء من التمرين.',
  },
  {
    en: 'Lower the weight slowly — the negative half of the rep builds just as much muscle.',
    ar: 'نزّل الوزن بالراحة — النص النازل من العدة بيبني عضل زي الطالع بالظبط.',
  },
];

/** Muscle-specific tips, keyed loosely by focus keywords found in the group name. */
const SPECIFIC: { keywords: string[]; tips: RestTip[] }[] = [
  {
    keywords: ['leg', 'squat', 'quad', 'glute', 'hamstring', 'calf', 'رجل', 'سمانة', 'أرجل'],
    tips: [
      {
        en: 'Leg work spikes your heart rate — take the full rest; your next set will thank you.',
        ar: 'تمارين الرجل بترفع نبضك جامد — خد راحتك كاملة وهتحس بالفرق في المجموعة الجاية.',
      },
      {
        en: 'Drive through your heels in squats — it keeps the work on your quads and glutes, off your knees.',
        ar: 'ادفع من كعبك في السكوات — الشغل يروح للرجل مش لركبتك.',
      },
    ],
  },
  {
    keywords: ['back', 'pull', 'lat', 'row', 'ضهر', 'ظهر', 'سحب'],
    tips: [
      {
        en: 'In rows and pull-downs, pull with your elbows, not your hands — your back will light up.',
        ar: 'في تمارين السحب، اسحب بكوعك مش بإيدك — هتحس بضهرك شغال على طول.',
      },
      {
        en: 'A strong back protects your spine in every other lift — this work pays off everywhere.',
        ar: 'الضهر القوي بيحمي عمودك الفقري في كل التمارين التانية — الشغل ده بيفرق في كل حاجة.',
      },
    ],
  },
  {
    keywords: ['chest', 'push', 'pec', 'press', 'صدر', 'دفع'],
    tips: [
      {
        en: 'Squeeze your shoulder blades back on presses — it protects your shoulders and hits the chest harder.',
        ar: 'قرّب لوحي كتفك في تمارين الدفع — بيحمي كتفك وبيشغّل الصدر أكتر.',
      },
      {
        en: 'Full range of motion grows the chest more than half reps with a heavier weight.',
        ar: 'المدى الكامل للحركة بيكبّر الصدر أكتر من نص عدة بوزن أتقل.',
      },
    ],
  },
  {
    keywords: ['core', 'abs', 'plank', 'بطن', 'معدة'],
    tips: [
      {
        en: "Your abs already work in every big lift — direct core training 2–3 times a week is plenty.",
        ar: 'بطنك شغالة في كل تمرين كبير أصلاً — تمرين مباشر مرتين لتلاتة في الأسبوع كفاية.',
      },
      {
        en: 'Visible abs come from the kitchen — planks build the strength, food reveals it.',
        ar: 'عضلات البطن بتبان من الأكل — البلانك بيبني القوة، والأكل هو اللي بيظهرها.',
      },
    ],
  },
];

/**
 * Deterministic tip for a given rest. Muscle-specific tips (when the focus
 * matches) lead the rotation, then the general pool follows — so tips change
 * every rest and never depend on randomness.
 */
export function getRestTip(muscleFocus: string | undefined, index: number): RestTip {
  const focus = (muscleFocus ?? '').toLowerCase();
  const specific = focus
    ? SPECIFIC.filter((s) => s.keywords.some((k) => focus.includes(k))).flatMap((s) => s.tips)
    : [];
  const pool = [...specific, ...GENERAL];
  const safe = ((index % pool.length) + pool.length) % pool.length;
  return pool[safe];
}
