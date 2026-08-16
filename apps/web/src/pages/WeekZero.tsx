import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, ClipboardList, Lock, Check } from 'lucide-react';
import TopBar from '../components/TopBar';
import HumanMove, { PatternName } from '../components/HumanMove';
import { TrophyAnim } from '../components/MicroAnims';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const STORE_KEY = 'pulse_weekzero';

type DayText = { title: string; sub: string; items: [string, string, string] };
type Day = { Anim?: (p: { className?: string }) => JSX.Element; pattern?: PatternName; en: DayText; ar: DayText };

/**
 * The 7-day on-ramp for absolute beginners. Editorial content lives here, not in
 * the locale files — it is a fixed curriculum, both languages side by side.
 */
const DAYS: Day[] = [
  {
    pattern: 'breathe',
    en: {
      title: 'Gentle full-body mobility',
      sub: 'Wake the joints up — nothing should hurt today.',
      items: [
        '10 slow arm circles each direction',
        '10 bodyweight good-mornings (hands on hips)',
        '30 seconds marching in place',
      ],
    },
    ar: {
      title: 'حركة خفيفة لكل الجسم',
      sub: 'صحّي مفاصلك — النهارده مفيش حاجة المفروض توجع.',
      items: [
        '١٠ لفات دراع بالراحة في كل اتجاه',
        '١٠ انحناءات صباح الخير (إيديك على وسطك)',
        '٣٠ ثانية مشي في مكانك',
      ],
    },
  },
  {
    pattern: 'squat',
    en: {
      title: 'Learn the squat pattern',
      sub: 'Bodyweight only — sit back, chest up, heels down.',
      items: [
        '10 sit-to-stands from a chair, slow on the way down',
        '10 bodyweight squats holding a door frame',
        '5 squats with a 3-second pause at the bottom',
      ],
    },
    ar: {
      title: 'اتعلم حركة السكوات',
      sub: 'بوزن جسمك بس — انزل لورا، صدرك مرفوع، كعبك في الأرض.',
      items: [
        '١٠ قومات من كرسي، وانزل بالراحة',
        '١٠ سكوات وانت ماسك حلق الباب',
        '٥ سكوات مع وقفة ٣ ثواني تحت',
      ],
    },
  },
  {
    pattern: 'carry',
    en: {
      title: 'Walk + water day',
      sub: 'The most underrated workout there is.',
      items: [
        '20-minute walk at a pace where you can still talk',
        'Drink 6-8 glasses of water through the day',
        '1 minute of slow breathing when you get back',
      ],
    },
    ar: {
      title: 'يوم المشي والمية',
      sub: 'أكتر تمرين الناس بتستخف بيه.',
      items: [
        'مشي ٢٠ دقيقة بسرعة تعرف تتكلم معاها',
        'اشرب ٦-٨ كبايات مية على مدار اليوم',
        'دقيقة تنفس بالراحة لما ترجع',
      ],
    },
  },
  {
    pattern: 'plank',
    en: {
      title: 'Core basics',
      sub: 'A strong middle makes everything else easier.',
      items: [
        '3 × 15-second plank (knees down is fine)',
        '10 dead-bugs, slow and controlled',
        '10 glute bridges, squeeze at the top',
      ],
    },
    ar: {
      title: 'أساسيات البطن والجذع',
      sub: 'نص قوي بيخلي كل حاجة تانية أسهل.',
      items: [
        '٣ × ١٥ ثانية بلانك (على ركبك عادي جداً)',
        '١٠ ديد-باج بالراحة وبتحكم',
        '١٠ جسور مقعدة، واعصر فوق',
      ],
    },
  },
  {
    pattern: 'twist',
    en: {
      title: 'Stretch + breathe',
      sub: 'Recovery is training too.',
      items: [
        "30 seconds child's pose + 30 seconds cat-cow",
        'Hamstring and chest stretch, 20 seconds each side',
        '6 rounds of box breathing (4-4-4-4)',
      ],
    },
    ar: {
      title: 'فرد وتنفس',
      sub: 'الاستشفاء ده تمرين برضه.',
      items: [
        '٣٠ ثانية وضع الطفل + ٣٠ ثانية قطة-جمل',
        'فرد للرجل الخلفية والصدر، ٢٠ ثانية لكل ناحية',
        '٦ مرات تنفس المربع (٤-٤-٤-٤)',
      ],
    },
  },
  {
    pattern: 'jump',
    en: {
      title: 'Light full-body circuit',
      sub: 'Put the week together — 2 easy rounds.',
      items: [
        '8 squats + 8 wall push-ups',
        '15-second plank + 8 glute bridges',
        'Rest 1 minute, then do it all once more',
      ],
    },
    ar: {
      title: 'دايرة خفيفة لكل الجسم',
      sub: 'لمّ الأسبوع كله — لفتين على البركة.',
      items: [
        '٨ سكوات + ٨ ضغط على الحيطة',
        '١٥ ثانية بلانك + ٨ جسور مقعدة',
        'ريّح دقيقة وكرر الكل مرة كمان',
      ],
    },
  },
  {
    Anim: TrophyAnim,
    en: {
      title: 'Review + set yourself up',
      sub: 'You showed up 7 days. Now make it automatic.',
      items: [
        'Look back: which day felt best? Do more of that',
        'Set your weekly training days',
        'Take the 1-minute intake so plans fit you',
      ],
    },
    ar: {
      title: 'راجع وظبّط نفسك',
      sub: 'ظهرت ٧ أيام. دلوقتي خليها عادة من غير تفكير.',
      items: [
        'ارجع بص: أنهي يوم حسيت فيه أحسن؟ زوّد منه',
        'حدد أيام تمرينك في الأسبوع',
        'اعمل أسئلة الدقيقة الواحدة عشان الخطط تتفصل عليك',
      ],
    },
  },
];

