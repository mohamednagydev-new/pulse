import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Sheet from './Sheet';
import { BreatheAnim } from './TrainingAnim';
import { StretchAnim, WalkAnim } from './MicroAnims';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type RoutineText = { title: string; steps: [string, string, string] };
type Routine = { emoji: string; en: RoutineText; ar: RoutineText };

/**
 * Ten tiny non-training routines. Content is deliberately hardcoded here (not in
 * the locale files) — it is a fixed editorial list, not UI chrome.
 */
const ROUTINES: Routine[] = [
  {
    emoji: '🙆',
    en: {
      title: 'Desk-neck release',
      steps: [
        'Slow chin tucks — pull your chin straight back, 5 times.',
        'Ear to shoulder, hold 20 seconds each side.',
        'Roll your shoulders back 10 times, big and slow.',
      ],
    },
    ar: {
      title: 'فك رقبة المكتب',
      steps: [
        'شد دقنك لورا بالراحة ٥ مرات — زي ما تكون بتعمل دقن دبل.',
        'ودّن على كتف، اثبت ٢٠ ثانية لكل ناحية.',
        'لف كتافك لورا ١٠ مرات، حركة كبيرة وبطيئة.',
      ],
    },
  },
  {
    emoji: '🛏️',
    en: {
      title: 'Pre-sleep hip openers',
      steps: [
        'Figure-4 stretch on your back, 30 seconds per side.',
        'Butterfly sit, knees dropping open, 30 seconds.',
        'Hug knees to chest and rock gently, 30 seconds.',
      ],
    },
    ar: {
      title: 'فتح الحوض قبل النوم',
      steps: [
        'نام على ضهرك واعمل وضع الرقم ٤، ٣٠ ثانية لكل رجل.',
        'اقعد فراشة وسيب ركبك تنزل، ٣٠ ثانية.',
        'حضن ركبك على صدرك واتمرجح بالراحة ٣٠ ثانية.',
      ],
    },
  },
  {
    emoji: '🧍',
    en: {
      title: 'Posture wall reset',
      steps: [
        'Stand with back, head and heels on a wall, 30 seconds.',
        'Wall slides — arms up and down the wall, 8 reps.',
        'Open your chest: hands behind back, squeeze 20 seconds.',
      ],
    },
    ar: {
      title: 'ظبط الوقفة على الحيطة',
      steps: [
        'اقف لازق في الحيطة — ضهرك وراسك وكعبك، ٣٠ ثانية.',
        'زحلق دراعاتك على الحيطة طلوع ونزول ٨ مرات.',
        'افتح صدرك: شبّك إيديك ورا ضهرك وشد ٢٠ ثانية.',
      ],
    },
  },
  {
    emoji: '👀',
    en: {
      title: 'Eye & shoulder break',
      steps: [
        'Look at something far away for 20 seconds.',
        'Close your eyes and cover them with warm palms, 20 seconds.',
        'Shrug shoulders up, hold 3 seconds, drop — 10 times.',
      ],
    },
    ar: {
      title: 'راحة للعين والكتف',
      steps: [
        'بص لحاجة بعيدة ٢٠ ثانية.',
        'غمّض وغطي عينيك بكفوف إيدك، ٢٠ ثانية.',
        'ارفع كتافك لفوق، اثبت ٣ ثواني، وسيبهم — ١٠ مرات.',
      ],
    },
  },
  {
    emoji: '🌅',
    en: {
      title: 'Morning wake-up flow',
      steps: [
        'Reach overhead and lean side to side, 5 per side.',
        'Cat-cow on all fours, 8 slow rounds.',
        'March in place, 20 high steps.',
      ],
    },
    ar: {
      title: 'صحصحة الصبح',
      steps: [
        'اتمطع لفوق وميّل يمين وشمال، ٥ مرات لكل ناحية.',
        'قطة-جمل وانت على أربعة، ٨ مرات بالراحة.',
        'امشي في مكانك ٢٠ خطوة وارفع ركبك.',
      ],
    },
  },
  {
    emoji: '🚶',
    en: {
      title: 'Walk nudge',
      steps: [
        'Put your shoes on — that is honestly the hard part.',
        'Walk briskly for 2 minutes, or take the stairs twice.',
        'Finish with 3 deep breaths before you sit back down.',
      ],
    },
    ar: {
      title: 'قومة المشي',
      steps: [
        'البس الكوتشي — دي بصراحة أصعب خطوة.',
        'امشي بسرعة دقيقتين، أو اطلع السلم مرتين.',
        'اقفل بـ٣ أنفاس عميقة قبل ما تقعد تاني.',
      ],
    },
  },
  {
    emoji: '🫁',
    en: {
      title: 'Box breathing',
      steps: [
        'Breathe in through your nose for 4 counts, hold 4.',
        'Breathe out slowly for 4 counts, hold 4.',
        'Repeat the square 6 times, eyes closed if you can.',
      ],
    },
    ar: {
      title: 'تنفس المربع',
      steps: [
        'خد نفس من مناخيرك على ٤ عدات، واحبسه ٤.',
        'طلّع النفس بالراحة على ٤ عدات، واستنى ٤.',
        'كرر المربع ٦ مرات، وغمّض لو تقدر.',
      ],
    },
  },
  {
    emoji: '🧘',
    en: {
      title: 'Lower-back release',
      steps: [
        "Child's pose, arms long, 30 seconds of slow breathing.",
        'On your back, rock your knees side to side, 30 seconds.',
        'Gentle sphinx — lift chest on forearms, 20 seconds.',
      ],
    },
    ar: {
      title: 'فك أسفل الضهر',
      steps: [
        'وضع الطفل ومدّ دراعاتك، ٣٠ ثانية تنفس بالراحة.',
        'نام على ضهرك وهز ركبك يمين وشمال ٣٠ ثانية.',
        'سفينكس خفيف — ارفع صدرك على ساعديك ٢٠ ثانية.',
      ],
    },
  },
  {
    emoji: '📱',
    en: {
      title: 'Wrist care for phone hands',
      steps: [
        'Circle your wrists 10 times each direction.',
        'Prayer stretch — palms together, lower hands, 20 seconds.',
        'Spread your fingers wide then make a fist, 10 times.',
      ],
    },
    ar: {
      title: 'راحة لرسغ الموبايل',
      steps: [
        'لف رسغك ١٠ مرات في كل اتجاه.',
        'وضع الدعاء — كفوفك على بعض ونزّل إيديك، ٢٠ ثانية.',
        'افرد صوابعك على الآخر وبعدين اقفل قبضة، ١٠ مرات.',
      ],
    },
  },
  {
    emoji: '🦵',
    en: {
      title: 'Hamstring floss',
      steps: [
        'Sit, one leg out, hinge forward gently, 20 seconds per side.',
        'Standing toe reach — bend and straighten softly, 8 reps.',
        'Calf stretch on a wall, 20 seconds per leg.',
      ],
    },
    ar: {
      title: 'فرد الرجل الخلفية',
      steps: [
        'اقعد ومدّ رجل، وانزل بجسمك لقدام بالراحة ٢٠ ثانية لكل رجل.',
        'وانت واقف حاول تلمس صوابعك — انزل واطلع بنعومة ٨ مرات.',
        'فرد السمانة على الحيطة، ٢٠ ثانية لكل رجل.',
      ],
    },
  },
];

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/**
 * "Today's 2-minute reset" — one tiny non-training routine a day, picked
 * deterministically by day of year so everyone sees the same one and it rotates
 * without any server involvement.
 */
