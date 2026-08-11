import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronRight, Flame, Dumbbell, Activity, Salad, type LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import LanguageToggle from '../components/LanguageToggle';
import { track } from '../lib/track';
import { utmMeta } from '../lib/utm';

// chips: three concrete features per slide, [en, ar] — shown as small pills in
// the card so the pitch is specifics, not slogans.
const slides: { titleKey: string; textKey: string; g: string; Icon: LucideIcon; chips: [string, string][] }[] = [
  {
    titleKey: 'onboarding.slide1Title', textKey: 'onboarding.slide1Body', g: 'from-orange-600 via-orange-700 to-slate-900', Icon: Flame,
    chips: [['Log food by voice 🎤', 'سجّل أكلك بالصوت 🎤'], ['Egyptian foods + calories', 'أكل مصري بسعراته'], ['Water tracker', 'عدّاد مياه']],
  },
  {
    titleKey: 'onboarding.slide2Title', textKey: 'onboarding.slide2Body', g: 'from-blue-700 via-blue-800 to-slate-900', Icon: Dumbbell,
    chips: [['Muscle map', 'خريطة العضلات'], ['Home & gym plans', 'خطط بيت وجيم'], ['Video for every move', 'فيديو لكل تمرينة']],
  },
  {
    titleKey: 'onboarding.slide3Title', textKey: 'onboarding.slide3Body', g: 'from-teal-700 via-teal-800 to-slate-900', Icon: Activity,
    chips: [['Guided classes', 'حصص يوجا'], ['Breathing & calm', 'تنفس واسترخاء'], ['Rest-day stretches', 'إطالات يوم الراحة']],
  },
  {
    titleKey: 'onboarding.slide4Title', textKey: 'onboarding.slide4Body', g: 'from-emerald-700 via-emerald-800 to-slate-900', Icon: Salad,
    chips: [['90+ healthy recipes', '٩٠+ وصفة صحية'], ['Meal plans', 'خطط وجبات'], ['Grocery lists', 'قايمة مشتريات']],
  },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  // +1 advancing / -1 going back, so the enter/exit animation matches the gesture.
  const [dir, setDir] = useState(1);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  // Funnel step: ad click → landing → onboarding slides.
  useEffect(() => { track('funnel-onboarding', utmMeta()); }, []);

  // Admin-managed slide media: Banners with section "onboarding" (image per slide, by order).
  const { data: media } = useQuery({
    queryKey: ['onboarding-media'],
    queryFn: () => api.get('/api/banners?section=onboarding'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const finish = () => {
    localStorage.setItem('fitit_onboarded', '1');
    navigate('/login');
  };
  const last = i === slides.length - 1;
  const next = () => {
    setDir(1);
    last ? finish() : setI(i + 1);
  };
  const prev = () => {
    setDir(-1);
    setI(Math.max(0, i - 1));
  };

  // Swipe anywhere on the slide. "Forward" is a start-ward swipe: left in LTR, right in RTL.
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const fwd = (rtl ? -1 : 1) * info.offset.x;
    const fwdV = (rtl ? -1 : 1) * info.velocity.x;
    if (fwd < -60 || fwdV < -500) next();
    else if (fwd > 60 || fwdV > 500) prev();
  };

  const slide = slides[i];
  const bg = media?.[i]?.image ? `/media/image/${String(media[i].image).replace(/^images\//, '')}` : null;
  // Screen-space direction the new slide enters from.
  const enterX = (rtl ? -1 : 1) * dir * 48;

  return (
    <div className={`relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b ${slide.g} text-white`}>
      {/* Uploaded slide background (admin → Banners → section "onboarding"), dimmed for readability */}
      {bg && (
        <>
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        </>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 pt-12" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-extrabold italic">PULSE</div>
            {/* The strongest hook we have — say it before anything else. */}
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold tracking-wide backdrop-blur">
              {rtl ? 'مجاني ١٠٠٪' : '100% FREE'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="compact" />
            <button onClick={finish} className="flex items-center gap-1 text-sm font-medium">
              {t('common.skip')} <ChevronRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={i}
            className="flex flex-1 touch-pan-y flex-col"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: enterX }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -enterX }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex flex-1 items-center justify-center">
              <button
                onClick={next}
                className="animate-float flex h-32 w-32 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/10 backdrop-blur transition active:scale-95"
                aria-label={t('common.next')}
              >
                <slide.Icon size={56} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mx-5 mb-4 rounded-3xl bg-white p-6 text-center text-ink shadow-xl">
              <h2 className="text-xl font-bold uppercase">{t(slide.titleKey)}</h2>
              <p className="mt-2 text-gray-600">{t(slide.textKey)}</p>
              {/* Specifics beat slogans: three concrete things this tab does. */}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {slide.chips.map(([en, ar]) => (
                  <span key={en} className="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                    ✓ {rtl ? ar : en}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-1 flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDir(idx > i ? 1 : -1);
                setI(idx);
              }}
              className={`h-2.5 rounded-full transition-all ${idx === i ? 'w-6 bg-white' : 'w-2.5 bg-white/40'}`}
              aria-label={t('onboarding.goToSlide', { n: idx + 1 })}
            />
          ))}
        </div>

        <div className="px-5 pb-8 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          {last ? (
            /* The conversion moment gets BOTH honest paths: join free, or look
               inside first — a browse today converts better than a bounce. */
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  localStorage.setItem('fitit_onboarded', '1');
                  track('funnel-register-intent', utmMeta());
                  navigate('/register');
                }}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-white text-base font-extrabold text-ink shadow-lg transition active:scale-[0.98]"
              >
                {rtl ? 'اعمل حساب مجاني' : 'Create free account'}
                <ChevronRight size={18} className="rtl:rotate-180" />
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('fitit_onboarded', '1');
                  track('funnel-guest-browse', utmMeta());
                  navigate('/programs');
                }}
                className="flex min-h-11 w-full items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white backdrop-blur transition active:scale-[0.98]"
              >
                {rtl ? 'اتفرج الأول من غير حساب' : 'Look around first — no account'}
              </button>
            </div>
          ) : (
            <button
              onClick={next}
              className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-white text-base font-extrabold text-ink shadow-lg transition active:scale-[0.98]"
            >
              {t('common.next')}
              <ChevronRight size={18} className="rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