function loadChecked(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const itemId = (day: number, item: number) => `d${day + 1}-${item}`;

export default function WeekZero() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const qc = useQueryClient();
  const [checked, setChecked] = useState<string[]>(loadChecked);

  const dayComplete = (day: number, ids: string[] = checked) =>
    [0, 1, 2].every((i) => ids.includes(itemId(day, i)));
  const doneDays = DAYS.reduce((n, _, d) => n + (dayComplete(d) ? 1 : 0), 0);

  const toggle = (day: number, item: number) => {
    const id = itemId(day, item);
    const wasComplete = dayComplete(day);
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage full/blocked — state still works for this visit */
    }
    if (!wasComplete && dayComplete(day, next)) {
      toast(t('weekzero.dayDone', { n: day + 1 }), 'success');
      void (async () => {
        try {
          await api.post('/api/me/workout-done');
          qc.invalidateQueries({ queryKey: ['progress'] });
        } catch {
          /* throttled (8-min rule) or offline — the checklist itself is the record */
        }
      })();
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={t('weekzero.title')} />

      <div className="px-4">
        <p className="text-sm text-gray-500">{t('weekzero.intro')}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-500"
              style={{ width: `${(doneDays / DAYS.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold text-gray-500">{t('weekzero.progress', { n: doneDays })}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3 px-4">
        {DAYS.map((day, d) => {
          const text = isAr ? day.ar : day.en;
          const complete = dayComplete(d);
          const unlocked = d === 0 || dayComplete(d - 1);
          return (
            <motion.section
              key={d}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={spring}
              className={`rounded-2xl bg-white p-4 shadow-sm ${unlocked ? '' : 'opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                    complete ? 'bg-brand-green/15 text-brand-green' : 'bg-teal-50 text-brand-teal'
                  }`}
                  aria-hidden
                >
                  {day.pattern ? (
                    <HumanMove pattern={day.pattern} className={`h-12 w-12 ${complete ? 'opacity-40' : ''}`} />
                  ) : day.Anim ? (
                    <day.Anim className={`h-11 w-11 ${complete ? 'opacity-40' : ''}`} />
                  ) : null}
                  {complete && (
                    <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white">
                      <Check size={13} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {t('weekzero.day', { n: d + 1 })}
                  </p>
                  <p className="truncate text-sm font-extrabold">{text.title}</p>
                </div>
                {!unlocked && <Lock size={16} className="shrink-0 text-gray-400" />}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">{text.sub}</p>

              {unlocked ? (
                <ul className="mt-3 space-y-2">
                  {text.items.map((item, i) => {
                    const isChecked = checked.includes(itemId(d, i));
                    return (
                      <li key={i}>
                        <button
                          onClick={() => toggle(d, i)}
                          className="flex w-full items-start gap-2.5 rounded-xl bg-gray-50 p-2.5 text-start transition active:scale-[0.98]"
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                              isChecked ? 'border-brand-green bg-brand-green text-white' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={13} strokeWidth={3.5} />}
                          </span>
                          <span className={`text-sm leading-snug ${isChecked ? 'text-gray-400 line-through' : ''}`}>
                            {item}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs font-semibold text-gray-400">{t('weekzero.locked')}</p>
              )}

              {/* Day 7 is about what happens after Week Zero — hand over to the
                  schedule and the intake. */}
              {unlocked && d === DAYS.length - 1 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to="/schedule"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-100 px-3 py-2.5 text-xs font-bold text-orange-600"
                  >
                    <CalendarDays size={14} /> {t('weekzero.setSchedule')}
                  </Link>
                  <Link
                    to="/my-plan"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2.5 text-xs font-bold text-emerald-700"
                  >
                    <ClipboardList size={14} /> {t('weekzero.takeIntake')}
                  </Link>
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