export default function DailyReset() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const routine = ROUTINES[dayOfYear() % ROUTINES.length];
  const text = i18n.language.startsWith('ar') ? routine.ar : routine.en;
  // Keyword check on the English title (stable in both languages): walking
  // routines get the walker, breathing/rest ones the breath pulse, the rest
  // — all stretches of one kind or another — the side-bend figure.
  const Anim = /walk/i.test(routine.en.title)
    ? WalkAnim
    : /breath|eye/i.test(routine.en.title)
      ? BreatheAnim
      : StretchAnim;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={spring}
        className="mx-4 mt-4 rounded-2xl bg-white shadow-sm"
      >
        <button onClick={() => setOpen(true)} className="card-hover flex w-full items-center gap-3 rounded-2xl p-4 text-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-2xl" aria-hidden>
            {routine.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('reset.title')}</span>
            <span className="block truncate text-sm font-bold">{text.title}</span>
          </span>
          <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-600">
            {t('reset.min')}
          </span>
          <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </button>
      </motion.section>

      <Sheet open={open} onClose={() => setOpen(false)} label={text.title}>
        <div className="p-5 pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-50 text-brand-teal" aria-hidden>
            <Anim className="h-16 w-16" />
          </div>
          <h2 className="mt-2 text-center text-lg font-extrabold">{text.title}</h2>
          <p className="mt-0.5 text-center text-xs font-semibold text-teal-600">{t('reset.min')}</p>
          <ol className="mt-4 space-y-3">
            {text.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {i + 1}
                </span>
                <span className="text-sm leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <button onClick={() => setOpen(false)} className="btn-pill btn-primary mt-5 w-full py-3 text-sm">
            {t('reset.done')}
          </button>
          <Link
            to="/wellness"
            onClick={() => setOpen(false)}
            className="mt-3 block text-center text-xs font-semibold text-brand-green"
          >
            {t('reset.wellness')} →
          </Link>
        </div>
      </Sheet>
    </>
  );
}
